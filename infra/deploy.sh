#!/usr/bin/env bash
#
# Mbokk API — deployment.
#
# ==============================================================================
# THIS SCRIPT IS THE SECURITY BOUNDARY.
#
# The app shares a VPS with other applications. The GitHub deploy key is pinned
# in authorized_keys to this script and nothing else:
#
#   command="/opt/mbokk/deploy.sh",no-pty,no-agent-forwarding,
#   no-port-forwarding,no-X11-forwarding ssh-ed25519 AAAA... github-actions
#
# So the workflow cannot open a shell, cannot scp a file and cannot forward a
# port. It can send exactly one string, which arrives in $SSH_ORIGINAL_COMMAND,
# and the only thing accepted is:
#
#   deploy sha-<40 hex characters>
#
# The regex below is what keeps that promise. The previous pipeline handed CI an
# unrestricted root session over SSH; on a shared machine that meant this app's
# pipeline could break every neighbouring app. Loosen that regex and you hand
# that back.
#
# Because this script IS the boundary, it is NOT installed by the pipeline. A
# human installs it with the admin key — it must not be modifiable by the thing
# it constrains.
# ==============================================================================
set -euo pipefail

APP_DIR="/opt/mbokk"
COMPOSE_FILE="${APP_DIR}/docker-compose.prod.yml"
AGE_KEY="${APP_DIR}/secrets/age.key"
REGISTRY_IMAGE="ghcr.io/himeuh/mbokk-api"
HEALTH_ATTEMPTS=24
HEALTH_INTERVAL=5

# Each app on this host keeps its OWN Docker credentials. Docker stores one
# credential per registry, and every app here pulls from ghcr.io — a single
# shared login would mean one app's token could pull every other app's private
# image, and re-logging in for one app would silently break the others.
export DOCKER_CONFIG="${APP_DIR}/.docker"

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

ENVIRONMENT="$(cat "${APP_DIR}/ENVIRONMENT" 2>/dev/null || echo prod)"
case "$ENVIRONMENT" in
  prod | staging) ;;
  *) die "invalid ENVIRONMENT: '${ENVIRONMENT}' (expected prod or staging)" ;;
esac
ENV_IN_IMAGE="deploy/${ENVIRONMENT}.env"

# ------------------------------------------------------------------------------
# 1. Validate the request. $SSH_ORIGINAL_COMMAND is attacker-controlled the
#    moment the deploy key leaks: whitelist, never blacklist.
# ------------------------------------------------------------------------------
REQUEST="${SSH_ORIGINAL_COMMAND:-${*:-}}"
if [[ ! "$REQUEST" =~ ^deploy\ sha-[0-9a-f]{40}$ ]]; then
  die "refused. This key may only run: deploy sha-<40 hex>
     got: '${REQUEST}'"
fi

SHA="${REQUEST#deploy }"
IMAGE="${REGISTRY_IMAGE}:${SHA}"

log "Deploying ${IMAGE} (environment: ${ENVIRONMENT})"
cd "$APP_DIR"

# ------------------------------------------------------------------------------
# 2. Pull, and take the deployment config out of the image. Nothing is copied
#    over SSH — which is exactly what lets the key be this locked down.
# ------------------------------------------------------------------------------
log "Pulling"
docker pull -q "$IMAGE" >/dev/null || die "cannot pull ${IMAGE} — is it built, and is the GHCR login still valid?"

log "Extracting the deployment config from the image"
CID="$(docker create "$IMAGE")"
trap 'docker rm -f "$CID" >/dev/null 2>&1 || true' EXIT

STAGE="$(mktemp -d)"
docker cp "${CID}:/var/www/html/docker-compose.prod.yml" "${STAGE}/" 2>/dev/null || die "docker-compose.prod.yml is not in the image"
docker cp "${CID}:/var/www/html/docker"                  "${STAGE}/" 2>/dev/null || die "docker/ is not in the image"
docker cp "${CID}:/var/www/html/${ENV_IN_IMAGE}"         "${STAGE}/env.enc" 2>/dev/null || die "${ENV_IN_IMAGE} is not in the image"

# ------------------------------------------------------------------------------
# 3. Decrypt — atomically. A half-written .env would take the app down BY the
#    deploy, so decrypt to a temp file, prove it is sane, then move it in.
# ------------------------------------------------------------------------------
[[ -f "$AGE_KEY" ]] || die "the age key is missing (${AGE_KEY}). This server cannot decrypt its own config."

log "Decrypting the configuration"
TMP_ENV="$(mktemp)"
chmod 600 "$TMP_ENV"
SOPS_AGE_KEY_FILE="$AGE_KEY" sops --decrypt \
  --input-type dotenv --output-type dotenv \
  "${STAGE}/env.enc" > "$TMP_ENV" \
  || die "decryption failed — the previous .env is untouched and the stack is still running"

grep -q '^APP_KEY=base64:.\+'  "$TMP_ENV" || die "the decrypted config has no APP_KEY — aborting, nothing changed"
grep -q '^DB_PASSWORD=.\+'     "$TMP_ENV" || die "the decrypted config has no DB_PASSWORD — aborting, nothing changed"
grep -q '^DOMAIN=.\+'          "$TMP_ENV" || die "the decrypted config has no DOMAIN — aborting, nothing changed"

PREVIOUS_IMAGE=""
if [[ -f "${APP_DIR}/.env" ]]; then
  PREVIOUS_IMAGE="$(grep '^DOCKER_IMAGE=' "${APP_DIR}/.env" | cut -d= -f2- || true)"
fi
echo "DOCKER_IMAGE=${IMAGE}" >> "$TMP_ENV"

install -m 600 "${STAGE}/docker-compose.prod.yml" "$COMPOSE_FILE"
rm -rf "${APP_DIR}/docker" && cp -r "${STAGE}/docker" "${APP_DIR}/docker"
mv "$TMP_ENV" "${APP_DIR}/.env"
chmod 600 "${APP_DIR}/.env"
rm -rf "$STAGE"

log "Configuration in place (previous image: ${PREVIOUS_IMAGE:-none})"

COMPOSE="docker compose -f ${COMPOSE_FILE}"

# ------------------------------------------------------------------------------
# 4. Migrate on the NEW image, before it serves traffic. This is the one step
#    that is NOT reversible: the rollback below restores code, never schema.
#
#    NOT --no-deps: compose then starts pgsql (and waits for it to be healthy)
#    before running this. With the flag, a FIRST deploy on a fresh machine fails
#    with 'could not translate host name "pgsql"', because nothing is running
#    yet to resolve.
# ------------------------------------------------------------------------------
log "Running migrations"
$COMPOSE run --rm app php artisan migrate --force \
  || die "migrations failed — nothing was restarted, the old code is still serving"

# ------------------------------------------------------------------------------
# 5. Roll out. Postgres, Redis and the edge proxy are left alone: they run no
#    application code, and restarting the shared proxy would disturb other apps.
# ------------------------------------------------------------------------------
log "Restarting app and web"
$COMPOSE up -d --no-deps app web

# ------------------------------------------------------------------------------
# 6. Verify, and undo if broken. Probe `web` directly: going through the edge
#    proxy would also be testing DNS and TLS, which are not what this deploy
#    changed.
# ------------------------------------------------------------------------------
log "Waiting for health"
HEALTHY=0
for i in $(seq 1 "$HEALTH_ATTEMPTS"); do
  if $COMPOSE exec -T web wget -q -O- http://127.0.0.1/health 2>/dev/null | grep -q ok; then
    HEALTHY=1
    log "Healthy after $((i * HEALTH_INTERVAL))s"
    break
  fi
  sleep "$HEALTH_INTERVAL"
done

if [[ "$HEALTHY" -eq 0 ]]; then
  printf '\033[1;31m==> HEALTH CHECK FAILED\033[0m\n' >&2
  $COMPOSE logs --tail=50 app web >&2 || true
  if [[ -n "$PREVIOUS_IMAGE" ]]; then
    log "Rolling back to ${PREVIOUS_IMAGE}"
    sed -i "s|^DOCKER_IMAGE=.*|DOCKER_IMAGE=${PREVIOUS_IMAGE}|" "${APP_DIR}/.env"
    $COMPOSE up -d --no-deps app web
    printf '\033[1;31m==> Rolled back. NOTE: migrations were NOT reverted.\033[0m\n' >&2
  else
    printf '\033[1;31m==> No previous image to roll back to.\033[0m\n' >&2
  fi
  exit 1
fi

docker image prune -f --filter "label=org.opencontainers.image.source=https://github.com/HimeuH/mbokk" >/dev/null 2>&1 || true

log "Deployed ${IMAGE}"
