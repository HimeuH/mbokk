#!/bin/sh
set -e

cd /var/www/html

# ------------------------------------------------------------------
# Fix shared volume ownership (volume is created as root by Docker)
# then copy built public/ assets so the shared nginx can serve them.
# Uploaded photos (storage/app/public) are a *separate* persistent
# volume mounted directly at that path — not copied here, see
# docker-compose.prod.yml (mbokk_storage_public).
# ------------------------------------------------------------------
if [ -d /var/www/public ]; then
  chown -R www:www /var/www/public
  echo "[entrypoint] copying public/ to shared volume..."
  cp -r public/. /var/www/public/
else
  echo "[entrypoint] shared public volume not mounted; skipping public asset sync."
fi

chown -R www:www storage/app/public 2>/dev/null || true

# ------------------------------------------------------------------
# Ensure required Laravel directories exist
# ------------------------------------------------------------------
mkdir -p storage/logs \
         storage/framework/cache \
         storage/framework/sessions \
         storage/framework/views \
         storage/app/public \
         bootstrap/cache

# ------------------------------------------------------------------
# Wait for PostgreSQL to be ready (up to 30 attempts, 3s each)
# ------------------------------------------------------------------
echo "[entrypoint] waiting for database..."
attempts=0
until php -r "
  \$dsn = 'pgsql:host=' . getenv('DB_HOST') . ';port=' . (getenv('DB_PORT') ?: 5432) . ';dbname=' . getenv('DB_DATABASE');
  try { new PDO(\$dsn, getenv('DB_USERNAME'), getenv('DB_PASSWORD')); exit(0); }
  catch (Exception \$e) { fwrite(STDERR, \$e->getMessage() . PHP_EOL); exit(1); }
" 2>/tmp/db-error; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 30 ]; then
    echo "[entrypoint] ERROR: database not ready after 90 seconds. Aborting."
    cat /tmp/db-error
    exit 1
  fi
  echo "[entrypoint] database not ready, retrying in 3s... ($attempts/30)"
  sleep 3
done
echo "[entrypoint] database is ready."

# ------------------------------------------------------------------
# Cache framework config, routes, and views
# ------------------------------------------------------------------
su-exec www php artisan config:cache
su-exec www php artisan route:cache
su-exec www php artisan view:cache

# ------------------------------------------------------------------
# Run database migrations
# ------------------------------------------------------------------
echo "[entrypoint] running migrations..."
su-exec www php artisan migrate --force

echo "[entrypoint] boot complete. starting: $*"
exec "$@"
