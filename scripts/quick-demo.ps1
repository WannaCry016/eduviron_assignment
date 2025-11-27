# Quick Demo Setup Script for Windows PowerShell
# This script sets up everything needed for a live demo

Write-Host "🚀 Setting up Reporting Engine Demo..." -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env from env.example..." -ForegroundColor Yellow
    Copy-Item env.example .env
    Write-Host "✓ .env created. Please verify DATABASE_* values match your Postgres setup." -ForegroundColor Green
    Write-Host ""
}

# Check if node_modules exists
if (-not (Test-Path node_modules)) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Build
Write-Host "🔨 Building project..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build successful" -ForegroundColor Green
Write-Host ""

# Check database connection (optional check)
Write-Host "🔍 Checking database connection..." -ForegroundColor Yellow
try {
    $result = psql -U postgres -d reporting -c "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database connection OK" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Database connection failed. Please:" -ForegroundColor Yellow
        Write-Host "   1. Ensure Postgres is running" -ForegroundColor Yellow
        Write-Host "   2. Create database: psql -U postgres -c 'CREATE DATABASE reporting;'" -ForegroundColor Yellow
        Write-Host "   3. Update .env with correct DATABASE_* values" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Continuing anyway..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not verify database connection. Please ensure Postgres is running and .env is configured." -ForegroundColor Yellow
}
Write-Host ""

# Run migrations
Write-Host "📊 Running migrations..." -ForegroundColor Yellow
npm run migration:run
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Migrations failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Migrations complete" -ForegroundColor Green
Write-Host ""

# Seed data
Write-Host "🌱 Seeding database (this may take a minute)..." -ForegroundColor Yellow
npm run seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Seeding failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Seeding complete" -ForegroundColor Green
Write-Host ""

# Verify
Write-Host "✅ Verifying setup..." -ForegroundColor Yellow
npm run verify:demo
Write-Host ""

Write-Host "🎉 Setup complete! Next steps:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Start the API:" -ForegroundColor Cyan
Write-Host "   npm run start:dev" -ForegroundColor White
Write-Host ""
Write-Host "2. In another terminal, verify everything works:" -ForegroundColor Cyan
Write-Host "   npm run verify:demo" -ForegroundColor White
Write-Host ""
Write-Host "3. Import postman/reporting-engine.postman_collection.json into Postman" -ForegroundColor Cyan
Write-Host "4. Run the 'Login - Super Admin' request" -ForegroundColor Cyan
Write-Host "5. Copy the accessToken to the collection variable" -ForegroundColor Cyan
Write-Host "6. Run all other requests to see the full demo!" -ForegroundColor Cyan
Write-Host ""

