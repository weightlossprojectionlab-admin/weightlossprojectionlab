/**
 * SEC-008: Automated Error Response Migration Script
 *
 * This script migrates catch blocks in API route files to use the centralized
 * errorResponse() helper instead of directly exposing error.message or error.stack.
 *
 * Usage:
 *   npx tsx scripts/migrate-error-responses.ts [--dry-run]
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

// Configuration
const DRY_RUN = process.argv.includes('--dry-run')
const API_DIR = path.join(process.cwd(), 'app', 'api')

interface MigrationStats {
  filesProcessed: number
  filesModified: number
  catchBlocksMigrated: number
  importsAdded: number
  errors: string[]
}

const stats: MigrationStats = {
  filesProcessed: 0,
  filesModified: 0,
  catchBlocksMigrated: 0,
  importsAdded: 0,
  errors: []
}

/**
 * Extract the route path from file path
 * e.g., "app/api/patients/[patientId]/route.ts" -> "/api/patients/[patientId]"
 */
function extractRoutePath(filePath: string): string {
  const relativePath = path.relative(path.join(process.cwd(), 'app'), filePath)
  return '/' + relativePath
    .replace(/\\/g, '/')
    .replace('/route.ts', '')
}

/**
 * Determine the operation from the function name
 */
function extractOperation(functionContext: string): string {
  if (functionContext.includes('export async function GET')) return 'fetch'
  if (functionContext.includes('export async function POST')) return 'create'
  if (functionContext.includes('export async function PUT')) return 'update'
  if (functionContext.includes('export async function PATCH')) return 'patch'
  if (functionContext.includes('export async function DELETE')) return 'delete'
  return 'operation'
}

/**
 * Check if file already has errorResponse import
 */
function hasErrorResponseImport(content: string): boolean {
  return content.includes('import { errorResponse }') ||
         content.includes('import {errorResponse}') ||
         content.includes('errorResponse } from \'@/lib/api-response\'') ||
         content.includes('errorResponse } from "@/lib/api-response"')
}

/**
 * Add errorResponse import if not present
 */
function addErrorResponseImport(content: string): { content: string, added: boolean } {
  if (hasErrorResponseImport(content)) {
    return { content, added: false }
  }

  // Find the last import statement
  const importRegex = /import .+ from ['"][@./].+['"]/g
  const imports = content.match(importRegex)

  if (!imports || imports.length === 0) {
    // No imports found, add at the top after any comments
    const lines = content.split('\n')
    let insertIndex = 0
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim().startsWith('//') &&
          !lines[i].trim().startsWith('/*') &&
          !lines[i].trim().startsWith('*') &&
          lines[i].trim() !== '') {
        insertIndex = i
        break
      }
    }
    lines.splice(insertIndex, 0, "import { errorResponse } from '@/lib/api-response'")
    return { content: lines.join('\n'), added: true }
  }

  // Add after the last import
  const lastImport = imports[imports.length - 1]
  const lastImportIndex = content.indexOf(lastImport) + lastImport.length

  const newContent =
    content.substring(0, lastImportIndex) +
    "\nimport { errorResponse } from '@/lib/api-response'" +
    content.substring(lastImportIndex)

  return { content: newContent, added: true }
}

/**
 * Migrate a catch block to use errorResponse
 */
function migrateCatchBlock(
  content: string,
  routePath: string
): { content: string, count: number } {
  let modifiedContent = content
  let count = 0

  // Pattern 1: Standard catch block with error.message
  // Matches: } catch (error) { ... return NextResponse.json({ error: error.message ... }, { status: 500 }) }
  const catchBlockRegex = /} catch \((error[^)]*)\) \{[\s\S]*?logger\.error\([^)]*\)[^\n]*\n[\s\S]*?return NextResponse\.json\(\s*\{[^}]*error:[^}]*\},\s*\{\s*status:\s*500\s*\}\s*\)\s*\n\s*\}/g

  let match
  let offset = 0
  const originalContent = modifiedContent

  while ((match = catchBlockRegex.exec(originalContent)) !== null) {
    const fullMatch = match[0]
    const errorParam = match[1]

    // Extract function context to determine operation
    const beforeCatch = originalContent.substring(0, match.index)
    const functionMatch = beforeCatch.match(/export async function (GET|POST|PUT|PATCH|DELETE)[^{]*\{/g)
    const operation = functionMatch ? extractOperation(functionMatch[functionMatch.length - 1]) : 'operation'

    // Generate replacement
    const replacement = `} catch (${errorParam}) {
    return errorResponse(${errorParam}, {
      route: '${routePath}',
      operation: '${operation}'
    })
  }`

    // Replace in the modified content (accounting for offset from previous replacements)
    const startIndex = match.index + offset
    const endIndex = startIndex + fullMatch.length

    modifiedContent =
      modifiedContent.substring(0, startIndex) +
      replacement +
      modifiedContent.substring(endIndex)

    offset += replacement.length - fullMatch.length
    count++
  }

  return { content: modifiedContent, count }
}

/**
 * Process a single route file
 */
async function processFile(filePath: string): Promise<void> {
  try {
    stats.filesProcessed++

    const content = fs.readFileSync(filePath, 'utf-8')
    const routePath = extractRoutePath(filePath)

    // Step 1: Add import if needed
    const { content: withImport, added: importAdded } = addErrorResponseImport(content)
    if (importAdded) {
      stats.importsAdded++
    }

    // Step 2: Migrate catch blocks
    const { content: migrated, count } = migrateCatchBlock(withImport, routePath)

    if (count > 0) {
      stats.catchBlocksMigrated += count
    }

    // Check if file was modified
    if (migrated !== content) {
      stats.filesModified++

      if (!DRY_RUN) {
        fs.writeFileSync(filePath, migrated, 'utf-8')
      }

      console.log(`✓ ${path.relative(process.cwd(), filePath)}`)
      console.log(`  - Imports added: ${importAdded ? 'Yes' : 'No'}`)
      console.log(`  - Catch blocks migrated: ${count}`)
    } else {
      console.log(`  ${path.relative(process.cwd(), filePath)} (no changes needed)`)
    }

  } catch (error) {
    stats.errors.push(`${filePath}: ${error instanceof Error ? error.message : String(error)}`)
    console.error(`✗ Error processing ${filePath}:`, error)
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log('🔍 SEC-008: Error Response Migration')
  console.log('=====================================')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no files will be modified)' : 'LIVE'}`)
  console.log()

  // Find all route files
  const routeFiles = glob.sync('app/api/**/route.ts', {
    cwd: process.cwd(),
    absolute: true
  })

  console.log(`Found ${routeFiles.length} route files to process\n`)

  // Process each file
  for (const file of routeFiles) {
    await processFile(file)
  }

  // Print summary
  console.log('\n=====================================')
  console.log('📊 Migration Summary')
  console.log('=====================================')
  console.log(`Files processed: ${stats.filesProcessed}`)
  console.log(`Files modified: ${stats.filesModified}`)
  console.log(`Imports added: ${stats.importsAdded}`)
  console.log(`Catch blocks migrated: ${stats.catchBlocksMigrated}`)
  console.log(`Errors: ${stats.errors.length}`)

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors encountered:')
    stats.errors.forEach(err => console.log(`  - ${err}`))
  }

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN: No files were actually modified')
    console.log('   Run without --dry-run to apply changes')
  } else {
    console.log('\n✅ Migration complete!')
  }
}

// Run the migration
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
