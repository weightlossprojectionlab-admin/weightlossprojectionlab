# Git Worktree Creation Script
# Usage: .\scripts\worktree-create.ps1 <feature-name> [type]
# Example: .\scripts\worktree-create.ps1 log-meal-optimization perf
# Example: .\scripts\worktree-create.ps1 manual-meal-entry feature

param(
    [Parameter(Mandatory=$true)]
    [string]$FeatureName,

    [Parameter(Mandatory=$false)]
    [ValidateSet("feature", "perf", "hotfix", "refactor")]
    [string]$Type = "feature"
)

$ErrorActionPreference = "Stop"

# Normalize feature name (remove spaces, lowercase)
$FeatureName = $FeatureName -replace '\s+', '-' -replace '[^a-zA-Z0-9-]', '' | ForEach-Object { $_.ToLower() }
$BranchName = "$Type/$FeatureName"
$WorktreeName = "weightlossprojectlab-$FeatureName"
$WorktreePath = "C:\Users\percy\wlpl\$WorktreeName"

Write-Host ""
Write-Host "Creating Git Worktree" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor DarkGray
Write-Host "  Feature: $FeatureName" -ForegroundColor White
Write-Host "  Type: $Type" -ForegroundColor White
Write-Host "  Branch: $BranchName" -ForegroundColor Yellow
Write-Host "  Path: $WorktreePath" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor DarkGray
Write-Host ""

# Validation: Check if worktree already exists
if (Test-Path $WorktreePath) {
    Write-Host "[ERROR] Worktree already exists at: $WorktreePath" -ForegroundColor Red
    Write-Host ""
    Write-Host "To remove existing worktree:" -ForegroundColor Yellow
    Write-Host "  .\scripts\worktree-remove.ps1 $FeatureName" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Validation: Check if branch already exists
$existingBranch = git branch --list $BranchName 2>$null
if ($existingBranch) {
    Write-Host "[WARNING] Branch '$BranchName' already exists" -ForegroundColor Yellow
    $continue = Read-Host "Use existing branch? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Cancelled." -ForegroundColor Gray
        exit 0
    }
    Write-Host "[OK] Using existing branch: $BranchName" -ForegroundColor Green
    git worktree add $WorktreePath $BranchName
} else {
    Write-Host "Creating new branch from main..." -ForegroundColor Cyan
    git worktree add -b $BranchName $WorktreePath main
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] Worktree created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor DarkGray
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  1. Navigate to worktree:" -ForegroundColor White
    Write-Host "     cd $WorktreePath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  2. Install dependencies (if needed):" -ForegroundColor White
    Write-Host "     npm install" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  3. Start development server:" -ForegroundColor White
    Write-Host "     npm run dev" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  4. Make your changes and commit" -ForegroundColor White
    Write-Host ""
    Write-Host "  5. Push to remote:" -ForegroundColor White
    Write-Host "     git push -u origin $BranchName" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  6. Create PR on GitHub" -ForegroundColor White
    Write-Host ""
    Write-Host "========================================" -ForegroundColor DarkGray
    Write-Host "Useful Commands:" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  List all worktrees:" -ForegroundColor White
    Write-Host "     .\scripts\worktree-list.ps1" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Remove this worktree (after PR merge):" -ForegroundColor White
    Write-Host "     .\scripts\worktree-remove.ps1 $FeatureName" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[ERROR] Failed to create worktree" -ForegroundColor Red
    Write-Host "Check git output above for details" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
