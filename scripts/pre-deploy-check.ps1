# Pre-Deploy Validation Script for Windows (PowerShell)
# Usage: .\scripts\pre-deploy-check.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔍 Pre-Deploy Validation Suite" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check 1: Git Status
Write-Host "✅ Check 1: Git Repository Status" -ForegroundColor Green
$gitStatus = git status --short | Where-Object { $_ -notmatch "^\?\?" }
if ($gitStatus) {
    Write-Host "⚠️  WARNING: Uncommitted changes found" -ForegroundColor Yellow
    Write-Host "Please commit or stash these files before deploying:"
    git status --short | Where-Object { $_ -notmatch "^\?\?" }
    Write-Host ""
    $response = Read-Host "Continue anyway? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        exit 1
    }
}
Write-Host "✓ Git repository is clean" -ForegroundColor Green
Write-Host ""

# Check 2: Dynamic Routes Validation
Write-Host "✅ Check 2: Next.js 15 Dynamic Routes" -ForegroundColor Green
Write-Host "Checking for old-style params..."
$paramsErrors = Get-ChildItem -Path app -Include *.tsx,*.ts -Recurse |
    Select-String -Pattern "params: \{" |
    Where-Object { $_.Line -notmatch "Promise" -and $_.Line -notmatch "useParams" -and $_.Line -notmatch "searchParams" }

if ($paramsErrors) {
    Write-Host "❌ Found dynamic routes without Promise params!" -ForegroundColor Red
    $paramsErrors | ForEach-Object { Write-Host $_.Path ": " $_.Line }
    Write-Host ""
    Write-Host "Fix: Change 'params: { id: string }' to 'params: Promise<{ id: string }>'" -ForegroundColor Yellow
    Write-Host "      and add 'await params' in the function body" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ All dynamic routes use Next.js 15 syntax" -ForegroundColor Green
Write-Host ""

# Check 3: Clean Build Artifacts
Write-Host "✅ Check 3: Clean Build Artifacts" -ForegroundColor Green
Write-Host "Removing .next and cache directories..."
if (Test-Path .next) { Remove-Item -Recurse -Force .next }
if (Test-Path node_modules\.cache) { Remove-Item -Recurse -Force node_modules\.cache }
Write-Host "✓ Build artifacts cleaned" -ForegroundColor Green
Write-Host ""

# Check 4: Production Build
Write-Host "✅ Check 4: Production Build" -ForegroundColor Green
Write-Host "Building Next.js for production..."
Write-Host "(This may take 2-3 minutes)"
Write-Host ""

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Production build failed!" -ForegroundColor Red
    Write-Host "Fix the errors above before deploying." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✓ Production build succeeded" -ForegroundColor Green
Write-Host ""

# Check 5: Build Output Verification
Write-Host "✅ Check 5: Build Output Verification" -ForegroundColor Green
if (-not (Test-Path .next)) {
    Write-Host "❌ .next directory not found after build!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build output verified" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "🎉 All Pre-Deploy Checks Passed!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your code is ready to deploy. Run:" -ForegroundColor Cyan
Write-Host "  git push origin main" -ForegroundColor White
Write-Host ""
Write-Host "After pushing, monitor the Netlify build." -ForegroundColor Cyan
Write-Host ""
