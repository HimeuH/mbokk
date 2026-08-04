# ============================================================
# Stage 1 — Install PHP production dependencies
# ============================================================
FROM composer:2 AS deps-builder

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader

# ============================================================
# Stage 2 — Production image (php-fpm-alpine)
# ============================================================
FROM php:8.5-fpm-alpine AS production

WORKDIR /var/www/html

# Runtime system dependencies — pdo_pgsql only, no gd/exif/redis:
# no image manipulation, no queue/cache backend beyond Postgres/file.
RUN apk add --no-cache \
    postgresql-dev \
    curl \
    fcgi \
    su-exec \
    && docker-php-ext-install -j"$(nproc)" \
        pdo \
        pdo_pgsql \
    && docker-php-ext-install opcache \
    && wget -O /usr/local/bin/php-fpm-healthcheck \
         https://raw.githubusercontent.com/renatomefi/php-fpm-healthcheck/master/php-fpm-healthcheck \
    && chmod +x /usr/local/bin/php-fpm-healthcheck

# Non-root user
RUN addgroup -g 1000 www && adduser -u 1000 -G www -s /bin/sh -D www

# Copy application source
COPY --chown=www:www . .

# Copy production vendor from deps-builder
COPY --from=deps-builder --chown=www:www /app/vendor vendor/

# PHP config and entrypoint
COPY docker/php/php.ini /usr/local/etc/php/conf.d/99-app.ini
COPY docker/php/zz-healthcheck.conf /usr/local/etc/php-fpm.d/zz-healthcheck.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

# Required Laravel directories + storage/app/public is normally
# overmounted by the persistent mbokk_storage_public volume in
# production (see docker-compose.prod.yml) — created here too so the
# image still boots standalone (e.g. local `docker run` without that volume).
RUN mkdir -p storage/logs storage/framework/cache storage/framework/sessions \
        storage/framework/views storage/app/public bootstrap/cache \
    && chown -R www:www storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

EXPOSE 9000

# Entrypoint runs as root to fix volume permissions, then drops to www via su-exec
ENTRYPOINT ["entrypoint"]
CMD ["php-fpm"]
