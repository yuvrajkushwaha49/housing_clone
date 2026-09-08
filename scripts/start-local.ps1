# Start Hous locally (Windows PowerShell)
# Usage: .\scripts\start-local.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "Hous — starting API + frontend locally..." -ForegroundColor Cyan
Write-Host "Root: $Root"

if (-not (Test-Path "$Root\server\node_modules")) {
  Write-Host "Installing server dependencies..." -ForegroundColor Yellow
  npm install --prefix "$Root\server"
}

if (-not (Test-Path "$Root\client\node_modules")) {
  Write-Host "Installing client dependencies..." -ForegroundColor Yellow
  npm install --prefix "$Root\client"
}

if (-not (Test-Path "$Root\node_modules")) {
  Write-Host "Installing root dev tools (concurrently)..." -ForegroundColor Yellow
  npm install --prefix $Root
}

if (-not (Test-Path "$Root\server\.env")) {
  Write-Host "Copy server\.env.example to server\.env and configure DB + mail first." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path "$Root\client\.env")) {
  Copy-Item "$Root\client\.env.example" "$Root\client\.env"
  Write-Host "Created client\.env from example." -ForegroundColor Yellow
}

Set-Location $Root

# Free API port if a stale node process is still running
node "$Root\scripts\free-port.js" 5000 | Out-Host
node "$Root\scripts\show-lan-urls.js" | Out-Host

Write-Host ""
Write-Host "On this PC:     http://localhost:5173" -ForegroundColor Green
Write-Host "On phone/Wi-Fi: use the LAN URL printed above" -ForegroundColor Green
Write-Host "API health:     http://localhost:5173/api/v1/health" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor DarkGray
Write-Host ""

npm run dev
