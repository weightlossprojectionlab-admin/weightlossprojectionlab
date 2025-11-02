/**
 * Fix TypeScript errors in logger.error() calls
 *
 * Issue: After console.log cleanup, many catch blocks have `error` typed as `unknown`
 * but logger.error() expects `Error | undefined`
 *
 * Fix: Add `as Error` type cast to all `logger.error(..., error)` calls
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Directories to process
const dirs = ['app', 'lib', 'hooks', 'components']

console.log('🔍 Finding files with logger.error(..., error) pattern...\n')

// Find all files with the pattern
const files = []
for (const dir of dirs) {
  try {
    const result = execSync(
      `grep -rl "logger\\.error([^,]\\+, error)" ${dir} --include="*.ts" --include="*.tsx"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    )
    files.push(...result.trim().split('\n').filter(Boolean))
  } catch (err) {
    // grep returns non-zero if no matches found
  }
}

console.log(`Found ${files.length} files to process\n`)

let totalReplacements = 0
const modifiedFiles = []

// Process each file
for (const file of files) {
  const filePath = path.resolve(file)

  try {
    let content = fs.readFileSync(filePath, 'utf-8')
    const originalContent = content
    let fileReplacements = 0

    // Pattern 1: logger.error('message', error) → logger.error('message', error as Error)
    // Exclude cases that already have 'as Error', 'as any', or other type assertions
    content = content.replace(
      /logger\.error\(([^,]+),\s*error\)(?!\s+as\s)/g,
      (match, message) => {
        fileReplacements++
        return `logger.error(${message}, error as Error)`
      }
    )

    // Pattern 2: logger.error('message', error\n) - multiline case
    content = content.replace(
      /logger\.error\(([^,]+),\s*error\s*\n\s*\)(?!\s+as\s)/g,
      (match, message) => {
        fileReplacements++
        return `logger.error(${message}, error as Error\n    )`
      }
    )

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8')
      modifiedFiles.push(file)
      totalReplacements += fileReplacements
      console.log(`✓ ${file} (${fileReplacements} replacements)`)
    }
  } catch (err) {
    console.error(`✗ Error processing ${file}: ${err.message}`)
  }
}

console.log('\n' + '='.repeat(60))
console.log(`✅ Complete!`)
console.log(`   Modified files: ${modifiedFiles.length}`)
console.log(`   Total replacements: ${totalReplacements}`)
console.log('='.repeat(60))
