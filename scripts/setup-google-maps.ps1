# Add Google Maps API key to local .env and Vercel (production + preview)
# Usage: .\scripts\setup-google-maps.ps1 -ApiKey "AIza..."
# Or:    $env:GOOGLE_MAPS_API_KEY="AIza..."; .\scripts\setup-google-maps.ps1

param(
    [Parameter(Mandatory = $false)]
    [string]$ApiKey = $env:GOOGLE_MAPS_API_KEY
)

$ErrorActionPreference = "Stop"
$Root = Join-Path $PSScriptRoot ".."
$EnvFile = Join-Path $Root ".env"

if (-not $ApiKey) {
    Write-Host "Google Maps API key required."
    Write-Host ""
    Write-Host "1. Create a key: https://console.cloud.google.com/google/maps-apis"
    Write-Host "2. Enable: Maps JavaScript API, Places API, Geocoding API"
    Write-Host "3. Restrict key to your domains (localhost + auto-centre.vercel.app)"
    Write-Host ""
    Write-Host "Run:"
    Write-Host '  .\scripts\setup-google-maps.ps1 -ApiKey "AIza..."'
    exit 1
}

# Update local .env
if (Test-Path $EnvFile) {
    $content = Get-Content $EnvFile -Raw
    if ($content -match 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=') {
        $content = $content -replace 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="[^"]*"', "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=`"$ApiKey`""
        $content = $content -replace "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY='[^']*'", "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=`"$ApiKey`""
        $content = $content -replace 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=\S+', "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=`"$ApiKey`""
    } else {
        $content += "`nNEXT_PUBLIC_GOOGLE_MAPS_API_KEY=`"$ApiKey`"`n"
    }
    Set-Content -Path $EnvFile -Value $content.TrimEnd() -NoNewline
    Add-Content -Path $EnvFile -Value "`n"
    Write-Host "Updated .env with NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
} else {
    Write-Host ".env not found — copy .env.example first."
    exit 1
}

# Add to Vercel (all environments)
Push-Location $Root
Write-Host "Adding to Vercel (production, preview, development)..."
echo $ApiKey | npx vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production --force 2>$null
if ($LASTEXITCODE -ne 0) {
    echo $ApiKey | npx vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production
}
echo $ApiKey | npx vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY preview --force 2>$null
if ($LASTEXITCODE -ne 0) {
    echo $ApiKey | npx vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY preview
}
echo $ApiKey | npx vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY development --force 2>$null
if ($LASTEXITCODE -ne 0) {
    echo $ApiKey | npx vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY development
}
Pop-Location

Write-Host ""
Write-Host "Done. Restart dev server locally, then redeploy production:"
Write-Host "  npx vercel --prod"
