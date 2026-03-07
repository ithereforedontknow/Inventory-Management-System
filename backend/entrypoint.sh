#!/bin/bash
set -e

# Wait for MySQL to be ready
echo "Waiting for MySQL..."
until php -r "
new PDO(
  'mysql:host=' . getenv('DB_HOST') . ';port=' . getenv('DB_PORT') . ';dbname=' . getenv('DB_NAME'),
  getenv('DB_USER'),
  getenv('DB_PASS')
);
echo 'ok';
" 2>/dev/null | grep -q ok; do
  sleep 1
done
echo "MySQL ready."

# Run schema migrations
php -r "
\$pdo = new PDO(
  'mysql:host=' . getenv('DB_HOST') . ';port=' . getenv('DB_PORT'),
  getenv('DB_USER'),
  getenv('DB_PASS'),
  [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
\$sql = file_get_contents('/var/www/html/sql/init.sql');
foreach (array_filter(array_map('trim', explode(';', \$sql))) as \$stmt) {
  if (\$stmt) \$pdo->exec(\$stmt);
}
echo 'Schema OK' . PHP_EOL;
"

# Seed admin user with a PHP-generated bcrypt hash (guaranteed valid)
php -r "
\$pdo = new PDO(
  'mysql:host=' . getenv('DB_HOST') . ';port=' . getenv('DB_PORT') . ';dbname=' . getenv('DB_NAME'),
  getenv('DB_USER'),
  getenv('DB_PASS')
);
\$pass = getenv('ADMIN_PASSWORD') ?: 'Admin1234';
\$hash = password_hash(\$pass, PASSWORD_BCRYPT, ['cost' => 12]);
\$stmt = \$pdo->prepare(
  'INSERT INTO users (username, password_hash, role)
   VALUES (:u, :h, \"admin\")
   ON DUPLICATE KEY UPDATE password_hash = IF(is_active = 1 AND last_login IS NULL, :h2, password_hash)'
);
\$stmt->execute([':u' => 'admin', ':h' => \$hash, ':h2' => \$hash]);
echo 'Admin user OK' . PHP_EOL;
"

# Start Apache
exec apache2-foreground
