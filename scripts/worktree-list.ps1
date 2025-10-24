# Git Worktree List Script
# Usage: .\scripts\worktree-list.ps1
# Shows all active worktrees with their branches and locations

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "📊 Active Git Worktrees" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# Get worktree list
$worktrees = git worktree list --porcelain

if (-not $worktrees) {
    Write-Host "No worktrees found." -ForegroundColor Gray
    Write-Host ""
    exit 0
}

# Parse worktree information
$currentWorktree = @{}
$worktreeList = @()

foreach ($line in $worktrees) {
    if ($line -match "^worktree (.+)$") {
        if ($currentWorktree.Count -gt 0) {
            $worktreeList += [PSCustomObject]$currentWorktree
        }
        $currentWorktree = @{
            Path = $matches[1]
        }
    }
    elseif ($line -match "^HEAD (.+)$") {
        $currentWorktree.HEAD = $matches[1]
    }
    elseif ($line -match "^branch (.+)$") {
        $currentWorktree.Branch = $matches[1] -replace '^refs/heads/', ''
    }
    elseif ($line -match "^detached$") {
        $currentWorktree.Detached = $true
    }
}

# Add last worktree
if ($currentWorktree.Count -gt 0) {
    $worktreeList += [PSCustomObject]$currentWorktree
}

# Display worktrees
$count = 0
foreach ($wt in $worktreeList) {
    $count++

    # Determine worktree type
    $wtName = Split-Path -Leaf $wt.Path
    $isMain = $wt.Path -match "weightlossprojectlab$"

    if ($isMain) {
        Write-Host "  [MAIN]" -ForegroundColor Green -NoNewline
    } else {
        Write-Host "  [$count]" -ForegroundColor Yellow -NoNewline
    }

    Write-Host " $wtName" -ForegroundColor White
    Write-Host "      📂 Path: " -ForegroundColor DarkGray -NoNewline
    Write-Host $wt.Path -ForegroundColor Gray

    if ($wt.Branch) {
        Write-Host "      🌿 Branch: " -ForegroundColor DarkGray -NoNewline
        Write-Host $wt.Branch -ForegroundColor Cyan
    } elseif ($wt.Detached) {
        Write-Host "      ⚠️  Detached HEAD: " -ForegroundColor DarkGray -NoNewline
        Write-Host $wt.HEAD.Substring(0, 8) -ForegroundColor Yellow
    }

    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "Total: $($worktreeList.Count) worktree(s)" -ForegroundColor White
Write-Host ""
Write-Host "📝 Quick Actions:" -ForegroundColor Cyan
Write-Host "  Create new worktree: " -ForegroundColor DarkGray -NoNewline
Write-Host ".\scripts\worktree-create.ps1 <feature-name>" -ForegroundColor Yellow
Write-Host "  Remove worktree:     " -ForegroundColor DarkGray -NoNewline
Write-Host ".\scripts\worktree-remove.ps1 <feature-name>" -ForegroundColor Yellow
Write-Host ""
