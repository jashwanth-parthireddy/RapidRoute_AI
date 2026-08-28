#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════
#  RapidRoute AI — Start All Services
#  Opens 3 separate terminal windows for each service.
#  Usage: .\start.ps1
# ═══════════════════════════════════════════════════════════

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host @"

 ____             _     _ ____             _         _    ___ 
|  _ \ __ _ _ __|_| __| |  _ \ ___  _   _| |_ ___  / \  |_ _|
| |_) / _' | '_ \| |/ _' | |_) / _ \| | | | __/ _ \/  \  | | 
|  _ < (_| | |_) | | (_| |  _ < (_) | |_| | ||  __/ /\ \ | | 
|_| \_\__,_| .__/|_|\__,_|_| \_\___/ \__,_|\__\___/_/  \_|___|
           |_|                                                  

"@ -ForegroundColor Cyan

Write-Host "🚀 Starting RapidRoute AI services..." -ForegroundColor Green
Write-Host ""

# ─── AI Service (port 8000) ────────────────────────────────
Write-Host "Starting AI Service on http://localhost:8000" -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Write-Host 'AI Service' -ForegroundColor Cyan; Set-Location '$root\ai-service'; python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
)

Start-Sleep -Seconds 2

# ─── Backend (port 4000) ───────────────────────────────────
Write-Host "Starting Backend on http://localhost:4000" -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Write-Host 'Backend API' -ForegroundColor Cyan; `$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User'); Set-Location '$root\backend'; npm run dev"
)

Start-Sleep -Seconds 2

# ─── Frontend (port 5173) ──────────────────────────────────
Write-Host "Starting Frontend on http://localhost:5173" -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Write-Host 'Frontend' -ForegroundColor Cyan; `$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User'); Set-Location '$root\frontend'; npm run dev"
)

Start-Sleep -Seconds 4

Write-Host @"

╔══════════════════════════════════════════════════════════╗
║            ✅ All Services Starting!                      ║
╠══════════════════════════════════════════════════════════╣
║  AI Service  →  http://localhost:8000/health             ║
║  Backend API →  http://localhost:4000/health             ║
║  Frontend    →  http://localhost:5173                    ║
╠══════════════════════════════════════════════════════════╣
║  Demo Credentials (password: Password123!)               ║
║  Control Room : control@rapidroute.ai                    ║
║  Driver       : driver1@rapidroute.ai                    ║
╚══════════════════════════════════════════════════════════╝

Opening browser...
"@ -ForegroundColor Green

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
