# PowerShell script to replace all console statements with logger in remaining files

$files = @(
    "app\api\ai\analyze-meal\route.ts",
    "app\api\ai\chat\route.ts",
    "app\api\recipes\import\route.ts",
    "app\api\recipes\generate-steps\route.ts",
    "app\api\admin\users\route.ts",
    "app\api\admin\users\export\route.ts",
    "app\api\admin\settings\audit-logs\route.ts",
    "app\api\admin\settings\admin-users\route.ts",
    "app\api\admin\recipes\[id]\moderate\route.ts",
    "app\api\admin\perks\route.ts",
    "app\api\admin\grant-role\route.ts",
    "app\api\admin\analytics\route.ts",
    "app\api\admin\ai-decisions\stats\route.ts",
    "app\api\admin\ai-decisions\route.ts"
)

foreach ($file in $files) {
    $filePath = Join-Path $PSScriptRoot $file
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw

        # Add import if not present
        if ($content -notmatch "import.*logger.*from.*@/lib/logger") {
            # Find the last import statement and add logger import after it
            $content = $content -replace "(import[^;]+;)\s*\n(\n|export|interface|type|const|function|class|\*/)", "`$1`nimport { logger } from '@/lib/logger'`n`$2"
        }

        # Replace console.error with logger.error
        $content = $content -replace "console\.error\('([^']+)'[,\s]+([^)]+)\)", "logger.error('`$1', `$2 instanceof Error ? `$2 : new Error(String(`$2)))"
        $content = $content -replace "console\.error\(`"([^`"]+)`"[,\s]+([^)]+)\)", "logger.error('`$1', `$2 instanceof Error ? `$2 : new Error(String(`$2)))"
        $content = $content -replace "console\.error\('([^']+)'\)", "logger.error('`$1', new Error('`$1'))"

        # Replace console.warn with logger.warn
        $content = $content -replace "console\.warn\('([^']+)'\)", "logger.warn('`$1')"
        $content = $content -replace "console\.warn\(`"([^`"]+)`"\)", "logger.warn('`$1')"

        # Replace console.log with logger.debug or logger.info
        $content = $content -replace "console\.log\('✅([^']+)'\)", "logger.info('`$1')"
        $content = $content -replace "console\.log\('❌([^']+)'[,\s]+([^)]+)\)", "logger.error('`$1', `$2 instanceof Error ? `$2 : new Error(String(`$2)))"
        $content = $content -replace "console\.log\('⚠️([^']+)'\)", "logger.warn('`$1')"
        $content = $content -replace "console\.log\('🤖([^']+)'\)", "logger.debug('`$1')"
        $content = $content -replace "console\.log\('🔍([^']+)'\)", "logger.debug('`$1')"
        $content = $content -replace "console\.log\('\[([^\]]+)\]([^']+)'[,\s]+([^)]+)\)", "logger.debug('`$1: `$2', { data: `$3 })"
        $content = $content -replace "console\.log\('\[([^\]]+)\]([^']+)'\)", "logger.debug('`$1: `$2')"
        $content = $content -replace "console\.log\(`"\[([^\]]+)\]([^`"]+)`"[,\s]+([^)]+)\)", "logger.debug('`$1: `$2', { data: `$3 })"
        $content = $content -replace "console\.log\(`"\[([^\]]+)\]([^`"]+)`"\)", "logger.debug('`$1: `$2')"
        $content = $content -replace "console\.log\('([^']+)'[,\s]+([^)]+)\)", "logger.debug('`$1', { data: `$2 })"
        $content = $content -replace "console\.log\(`"([^`"]+)`"[,\s]+([^)]+)\)", "logger.debug('`$1', { data: `$2 })"
        $content = $content -replace "console\.log\('([^']+)'\)", "logger.debug('`$1')"

        Set-Content $filePath -Value $content -NoNewline
        Write-Host "Updated: $file"
    } else {
        Write-Host "File not found: $file"
    }
}

Write-Host "`nAll files updated!"
