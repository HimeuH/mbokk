# Deploying `api/` to the droplet

Shares the droplet with `instantcaisse` (`jokko-float-back-office`) behind
the reverse proxy at `/opt/proxy/` — this doc is the one-time setup
checklist. After this, every push to `main` touching `api/` deploys
automatically via `.github/workflows/deploy-api.yml`.

Everything here is manual (I have no SSH access to run it for you) — copy
each command as-is.

## 1. DNS

Point `api.mbokk.fawzaynigroup.com` (A record) at the droplet's IP —
same IP `instantcaisse.com` already resolves to. Wait for propagation
before step 4 (Let's Encrypt needs it resolvable).

## 2. GitHub repo

```bash
cd /Users/fawzayni/Documents/dev/main/my-projects/my-owners/little_apps/mbokk
git remote add origin <MBOKK_GITHUB_URL>
git push -u origin main
```

## 3. GitHub Actions secrets

Repo → Settings → Secrets and variables → Actions. Reused from
instantcaisse's repo (same values, just copy them over):

- `DO_API_TOKEN`
- `DO_REGISTRY`
- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_SSH_KEY`
- `SERVER_PORT`

New, Mbokk-specific:

- `APP_DIR` = `/opt/mbokk` (must NOT be instantcaisse's dir)
- `DOMAIN` = `api.mbokk.fawzaynigroup.com`
- `APP_KEY` — generate locally, never share this in chat/logs:
  ```bash
  cd api && php artisan key:generate --show
  ```
  copy the `base64:...` output as the secret value.
- `FRONTEND_URL` — the `web/` origin once it's deployed (drives CORS,
  `api/config/cors.php`). If `web/` isn't live yet, use a placeholder
  like `https://mbokk.fawzaynigroup.com` and update the secret later —
  nothing breaks, it just means the frontend can't call the API cross-origin
  until this matches the real deployed frontend URL.
- `SANCTUM_STATEFUL_DOMAINS` — same host as `FRONTEND_URL`, no scheme
  (e.g. `mbokk.fawzaynigroup.com`)
- `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` — pick fresh values for
  Mbokk's own Postgres (isolated container, not shared with instantcaisse's)

## 4. Shared proxy — nginx vhost + volumes

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

## 5. TLS certificate

The existing `init-letsencrypt.sh` hardcodes one `DOMAIN` per run — copy
it rather than editing in place, so instantcaisse's/siwalen's own re-runs
stay unaffected:

```bash
cd /opt/proxy
cp init-letsencrypt.sh init-letsencrypt-mbokk.sh
sed -i 's/DOMAIN="api.sivoiced.samafacture.com"/DOMAIN="api.mbokk.fawzaynigroup.com"/' init-letsencrypt-mbokk.sh
EMAIL=you@example.com ./init-letsencrypt-mbokk.sh
```

## 6. First deploy

Push to `main` (or re-run step 2's push) — `.github/workflows/deploy-api.yml`
builds the image, pushes to DOCR, SSHes in, runs migrations against the new
image (aborts before touching anything live if that fails), swaps the
container, and rolls back automatically if the healthcheck doesn't pass
within 3 minutes.

Watch it in GitHub → Actions. First run also seeds nothing automatically —
if you want the Mbacké demo data live, SSH in once after the first
successful deploy and run:

```bash
cd /opt/mbokk
docker compose -f docker-compose.prod.yml --env-file .env exec app php artisan db:seed --class=FamilyTreeSeeder --force
```

## 7. Smoke test

```bash
curl -i https://api.mbokk.fawzaynigroup.com/api/search?q=ab
```

Expect `200` with `{"success":true,"data":{"people":[...],"trees":[...]}}`.
