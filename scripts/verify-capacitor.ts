/**
 * Capacitor Integration Verification Script
 *
 * Verifies that all platform adapters are properly configured and working.
 * Run this script to check the Capacitor setup before building native apps.
 *
 * Usage: npx tsx scripts/verify-capacitor.ts
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

interface VerificationResult {
  category: string
  checks: Array<{
    name: string
    passed: boolean
    message: string
  }>
}

const results: VerificationResult[] = []

console.log('🔍 Verifying Capacitor Integration...\n')

// ============================================================================
// 1. Check Core Files
// ============================================================================

const coreFiles = {
  category: 'Core Configuration Files',
  checks: [
    {
      name: 'capacitor.config.ts exists',
      path: 'capacitor.config.ts',
      required: true,
    },
    {
      name: 'lib/platform.ts exists',
      path: 'lib/platform.ts',
      required: true,
    },
    {
      name: 'lib/adapters/index.ts exists',
      path: 'lib/adapters/index.ts',
      required: true,
    },
    {
      name: 'lib/adapters/storage.ts exists',
      path: 'lib/adapters/storage.ts',
      required: true,
    },
    {
      name: 'lib/adapters/motion.ts exists',
      path: 'lib/adapters/motion.ts',
      required: true,
    },
    {
      name: 'lib/adapters/biometric.ts exists',
      path: 'lib/adapters/biometric.ts',
      required: true,
    },
    {
      name: 'lib/adapters/health.ts exists',
      path: 'lib/adapters/health.ts',
      required: true,
    },
  ],
}

const coreResult: VerificationResult = {
  category: coreFiles.category,
  checks: [],
}

for (const check of coreFiles.checks) {
  const exists = existsSync(join(process.cwd(), check.path))
  coreResult.checks.push({
    name: check.name,
    passed: exists,
    message: exists ? 'Found' : 'Missing',
  })
}

results.push(coreResult)

// ============================================================================
// 2. Check Native Projects
// ============================================================================

const nativeProjects = {
  category: 'Native Projects',
  checks: [
    {
      name: 'iOS project exists',
      path: 'ios/App/App.xcodeproj',
    },
    {
      name: 'Android project exists',
      path: 'android/app/build.gradle',
    },
    {
      name: 'iOS Info.plist exists',
      path: 'ios/App/App/Info.plist',
    },
    {
      name: 'Android AndroidManifest.xml exists',
      path: 'android/app/src/main/AndroidManifest.xml',
    },
  ],
}

const nativeResult: VerificationResult = {
  category: nativeProjects.category,
  checks: [],
}

for (const check of nativeProjects.checks) {
  const exists = existsSync(join(process.cwd(), check.path))
  nativeResult.checks.push({
    name: check.name,
    passed: exists,
    message: exists ? 'Found' : 'Missing',
  })
}

results.push(nativeResult)

// ============================================================================
// 3. Check iOS Permissions
// ============================================================================

const iosPermissions = {
  category: 'iOS Permissions (Info.plist)',
  checks: [
    'NSMotionUsageDescription',
    'NSHealthShareUsageDescription',
    'NSHealthUpdateUsageDescription',
    'NSCameraUsageDescription',
    'NSPhotoLibraryUsageDescription',
    'NSFaceIDUsageDescription',
  ],
}

const iosResult: VerificationResult = {
  category: iosPermissions.category,
  checks: [],
}

const infoPlistPath = join(process.cwd(), 'ios/App/App/Info.plist')
if (existsSync(infoPlistPath)) {
  const infoPlist = readFileSync(infoPlistPath, 'utf-8')

  for (const permission of iosPermissions.checks) {
    const exists = infoPlist.includes(`<key>${permission}</key>`)
    iosResult.checks.push({
      name: permission,
      passed: exists,
      message: exists ? 'Configured' : 'Missing',
    })
  }
} else {
  iosResult.checks.push({
    name: 'Info.plist',
    passed: false,
    message: 'File not found',
  })
}

results.push(iosResult)

// ============================================================================
// 4. Check Android Permissions
// ============================================================================

const androidPermissions = {
  category: 'Android Permissions (AndroidManifest.xml)',
  checks: [
    'ACTIVITY_RECOGNITION',
    'BODY_SENSORS',
    'CAMERA',
    'USE_BIOMETRIC',
    'POST_NOTIFICATIONS',
  ],
}

const androidResult: VerificationResult = {
  category: androidPermissions.category,
  checks: [],
}

const manifestPath = join(
  process.cwd(),
  'android/app/src/main/AndroidManifest.xml'
)
if (existsSync(manifestPath)) {
  const manifest = readFileSync(manifestPath, 'utf-8')

  for (const permission of androidPermissions.checks) {
    const exists = manifest.includes(permission)
    androidResult.checks.push({
      name: `android.permission.${permission}`,
      passed: exists,
      message: exists ? 'Configured' : 'Missing',
    })
  }
} else {
  androidResult.checks.push({
    name: 'AndroidManifest.xml',
    passed: false,
    message: 'File not found',
  })
}

results.push(androidResult)

// ============================================================================
// 5. Check Package.json Scripts
// ============================================================================

const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
)

const scriptsResult: VerificationResult = {
  category: 'Build Scripts',
  checks: [
    {
      name: 'build:mobile',
      passed: 'build:mobile' in packageJson.scripts,
      message:
        'build:mobile' in packageJson.scripts ? 'Configured' : 'Missing',
    },
    {
      name: 'cap:sync',
      passed: 'cap:sync' in packageJson.scripts,
      message: 'cap:sync' in packageJson.scripts ? 'Configured' : 'Missing',
    },
    {
      name: 'cap:run:ios',
      passed: 'cap:run:ios' in packageJson.scripts,
      message:
        'cap:run:ios' in packageJson.scripts ? 'Configured' : 'Missing',
    },
    {
      name: 'cap:run:android',
      passed: 'cap:run:android' in packageJson.scripts,
      message:
        'cap:run:android' in packageJson.scripts ? 'Configured' : 'Missing',
    },
  ],
}

results.push(scriptsResult)

// ============================================================================
// 6. Check Dependencies
// ============================================================================

const requiredDeps = [
  '@capacitor/core',
  '@capacitor/cli',
  '@capacitor/app',
  '@capacitor/preferences',
  '@capacitor/motion',
  '@aparajita/capacitor-biometric-auth',
  'capacitor-health',
]

const depsResult: VerificationResult = {
  category: 'Dependencies',
  checks: [],
}

for (const dep of requiredDeps) {
  const installed = dep in packageJson.dependencies
  depsResult.checks.push({
    name: dep,
    passed: installed,
    message: installed
      ? `v${packageJson.dependencies[dep]}`
      : 'Not installed',
  })
}

results.push(depsResult)

// ============================================================================
// Print Results
// ============================================================================

let allPassed = true

for (const result of results) {
  console.log(`\n📋 ${result.category}`)
  console.log('='.repeat(60))

  for (const check of result.checks) {
    const icon = check.passed ? '✅' : '❌'
    console.log(`${icon} ${check.name}: ${check.message}`)

    if (!check.passed) {
      allPassed = false
    }
  }
}

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(60))
if (allPassed) {
  console.log('✅ All checks passed! Capacitor is properly configured.')
  console.log('\n📱 Ready to build native apps:')
  console.log('   npm run build:mobile && npm run cap:sync')
  console.log('   npm run cap:open:ios')
  console.log('   npm run cap:open:android')
  process.exit(0)
} else {
  console.log('❌ Some checks failed. Please review the errors above.')
  console.log('\n📚 See CAPACITOR.md for setup instructions.')
  process.exit(1)
}
