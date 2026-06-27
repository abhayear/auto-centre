# Configure GitHub Actions secrets for Vercel CD
# Run from repo root. Requires: gh CLI (gh auth login), Vercel project linked (vercel link).

$ErrorActionPreference = "Stop"
$Repo = "abhayear/auto-centre"

function Get-VercelIds {
    $repoJson = Join-Path $PSScriptRoot ".." ".vercel" "repo.json" | Resolve-Path -ErrorAction SilentlyContinue
    if (-not $repoJson) {
        Write-Host "Linking Vercel project..."
        Push-Location (Join-Path $PSScriptRoot "..")
        vercel link --yes --project auto-centre
        Pop-Location
        $repoJson = Join-Path $PSScriptRoot ".." ".vercel" "repo.json" | Resolve-Path
    }

    $config = Get-Content $repoJson | ConvertFrom-Json
    $project = $config.projects | Select-Object -First 1
    return @{
        OrgId     = $project.orgId
        ProjectId = $project.id
    }
}

Write-Host "==> Reading Vercel project IDs..."
$ids = Get-VercelIds
Write-Host "    ORG_ID:     $($ids.OrgId)"
Write-Host "    PROJECT_ID: $($ids.ProjectId)"

Write-Host "==> Setting GitHub secrets (org + project)..."
gh secret set VERCEL_ORG_ID -R $Repo --body $ids.OrgId
gh secret set VERCEL_PROJECT_ID -R $Repo --body $ids.ProjectId

if ($env:VERCEL_TOKEN) {
    Write-Host "==> Setting VERCEL_TOKEN from environment..."
    gh secret set VERCEL_TOKEN -R $Repo --body $env:VERCEL_TOKEN
} else {
    Write-Host ""
    Write-Host "VERCEL_TOKEN not set in this shell."
    Write-Host "1. Create a classic token: https://vercel.com/account/tokens"
    Write-Host "2. Run:"
    Write-Host '   $env:VERCEL_TOKEN="your-token"; .\scripts\setup-github-deploy.ps1'
    Write-Host "   Or: gh secret set VERCEL_TOKEN -R $Repo"
    Write-Host ""
}

Write-Host "==> GitHub secrets:"
gh secret list -R $Repo

Write-Host ""
Write-Host "==> GitHub environments:"
gh api "repos/$Repo/environments" --jq ".environments[].name"

Write-Host ""
Write-Host "After VERCEL_TOKEN is set, re-run failed deploys:"
Write-Host "  gh workflow run deploy-vercel.yml -R $Repo"
Write-Host "  gh workflow run deploy-staging.yml -R $Repo"
