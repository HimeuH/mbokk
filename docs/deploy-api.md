# Deploying `api/` to the droplet

Shares the droplet with `instantcaisse` (`jokko-float-back-office`) behind
the reverse proxy at `/opt/proxy/` — this doc is the one-time setup
checklist. After this, every push to `main` touching `api/` deploys
automatically via `.github/workflows/deploy-api.yml`.

Everything here is manual (I have no SSH access to run it for you) — copy
each command as-is.

## 1. DNS — done

`api.mbokk.samafacture.com` already points at the droplet.

## 2. GitHub repo — done

`origin` is `https://github.com/HimeuH/mbokk.git`, pushed.

## 3. GitHub Actions secrets — deploy mechanics only

Repo → Settings → Secrets and variables → Actions. App config (`APP_KEY`,
`DOMAIN`, `FRONTEND_URL`, `DB_*`) does **not** go here — it lives only in
`.env` on the server (step 4), same as instantcaisse. GitHub only needs
what it takes to reach the server and push an image:

Reused from instantcaisse's repo (same values, just copy them over):

- `DO_API_TOKEN`
- `DO_REGISTRY`
- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_SSH_KEY`
- `SERVER_PORT`

New, Mbokk-specific:

- `APP_DIR` = `/opt/mbokk` (must NOT be instantcaisse's dir)

## 4. Create `.env` on the server (one time, by hand)

The deploy workflow refuses to run if this file doesn't exist yet — it
never creates or writes app secrets itself, only the `IMAGE_TAG=` line on
each deploy (see the workflow's top comment).

```bash
mkdir -p /opt/mbokk
cd /opt/mbokk
```

Generate the app key locally first (don't paste a key you didn't generate
yourself, and don't send it through chat):

```bash
cd /path/to/mbokk/api && php artisan key:generate --show
```

Then on the server:

```bash
cat > /opt/mbokk/.env <<'ENVEOF'
APP_KEY=base64:PASTE_THE_GENERATED_KEY_HERE
DOMAIN=api.mbokk.samafacture.com
FRONTEND_URL=https://mbokk.samafacture.com
DB_DATABASE=mbokk
DB_USERNAME=mbokk
DB_PASSWORD=CHOOSE_A_FRESH_PASSWORD
ENVEOF
```

Notes:
- `FRONTEND_URL` drives CORS (`api/config/cors.php`) — if `web/` isn't
  deployed yet, the placeholder above is fine; update this file later
  once it has a real URL (then re-run the deploy or `docker compose up -d
  --no-deps app` to pick it up — no CI change needed, it's server-side).
- `DB_*` — pick fresh values, isolated from instantcaisse's own Postgres
  (separate container entirely, see `docker-compose.prod.yml`).
- No `IMAGE_TAG=` line yet — the first deploy adds it.

## 5. Shared proxy — nginx vhost + volumes

SSH in as the user with docker access, then:

```bash
# Copy the vhost (content is in infra/proxy/mbokk.conf in this repo)
cat > /opt/proxy/nginx/conf.d/mbokk.conf   # paste infra/proxy/mbokk.conf's content, Ctrl-D to save
```

Edit `/opt/proxy/docker-compose.yml` — add two lines to the `nginx`
service's `volumes:` and two entries to the top-level `volumes:` (mirrors
the existing `siwalen_public`/`siwalen_storage` pattern exactly):

```yaml
  nginx:
    volumes:
      # ...existing lines...
      - "mbokk_public:/var/www/mbokk/public:ro"
      - "mbokk_storage_public:/var/www/mbokk/storage-public:ro"

volumes:
  # ...existing entries...
  mbokk_public:
    external: true
  mbokk_storage_public:
    external: true
```

These volumes don't exist yet — Docker creates external volumes lazily
only if referenced by a compose file that *doesn't* mark them external, so
create them explicitly now (Mbokk's own `docker-compose.prod.yml`, which
first-deploy will run, also declares and would create them — but nginx
needs them to exist *before* it can start, so create them up front):

```bash
docker volume create mbokk_public
docker volume create mbokk_storage_public
```

Then recreate the shared nginx to pick up the new mounts and vhost:

```bash
cd /opt/proxy
docker compose up -d --force-recreate nginx
```

## 6. TLS certificate

The existing `init-letsencrypt.sh` hardcodes one `DOMAIN` per run — copy
it rather than editing in place, so instantcaisse's/siwalen's own re-runs
stay unaffected:

```bash
cd /opt/proxy
cp init-letsencrypt.sh init-letsencrypt-mbokk.sh
sed -i 's/DOMAIN="api.sivoiced.samafacture.com"/DOMAIN="api.mbokk.samafacture.com"/' init-letsencrypt-mbokk.sh
EMAIL=you@example.com ./init-letsencrypt-mbokk.sh
```

## 7. First deploy

Push to `main` — `.github/workflows/deploy-api.yml` builds the image,
pushes to DOCR, SSHes in, runs migrations against the new image (aborts
before touching anything live if that fails, and before this step also
aborts outright if `.env` from step 4 is missing), swaps the container,
and rolls back automatically if the healthcheck doesn't pass within 3
minutes.

Watch it in GitHub → Actions. First run also seeds nothing automatically —
if you want the Mbacké demo data live, SSH in once after the first
successful deploy and run:

```bash
cd /opt/mbokk
docker compose -f docker-compose.prod.yml --env-file .env exec app php artisan db:seed --class=FamilyTreeSeeder --force
```

## 8. Smoke test

```bash
curl -i https://api.mbokk.samafacture.com/api/search?q=ab
```

Expect `200` with `{"success":true,"data":{"people":[...],"trees":[...]}}`.
