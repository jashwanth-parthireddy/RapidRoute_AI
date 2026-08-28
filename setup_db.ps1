# -------------------------------------------------------
#  RapidRoute AI -- Database Setup Script
#  Run this ONCE after PostgreSQL is installed.
#  Usage: .\setup_db.ps1
# -------------------------------------------------------

$ErrorActionPreference = "Stop"

# --- Detect PostgreSQL bin directory ---
$pgCandidates = @(
    "C:\Program Files\PostgreSQL\18\bin",
    "C:\Program Files\PostgreSQL\17\bin",
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin"
)

$pgBin = $null
foreach ($candidate in $pgCandidates) {
    if (Test-Path "$candidate\psql.exe") {
        $pgBin = $candidate
        break
    }
}

if (-not $pgBin) {
    Write-Host "ERROR: PostgreSQL not found in Program Files." -ForegroundColor Red
    Write-Host "Install PostgreSQL from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

$env:Path = "$pgBin;" + $env:Path
Write-Host "PostgreSQL found at: $pgBin" -ForegroundColor Green

# --- Configuration ---
$pgSuperUser = "postgres"
$dbUser      = "rapidroute"
$dbPassword  = "rapidroute123"
$dbName      = "rapidroute_db"
$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "Setting up RapidRoute AI database..." -ForegroundColor Cyan

# --- Check if database already exists ---
$env:PGPASSWORD = "postgres123"
$dbExists = & "$pgBin\psql.exe" -U $pgSuperUser -tAc "SELECT 1 FROM pg_database WHERE datname='$dbName'" 2>$null

if ($dbExists -eq "1") {
    Write-Host "Database '$dbName' already exists." -ForegroundColor Yellow
    Write-Host "Skipping database creation. Using existing database." -ForegroundColor Yellow
} else {
    # --- Create user if not exists ---
    $userExists = & "$pgBin\psql.exe" -U $pgSuperUser -tAc "SELECT 1 FROM pg_roles WHERE rolname='$dbUser'" 2>$null

    if ($userExists -eq "1") {
        Write-Host "User '$dbUser' already exists. Updating password." -ForegroundColor Yellow
        & "$pgBin\psql.exe" -U $pgSuperUser -c "ALTER USER $dbUser WITH PASSWORD '$dbPassword';"
    } else {
        Write-Host "Creating user: $dbUser" -ForegroundColor Cyan
        & "$pgBin\psql.exe" -U $pgSuperUser -c "CREATE USER $dbUser WITH PASSWORD '$dbPassword';"
        Write-Host "User created: $dbUser" -ForegroundColor Green
    }

    # --- Create database ---
    Write-Host "Creating database: $dbName" -ForegroundColor Cyan
    & "$pgBin\psql.exe" -U $pgSuperUser -c "CREATE DATABASE $dbName OWNER $dbUser;"
    & "$pgBin\psql.exe" -U $pgSuperUser -c "GRANT ALL PRIVILEGES ON DATABASE $dbName TO $dbUser;"
    Write-Host "Database created: $dbName" -ForegroundColor Green
}

# --- Apply migration ---
$migrationFile = Join-Path $scriptDir "database\migrations\001_init.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "ERROR: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Applying migration: $migrationFile" -ForegroundColor Cyan
$env:PGPASSWORD = $dbPassword
& "$pgBin\psql.exe" -U $dbUser -d $dbName -f $migrationFile

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Migration failed. Check the SQL file." -ForegroundColor Red
    exit 1
}
Write-Host "Migration applied successfully." -ForegroundColor Green

# --- Apply seed ---
$seedFile = Join-Path $scriptDir "database\seed\seed.sql"

if (-not (Test-Path $seedFile)) {
    Write-Host "ERROR: Seed file not found: $seedFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Applying seed data: $seedFile" -ForegroundColor Cyan
& "$pgBin\psql.exe" -U $dbUser -d $dbName -f $seedFile

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Seed failed. Check the SQL file." -ForegroundColor Red
    exit 1
}
Write-Host "Seed data applied successfully." -ForegroundColor Green

# --- Verify ---
Write-Host ""
Write-Host "Verifying database..." -ForegroundColor Cyan

$tableCount = & "$pgBin\psql.exe" -U $dbUser -d $dbName -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>$null
$userCount  = & "$pgBin\psql.exe" -U $dbUser -d $dbName -tAc "SELECT COUNT(*) FROM users" 2>$null

Write-Host "Tables created : $($tableCount.Trim())" -ForegroundColor Gray
Write-Host "Seed users     : $($userCount.Trim())" -ForegroundColor Gray

# --- Check key accounts exist ---
$controlExists  = & "$pgBin\psql.exe" -U $dbUser -d $dbName -tAc "SELECT COUNT(*) FROM users WHERE email='control@rapidroute.ai'" 2>$null
$driverExists   = & "$pgBin\psql.exe" -U $dbUser -d $dbName -tAc "SELECT COUNT(*) FROM users WHERE email='driver1@rapidroute.ai'" 2>$null
$officerExists  = & "$pgBin\psql.exe" -U $dbUser -d $dbName -tAc "SELECT COUNT(*) FROM users WHERE email='officer1@rapidroute.ai'" 2>$null
$hospitalExists = & "$pgBin\psql.exe" -U $dbUser -d $dbName -tAc "SELECT COUNT(*) FROM users WHERE email='hospital1@rapidroute.ai'" 2>$null

Write-Host ""
Write-Host "Account verification:" -ForegroundColor Cyan
Write-Host "  control@rapidroute.ai   : $(if ($controlExists.Trim() -eq '1') { 'OK' } else { 'MISSING' })" -ForegroundColor $(if ($controlExists.Trim() -eq '1') { 'Green' } else { 'Red' })
Write-Host "  driver1@rapidroute.ai   : $(if ($driverExists.Trim() -eq '1') { 'OK' } else { 'MISSING' })" -ForegroundColor $(if ($driverExists.Trim() -eq '1') { 'Green' } else { 'Red' })
Write-Host "  officer1@rapidroute.ai  : $(if ($officerExists.Trim() -eq '1') { 'OK' } else { 'MISSING' })" -ForegroundColor $(if ($officerExists.Trim() -eq '1') { 'Green' } else { 'Red' })
Write-Host "  hospital1@rapidroute.ai : $(if ($hospitalExists.Trim() -eq '1') { 'OK' } else { 'MISSING' })" -ForegroundColor $(if ($hospitalExists.Trim() -eq '1') { 'Green' } else { 'Red' })

Write-Host ""
Write-Host "------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  Database setup complete!" -ForegroundColor Green
Write-Host "  Database : $dbName" -ForegroundColor Gray
Write-Host "  User     : $dbUser" -ForegroundColor Gray
Write-Host ""
Write-Host "  Demo credentials (password: Password123!)" -ForegroundColor Gray
Write-Host "  Control Room : control@rapidroute.ai" -ForegroundColor Gray
Write-Host "  Driver       : driver1@rapidroute.ai" -ForegroundColor Gray
Write-Host "  Officer      : officer1@rapidroute.ai" -ForegroundColor Gray
Write-Host "  Hospital     : hospital1@rapidroute.ai" -ForegroundColor Gray
Write-Host "  Admin        : admin@rapidroute.ai" -ForegroundColor Gray
Write-Host "------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: restart the backend, then open http://localhost:5173" -ForegroundColor Yellow
