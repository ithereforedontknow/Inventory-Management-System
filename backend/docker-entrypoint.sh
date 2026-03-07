#!/bin/bash
set -e

echo "==> Running PHP seed script..."
php /var/www/html/sql/seed.php

echo "==> Starting Apache..."
exec docker-php-entrypoint apache2-foreground
