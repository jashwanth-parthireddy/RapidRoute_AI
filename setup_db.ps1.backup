#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════
#  RapidRoute AI — Database Setup Script
#  Run this ONCE after PostgreSQL is installed.
#  Usage: .\setup_db.ps1
# ═══════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

# Add PostgreSQL bin to PATH
$pgPaths = @(
    "C:\Program Files\PostgreSQL\17\bin",
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin"
)
$pgBin = $pgPaths | Where-Object { Test-Path "$_\psql.exe" } | Select-Object -First 1

if (-not $pgBin) {
    Write-Error "PostgreSQL not found. Install from: https://www.postgresql.org/download/windows/"
    exit 1
}

$env:Path = "$pgBin;" + $env:Path
Write-Host "✅ PostgreSQL found at: $pgBin" -ForegroundColor Green

# ─── Config ────────────────────────────────────────────────
$pgSuperUser = "postgres"
$dbUser      = "rapidroute"
$dbPassword  = "rapidroute123"
$dbName      = "rapidroute_db"
$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n🗄️  Setting up RapidRoute AI database..." -ForegroundColor Cyan

# ─── Check if DB already exists ────────────────────────────
$exists = psql -U $pgSuperUser -tAc "SELECT 1 FROM pg_database WHERE datname='$dbName'" 2>$null
if ($exists -eq "1") {
    Write-Host "ℹ️  Database '$dbName' already exists." -ForegroundColor Yellow
    $confirm = Read-Host "   Overwrite it? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "Skipping database creation. Using existing database." -ForegroundColor Yellow
        exit 0
    }
    psql -U $pgSuperUser -c "DROP DATABASE IF EXISTS $dbName;" 2>$null
    Write-Host "   Dropped existing database." -ForegroundColor Gray
}

# ─── Create user if not exists ─────────────────────────────
$userExists = psql -U $pgSuperUser -tAc "SELECT 1 FROM pg_roles WHERE rolname='$dbUser'" 2>$null
if ($userExists -ne "1") {
    psql -U $pgSuperUser -c "CREATE USER $dbUser WITH PASSWORD '$dbPassword';"
    Write-Host "✅ Created user: $dbUser" -ForegroundColor Green
} else {
    Write-Host "ℹ️  User '$dbUser' already exists." -ForegroundColor Yellow
    psql -U $pgSuperUser -c "ALTER USER $dbUser WITH PASSWORD '$dbPassword';"
}

# ─── Create database ───────────────────────────────────────
psql -U $pgSuperUser -c "CREATE DATABASE $dbName OWNER $dbUser;"
psql -U $pgSuperUser -c "GRANT ALL PRIVILEGES ON DATABASE $dbName TO $dbUser;"
Write-Host "✅ Created database: $dbName" -ForegroundColor Green

# ─── Apply migration ───────────────────────────────────────
$migrationFile = Join-Path $scriptDir "database\migrations\001_init.sql"
Write-Host "`n📋 Applying migration: $migrationFile"
$env:PGPASSWORD = $dbPassword
psql -U $dbUser -d $dbName -f $migrationFile
if ($LASTEXITCODE -ne 0) {
    Write-Error "Migration failed! Check the SQL file."
    exit 1
}
Write-Host "✅ Migration applied" -ForegroundColor Green

# ─── Apply seed ────────────────────────────────────────────
$seedFile = Join-Path $scriptDir "database\seed\seed.sql"
Write-Host "`n🌱 Applying seed data: $seedFile"
psql -U $dbUser -d $dbName -f $seedFile
if ($LASTEXITCODE -ne 0) {
    Write-Error "Seed failed! Check the SQL file."
    exit 1
}
Write-Host "✅ Seed data applied" -ForegroundColor Green

# ─── Verify ────────────────────────────────────────────────
Write-Host "`n🔍 Verifying database..." -ForegroundColor Cyan
$tables = psql -U $dbUser -d $dbName -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"
$users  = psql -U $dbUser -d $dbName -tAc "SELECT COUNT(*) FROM users"
Write-Host "   Tables created : $tables" -ForegroundColor Gray
Write-Host "   Seed users     : $users" -ForegroundColor Gray

Write-Host @"

╔══════════════════════════════════════════════════════════╗
║              ✅ Database Setup Complete!                  ║
╠══════════════════════════════════════════════════════════╣
║  Database : $dbName                            ║
║  User     : $dbUser                                 ║
║                                                          ║
║  Demo Login Credentials (password: Password123!)         ║
║  ─────────────────────────────────────────────────────── ║
║  Control Room : control@rapidroute.ai                    ║
║  Driver       : driver1@rapidroute.ai                    ║
║  Officer      : officer1@rapidroute.ai                   ║
║  Hospital     : hospital1@rapidroute.ai                  ║
║  Admin        : admin@rapidroute.ai                      ║
╚══════════════════════════════════════════════════════════╝

Next: Run .\start.ps1 to launch all services.
"@ -ForegroundColor Green
