/**
 * Fix broken import statements
 *
 * Issue: Logger import was inserted in the middle of multi-line imports
 * Pattern:
 *   import {
 *   import { logger } from '@/lib/logger'
 *     IconName,
 *   } from '@heroicons/...'
 *
 * Fix:
 *   import { logger } from '@/lib/logger'
 *   import {
 *     IconName,
 *   } from '@heroicons/...'
 */

const fs = require('fs')
const path = require('path')

const files = [
  'components/trust-safety/ActionPanel.tsx',
  'components/health/HealthSyncCard.tsx',
  'components/admin/RecipeMediaUpload.tsx',
  'components/admin/RecipeGenerator.tsx',
  'app/gallery/page.tsx',
  'app/(dashboard)/admin/recipes/page.tsx',
  'hooks/useAdminStats.ts',
  'app/(dashboard)/admin/users/page.tsx',
  'app/(dashboard)/admin/settings/page.tsx',
  'app/(dashboard)/admin/perks/page.tsx',
  'app/(dashboard)/admin/analytics/page.tsx'
]

console.log('🔧 Fixing broken import statements...\n')

let fixedCount = 0

for (const file of files) {
  const filePath = path.resolve(file)

  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠ File not found: ${file}`)
      continue
    }

    let content = fs.readFileSync(filePath, 'utf-8')
    const originalContent = content

    // Fix pattern: import {\nimport { logger }
    // Replace with: import { logger }\nimport {
    content = content.replace(
      /^(import \{)\s*\n\s*import \{ logger \} from '@\/lib\/logger'\s*\n/gm,
      "import { logger } from '@/lib/logger'\n$1\n"
    )

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8')
      fixedCount++
      console.log(`✓ Fixed: ${file}`)
    } else {
      console.log(`  Skipped (no changes): ${file}`)
    }
  } catch (err) {
    console.error(`✗ Error processing ${file}: ${err.message}`)
  }
}

console.log('\n' + '='.repeat(60))
console.log(`✅ Fixed ${fixedCount} files`)
console.log('='.repeat(60))
