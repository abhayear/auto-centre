# GitHub & deployment setup
# Run from repo root after committing changes.
# Requires: gh CLI logged in (gh auth login)

$ErrorActionPreference = "Stop"
$Repo = "abhayear/auto-centre"

Write-Host "==> Pushing master..."
git push origin master

Write-Host "==> Creating and pushing develop branch..."
git checkout develop 2>$null
if ($LASTEXITCODE -ne 0) {
  git checkout -b develop
}
git push -u origin develop
git checkout master

Write-Host "==> Creating GitHub environments (skip if already exist)..."
try { gh api "repos/$Repo/environments/staging" -X PUT -H "Accept: application/vnd.github+json" --raw-field wait_timer=0 } catch {}
try { gh api "repos/$Repo/environments/production" -X PUT -H "Accept: application/vnd.github+json" --raw-field wait_timer=0 } catch {}

Write-Host "==> Environments:"
gh api "repos/$Repo/environments" --jq ".environments[].name"

Write-Host ""
Write-Host "==> Configured secrets (names only):"
gh secret list -R $Repo

Write-Host ""
Write-Host "Done. If VERCEL_TOKEN / VERCEL_ORG_ID / VERCEL_PROJECT_ID are missing,"
Write-Host "add them at: https://github.com/$Repo/settings/secrets/actions"
Write-Host "See CI_CD.md for Vercel token instructions."
