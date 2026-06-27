# Run from project root after Neon database is created.
# Usage: .\scripts\seed-production.ps1

param(
    [Parameter(Mandatory = $true)]
    [string]$DatabaseUrl,

    [string]$AdminEmail = "admin@autogalaxy.in",
    [string]$AdminPassword = ""
)

$ErrorActionPreference = "Stop"

if (-not $AdminPassword) {
    $AdminPassword = Read-Host "Enter ADMIN_PASSWORD for seeding"
}

$env:DATABASE_URL = $DatabaseUrl
$env:ADMIN_EMAIL = $AdminEmail
$env:ADMIN_PASSWORD = $AdminPassword

Write-Host "Seeding production database..." -ForegroundColor Cyan
npm run db:seed

if ($LASTEXITCODE -eq 0) {
    Write-Host "Done. Admin login: $AdminEmail" -ForegroundColor Green
} else {
    Write-Host "Seed failed. Check DATABASE_URL and try again." -ForegroundColor Red
    exit 1
}
