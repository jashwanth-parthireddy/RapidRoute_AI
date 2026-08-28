# RapidRoute AI — Setup Script
# Run this script to install all dependencies and start the project.
# Usage: .\setup.ps1

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  RapidRoute AI — Setup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ── Check Node.js ─────────────────────────────────────────
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVer = node --version 2>&1
    Write-Host "Node.js $nodeVer found ✓" -ForegroundColor Green
} catch {
    Write-Host "Node.js NOT found." -ForegroundColor Red
    Write-Host "Please install Node.js 20+ from: https://nodejs.org" -ForegroundColor Red
    Write-Host "Then re-run this script."
    exit 1
}

# ── Check Python ──────────────────────────────────────────
Write-Host "Checking Python..." -ForegroundColor Yellow
try {
    $pyVer = python --version 2>&1
    Write-Host "Python $pyVer found ✓" -ForegroundColor Green
} catch {
    Write-Host "Python NOT found." -ForegroundColor Red
    exit 1
}

# ── Copy .env ─────────────────────────────────────────────
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host ".env created from .env.example ✓" -ForegroundColor Green
    Write-Host "⚠️  Edit .env with your DATABASE_URL and JWT_SECRET before starting." -ForegroundColor Yellow
} else {
    Write-Host ".env already exists ✓" -ForegroundColor Green
}

# ── Backend ───────────────────────────────────────────────
Write-Host ""
Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "Backend npm install failed." -ForegroundColor Red; exit 1 }
Write-Host "Backend dependencies installed ✓" -ForegroundColor Green
Set-Location ..

# ── Frontend ──────────────────────────────────────────────
Write-Host ""
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "Frontend npm install failed." -ForegroundColor Red; exit 1 }
Write-Host "Frontend dependencies installed ✓" -ForegroundColor Green
Set-Location ..

# ── AI Service ────────────────────────────────────────────
Write-Host ""
Write-Host "Installing Python AI service dependencies..." -ForegroundColor Yellow
Set-Location ai-service
pip install -r requirements.txt --quiet
if ($LASTEXITCODE -ne 0) { Write-Host "pip install failed." -ForegroundColor Red; exit 1 }
Write-Host "AI service dependencies installed ✓" -ForegroundColor Green
Set-Location ..

# ── Done ──────────────────────────────────────────────────
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Start PostgreSQL and create the database:" -ForegroundColor White
Write-Host "     psql -U postgres -c 'CREATE DATABASE rapidroute_db;'" -ForegroundColor Gray
Write-Host "     psql -U postgres -d rapidroute_db -f database/migrations/001_init.sql" -ForegroundColor Gray
Write-Host "     psql -U postgres -d rapidroute_db -f database/seed/seed.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Update .env with your DATABASE_URL" -ForegroundColor White
Write-Host ""
Write-Host "  3. Start services (3 terminals):" -ForegroundColor White
Write-Host "     Terminal 1 (Backend):    cd backend  && npm run dev" -ForegroundColor Gray
Write-Host "     Terminal 2 (AI Service): cd ai-service && python main.py" -ForegroundColor Gray
Write-Host "     Terminal 3 (Frontend):  cd frontend && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  OR use Docker:" -ForegroundColor White
Write-Host "     docker-compose up --build" -ForegroundColor Gray
Write-Host ""
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend:   http://localhost:4000/health" -ForegroundColor Cyan
Write-Host "  AI:        http://localhost:8000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Demo login: driver1@rapidroute.ai / Password123!" -ForegroundColor Yellow
