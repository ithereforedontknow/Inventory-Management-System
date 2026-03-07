#!/bin/bash
# StockPilot — Clean setup script
# Run this instead of `docker compose up` when upgrading from v1 to v2
# or when you need a guaranteed clean start.

set -e

echo "🛑 Stopping and removing old containers + images..."
docker compose down --rmi local --volumes --remove-orphans 2>/dev/null || true

echo "📋 Checking .env file..."
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and set strong passwords before continuing."
    echo "   At minimum change: DB_PASS, MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD"
    echo "   Then run this script again."
    exit 1
fi

echo "🔨 Building images (no cache)..."
docker compose build --no-cache

echo "🚀 Starting services..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

echo ""
echo "✅ StockPilot is running!"
echo "   → App:    http://localhost:3000"
echo "   → Login:  admin / Admin1234"
echo ""
echo "⚠️  Change the default password immediately after first login."
