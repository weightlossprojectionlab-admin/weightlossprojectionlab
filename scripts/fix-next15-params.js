#!/usr/bin/env node

/**
 * Fix Next.js 15 params migration
 *
 * In Next.js 15, route params must be Promise<{ key: value }>
 * This script automatically updates all API route files
 */

const fs = require('fs')
const path = require('path')
const glob = require('glob')

const apiDir = path.join(__dirname, '..', 'app', 'api')

// Find all route.ts files
const files = glob.sync(`${apiDir}/**/route.ts`)

console.log(`Found ${files.length} API route files`)

let fixed = 0
let skipped = 0

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8')
  let modified = false

  // Pattern 1: { params }: { params: { key: type } }
  // Replace with: { params }: { params: Promise<{ key: type }> }
  const pattern1 = /(\{ params \}: \{ params: )(\{[^}]+\})/g
  if (pattern1.test(content)) {
    content = content.replace(pattern1, '$1Promise<$2>')
    modified = true
  }

  // Pattern 2: const { key } = params
  // Replace with: const { key } = await params
  const pattern2 = /(const \{[^}]+\} = )(params)(\s*$)/gm
  if (pattern2.test(content) && content.includes('{ params }:')) {
    content = content.replace(pattern2, '$1await $2$3')
    modified = true
  }

  if (modified) {
    fs.writeFileSync(file, content, 'utf8')
    console.log(`✓ Fixed: ${path.relative(process.cwd(), file)}`)
    fixed++
  } else {
    skipped++
  }
})

console.log(`\n✅ Fixed ${fixed} files, skipped ${skipped} files`)
