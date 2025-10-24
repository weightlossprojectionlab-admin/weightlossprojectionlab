# Git Worktree Removal Script
# Usage: .\scripts\worktree-remove.ps1 <feature-name> [-DeleteBranch]
# Example: .\scripts\worktree-remove.ps1 log-meal-optimization
# Example: .\scripts\worktree-remove.ps1 manual-meal-entry -DeleteBranch

param(
    [Parameter(Mandatory=$true)]
    [string]$FeatureName,

    [Parameter(Mandatory=$false)]
    [switch]$DeleteBranch = $false
)

$ErrorActionPreference = "Stop"

# Normalize feature name
$FeatureName = $FeatureName -replace '\s+', '-' -replace '[^a-zA-Z0-9-]', '' | ForEach-Object { $_.ToLower() }
$WorktreeName = "weightlossprojectlab-$FeatureName"
$WorktreePath = "C:\Users\percy\wlpl\$WorktreeName"

Write-Host ""
Write-Host "🗑️  Removing Git Worktree" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "  Feature: $FeatureName" -ForegroundColor White
Write-Host "  Path: $WorktreePath" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# Validation: Check if worktree exists
if (-not (Test-Path $WorktreePath)) {
    Write-Host "❌ ERROR: Worktree does not exist at: $WorktreePath" -ForegroundColor Red
    Write-Host ""
    Write-Host "List all worktrees:" -ForegroundColor Yellow
    Write-Host "  .\scripts\worktree-list.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Find the branch name associated with this worktree
$worktreeInfo = git worktree list --porcelain | Select-String -Pattern "worktree $WorktreePath" -Context 0,2
$branchName = $null
if ($worktreeInfo) {
    $branchLine = $worktreeInfo.Context.PostContext | Select-String -Pattern "^branch "
    if ($branchLine) {
        $branchName = $branchLine.Line -replace '^branch refs/heads/', ''
    }
}

Write-Host "⚠️  WARNING: This will remove the worktree directory" -ForegroundColor Yellow
if ($DeleteBranch -and $branchName) {
    Write-Host "⚠️  WARNING: This will also DELETE the branch: $branchName" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Uncommitted changes will be LOST!" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Cancelled." -ForegroundColor Gray
    exit 0
}

Write-Host ""
Write-Host "🧹 Removing worktree..." -ForegroundColor Cyan

# Remove the worktree
git worktree remove $WorktreePath --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Worktree removed" -ForegroundColor Green

    # Delete the branch if requested and it exists
    if ($DeleteBranch -and $branchName) {
        Write-Host ""
        Write-Host "🔥 Deleting branch: $branchName..." -ForegroundColor Cyan

        # Check if branch has been merged
        $mergeCheck = git branch --merged main | Select-String -Pattern $branchName
        if ($mergeCheck) {
            git branch -d $branchName
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Branch deleted (was merged)" -ForegroundColor Green
            }
        } else {
            Write-Host "⚠️  Branch has NOT been merged to main" -ForegroundColor Yellow
            $forceDelete = Read-Host "Force delete unmerged branch? (y/n)"
            if ($forceDelete -eq "y") {
                git branch -D $branchName
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✓ Branch force-deleted" -ForegroundColor Green
                }
            } else {
                Write-Host "Branch kept: $branchName" -ForegroundColor Gray
            }
        }

        # Delete remote branch if it exists
        $remoteBranch = git ls-remote --heads origin $branchName 2>$null
        if ($remoteBranch) {
            Write-Host ""
            $deleteRemote = Read-Host "Delete remote branch? (y/n)"
            if ($deleteRemote -eq "y") {
                git push origin --delete $branchName
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✓ Remote branch deleted" -ForegroundColor Green
                }
            }
        }
    }

    Write-Host ""
    Write-Host "✅ Cleanup complete!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ ERROR: Failed to remove worktree" -ForegroundColor Red
    Write-Host "Try manually: git worktree remove $WorktreePath --force" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
