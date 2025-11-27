#!/bin/bash

# Quick Demo Setup Script
# This script sets up everything needed for a live demo

set -e

echo "🚀 Setting up Reporting Engine Demo..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from env.example..."
    cp env.example .env
    echo "✓ .env created. Please verify DATABASE_* values match your Postgres setup."
    echo ""
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Build
echo "🔨 Building project..."
npm run build
echo ""

# Check database connection
echo "🔍 Checking database connection..."
if psql -U postgres -d reporting -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✓ Database connection OK"
else
    echo "⚠️  Database connection failed. Please:"
    echo "   1. Ensure Postgres is running"
    echo "   2. Create database: psql -U postgres -c 'CREATE DATABASE reporting;'"
    echo "   3. Update .env with correct DATABASE_* values"
    exit 1
fi

# Run migrations
echo "📊 Running migrations..."
npm run migration:run
echo ""

# Seed data
echo "🌱 Seeding database (this may take a minute)..."
npm run seed
echo ""

# Verify
echo "✅ Verifying setup..."
npm run verify:demo
echo ""

echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. Start the API:"
echo "   npm run start:dev"
echo ""
echo "2. In another terminal, verify everything works:"
echo "   npm run verify:demo"
echo ""
echo "3. Import postman/reporting-engine.postman_collection.json into Postman"
echo "4. Run the 'Login - Super Admin' request"
echo "5. Copy the accessToken to the collection variable"
echo "6. Run all other requests to see the full demo!"
echo ""

