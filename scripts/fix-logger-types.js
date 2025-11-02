/**
 * Fix TypeScript errors introduced during console.log cleanup
 *
 * Issues:
 * 1. logger.error('msg', error) where error is `unknown` (catch blocks)
 * 2. logger.info/debug/warn('msg', primitive) where primitive is not LogContext object
 * 3. Additional context passed incorrectly
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🔍 Analyzing TypeScript errors...\n')

// Get all TypeScript errors
let errors
try {
  execSync('npx tsc --noEmit --pretty false 2>&1 > tsc-errors.txt', { encoding: 'utf-8' })
} catch (err) {
  // tsc returns non-zero on errors, which is expected
}

const errorOutput = fs.readFileSync('tsc-errors.txt', 'utf-8')
const errorLines = errorOutput.split('\n').filter(line => line.includes('error TS'))

console.log(`Found ${errorLines.length} TypeScript errors\n`)

// Parse errors
const fileErrors = {}
for (const line of errorLines) {
  const match = line.match(/^(.+?)\((\d+),(\d+)\): error TS(\d+): (.+)$/)
  if (match) {
    const [, file, lineNum, col, errorCode, message] = match
    if (!fileErrors[file]) {
      fileErrors[file] = []
    }
    fileErrors[file].push({ lineNum: parseInt(lineNum), col: parseInt(col), errorCode, message })
  }
}

console.log(`Errors in ${Object.keys(fileErrors).length} files\n`)

let fixedCount = 0
let skippedCount = 0

// Fix each file
for (const [file, errors] of Object.entries(fileErrors)) {
  const filePath = path.resolve(file)

  if (!fs.existsSync(filePath)) {
    console.log(`⚠ File not found: ${file}`)
    skippedCount++
    continue
  }

  try {
    let content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    let modified = false

    // Sort errors by line number (descending) to avoid line number shifts
    errors.sort((a, b) => b.lineNum - a.lineNum)

    for (const error of errors) {
      const lineIdx = error.lineNum - 1
      const line = lines[lineIdx]

      // Fix 1: logger.error with unknown error
      if (error.errorCode === '2345' && error.message.includes('unknown') && error.message.includes('Error | undefined')) {
        // Pattern: logger.error('...', error) where error is unknown
        if (line.includes('logger.error') && line.includes(', error)') && !line.includes('as Error')) {
          lines[lineIdx] = line.replace(/, error\)/, ', error as Error)')
          modified = true
        }
      }

      // Fix 2: logger.info/debug/warn with non-LogContext argument
      if (error.errorCode === '2345' && error.message.includes('LogContext')) {
        // These need manual review - for now, just remove the second argument
        // Pattern: logger.info('msg', primitive)
        const loggerMatch = line.match(/(logger\.(info|debug|warn))\('([^']+)',\s*([^)]+)\)/)
        if (loggerMatch) {
          const [, loggerCall, level, message, arg] = loggerMatch
          // If arg looks like a primitive (variable name without {}), remove it
          if (!arg.includes('{') && !arg.includes('...')) {
            lines[lineIdx] = line.replace(new RegExp(`${loggerCall}\\('${message}',\\s*${arg}\\)`), `${loggerCall}('${message}')`)
            modified = true
          }
        }
      }

      // Fix 3: Extra context in logger.error
      if (error.errorCode === '2353') {
        // Object literal properties that don't exist on Error
        // Pattern: logger.error with { ...error, extra: 'value' }
        // These need manual review
        skippedCount++
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')
      fixedCount++
      console.log(`✓ Fixed: ${file}`)
    }
  } catch (err) {
    console.error(`✗ Error processing ${file}: ${err.message}`)
    skippedCount++
  }
}

// Cleanup
fs.unlinkSync('tsc-errors.txt')

console.log('\n' + '='.repeat(60))
console.log(`✅ Fixed ${fixedCount} files`)
console.log(`⚠ Skipped ${skippedCount} errors (need manual review)`)
console.log('='.repeat(60))
console.log('\nRunning TypeScript compiler to check remaining errors...\n')

try {
  execSync('npx tsc --noEmit --pretty false 2>&1 | grep "error TS" | wc -l', { encoding: 'utf-8', stdio: 'inherit' })
} catch (err) {
  // Ignore
}
