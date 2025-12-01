#!/usr/bin/env tsx
/**
 * Automated Security Audit Script
 *
 * Scans codebase for security anti-patterns and validates security configurations:
 * 1. Scans for security anti-patterns (hardcoded credentials, debug endpoints, etc.)
 * 2. Validates security configuration (environment variables, headers, etc.)
 * 3. Generates detailed report with actionable findings
 *
 * Exit codes:
 * - 0: All checks passed
 * - 1: Critical issues found
 * - 2: Warnings only
 *
 * Usage:
 *   npx tsx scripts/security-audit.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// ============================================
// TYPES
// ============================================

interface SecurityFinding {
  type: 'PASSED' | 'FAILED' | 'WARNING'
  category: string
  message: string
  file?: string
  line?: number
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
}

interface AuditReport {
  passed: SecurityFinding[]
  failed: SecurityFinding[]
  warnings: SecurityFinding[]
  summary: {
    totalChecks: number
    passedCount: number
    failedCount: number
    warningCount: number
  }
}

// ============================================
// CONFIGURATION
// ============================================

const PROJECT_ROOT = path.resolve(__dirname, '..')
const EXCLUDED_DIRS = ['node_modules', '.next', '.git', 'dist', 'build', '__tests__']

// Security patterns to detect
const SECURITY_PATTERNS = {
  // Hardcoded credentials
  hardcodedSecrets: [
    /password\s*=\s*["'][^"']+["']/gi,
    /api[_-]?key\s*=\s*["'][^"']+["']/gi,
    /secret\s*=\s*["'][^"']+["']/gi,
    /token\s*=\s*["'][^"']+["']/gi,
    /[a-zA-Z0-9._-]+@gmail\.com/g, // Gmail addresses in code
  ],

  // Debug endpoints without guards
  debugEndpoints: [
    /\/api\/(debug|fix|test)-[^/]+/g,
  ],

  // Wildcard CORS
  wildcardCors: [
    /Access-Control-Allow-Origin["']?\s*[:=]\s*["']?\*/gi,
    /"Access-Control-Allow-Origin"\s*:\s*"\*"/gi,
  ],

  // Stack traces in responses
  stackTraces: [
    /\.stack\b(?!Trace)/g, // error.stack (but not stackTrace variable)
    /new Error\([^)]+\)\.stack/g,
  ],

  // SQL-like queries (NoSQL injection risks)
  noSQLInjection: [
    /\$where\s*[:=]/gi,
    /\$gt\s*[:=]/gi,
    /\$ne\s*[:=]/gi,
  ],

  // Unsafe eval usage
  unsafeEval: [
    /\beval\s*\(/gi,
    /new Function\s*\(/gi,
  ],
}

// Required environment variables
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'FIREBASE_ADMIN_PROJECT_ID',
]

// Optional but recommended env vars
const RECOMMENDED_ENV_VARS = [
  'SUPER_ADMIN_EMAILS',
  'ALLOWED_ORIGINS',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
]

// ============================================
// UTILITIES
// ============================================

/**
 * Recursively get all TypeScript/JavaScript files
 */
function getAllSourceFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    // Skip excluded directories
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(entry.name)) {
        getAllSourceFiles(fullPath, files)
      }
    } else if (entry.isFile()) {
      // Include .ts, .tsx, .js, .jsx files
      if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        files.push(fullPath)
      }
    }
  }

  return files
}

/**
 * Read file content safely
 */
function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

/**
 * Get line number for a match in content
 */
function getLineNumber(content: string, matchIndex: number): number {
  const beforeMatch = content.substring(0, matchIndex)
  return beforeMatch.split('\n').length
}

// ============================================
// SECURITY CHECKS
// ============================================

/**
 * Check for hardcoded credentials
 */
function checkHardcodedCredentials(files: string[]): SecurityFinding[] {
  const findings: SecurityFinding[] = []

  for (const file of files) {
    const content = readFileSafe(file)
    if (!content) continue

    // Skip test files
    if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) {
      continue
    }

    for (const pattern of SECURITY_PATTERNS.hardcodedSecrets) {
      const matches = content.matchAll(pattern)

      for (const match of matches) {
        const line = getLineNumber(content, match.index!)
        const relativePath = path.relative(PROJECT_ROOT, file)

        // Filter out false positives
        const matchText = match[0]
        const isFalsePositive =
          matchText.includes('process.env') ||
          matchText.includes('example.com') ||
          matchText.includes('test@') ||
          matchText.includes('mock') ||
          matchText.includes('TODO') ||
          matchText.includes('EXAMPLE')

        if (!isFalsePositive) {
          findings.push({
            type: 'FAILED',
            category: 'Hardcoded Credentials',
            message: `Potential hardcoded credential: ${matchText}`,
            file: relativePath,
            line,
            severity: 'CRITICAL',
          })
        }
      }
    }
  }

  if (findings.length === 0) {
    findings.push({
      type: 'PASSED',
      category: 'Hardcoded Credentials',
      message: 'No hardcoded credentials detected',
    })
  }

  return findings
}

/**
 * Check debug endpoints have production guards
 */
function checkDebugEndpoints(files: string[]): SecurityFinding[] {
  const findings: SecurityFinding[] = []
  const debugEndpoints: { file: string; line: number; endpoint: string }[] = []

  for (const file of files) {
    if (!file.includes('/api/')) continue

    const content = readFileSafe(file)
    if (!content) continue

    for (const pattern of SECURITY_PATTERNS.debugEndpoints) {
      const matches = content.matchAll(pattern)

      for (const match of matches) {
        const line = getLineNumber(content, match.index!)
        debugEndpoints.push({
          file: path.relative(PROJECT_ROOT, file),
          line,
          endpoint: match[0],
        })

        // Check if file has production guard
        const hasProductionGuard =
          content.includes('NODE_ENV') &&
          content.includes('production') &&
          (content.includes('return') || content.includes('throw'))

        if (!hasProductionGuard) {
          findings.push({
            type: 'FAILED',
            category: 'Debug Endpoints',
            message: `Debug endpoint without production guard: ${match[0]}`,
            file: path.relative(PROJECT_ROOT, file),
            line,
            severity: 'HIGH',
          })
        }
      }
    }
  }

  if (findings.length === 0 && debugEndpoints.length === 0) {
    findings.push({
      type: 'PASSED',
      category: 'Debug Endpoints',
      message: 'No debug endpoints found or all have production guards',
    })
  } else if (findings.length === 0) {
    findings.push({
      type: 'PASSED',
      category: 'Debug Endpoints',
      message: `All ${debugEndpoints.length} debug endpoints have production guards`,
    })
  }

  return findings
}

/**
 * Check for wildcard CORS
 */
function checkCORSConfiguration(files: string[]): SecurityFinding[] {
  const findings: SecurityFinding[] = []

  for (const file of files) {
    const content = readFileSafe(file)
    if (!content) continue

    for (const pattern of SECURITY_PATTERNS.wildcardCors) {
      const matches = content.matchAll(pattern)

      for (const match of matches) {
        const line = getLineNumber(content, match.index!)

        findings.push({
          type: 'FAILED',
          category: 'CORS Configuration',
          message: 'Wildcard CORS detected (*)',
          file: path.relative(PROJECT_ROOT, file),
          line,
          severity: 'HIGH',
        })
      }
    }
  }

  if (findings.length === 0) {
    findings.push({
      type: 'PASSED',
      category: 'CORS Configuration',
      message: 'No wildcard CORS found',
    })
  }

  return findings
}

/**
 * Check for stack traces in production responses
 */
function checkStackTraceExposure(files: string[]): SecurityFinding[] {
  const findings: SecurityFinding[] = []

  for (const file of files) {
    if (!file.includes('/api/')) continue

    const content = readFileSafe(file)
    if (!content) continue

    // Skip if using errorResponse helper
    if (content.includes('errorResponse')) {
      continue
    }

    for (const pattern of SECURITY_PATTERNS.stackTraces) {
      const matches = content.matchAll(pattern)

      for (const match of matches) {
        const line = getLineNumber(content, match.index!)
        const contextStart = Math.max(0, match.index! - 100)
        const contextEnd = Math.min(content.length, match.index! + 100)
        const context = content.substring(contextStart, contextEnd)

        // Check if stack trace is in a response
        const isInResponse =
          context.includes('NextResponse') ||
          context.includes('.json(') ||
          context.includes('return')

        if (isInResponse) {
          findings.push({
            type: 'FAILED',
            category: 'Error Sanitization',
            message: 'Stack trace potentially exposed in API response',
            file: path.relative(PROJECT_ROOT, file),
            line,
            severity: 'HIGH',
          })
        }
      }
    }
  }

  if (findings.length === 0) {
    findings.push({
      type: 'PASSED',
      category: 'Error Sanitization',
      message: 'No exposed stack traces detected',
    })
  }

  return findings
}

/**
 * Check security headers in next.config
 */
function checkSecurityHeaders(): SecurityFinding[] {
  const findings: SecurityFinding[] = []
  const nextConfigPath = path.join(PROJECT_ROOT, 'next.config.ts')
  const content = readFileSafe(nextConfigPath)

  if (!content) {
    findings.push({
      type: 'FAILED',
      category: 'Security Headers',
      message: 'next.config.ts not found',
      severity: 'HIGH',
    })
    return findings
  }

  const requiredHeaders = [
    { name: 'Content-Security-Policy', pattern: /Content-Security-Policy/i },
    { name: 'X-Frame-Options', pattern: /X-Frame-Options/i },
    { name: 'X-Content-Type-Options', pattern: /X-Content-Type-Options/i },
    { name: 'Referrer-Policy', pattern: /Referrer-Policy/i },
  ]

  for (const header of requiredHeaders) {
    if (header.pattern.test(content)) {
      findings.push({
        type: 'PASSED',
        category: 'Security Headers',
        message: `${header.name} configured`,
      })
    } else {
      findings.push({
        type: 'FAILED',
        category: 'Security Headers',
        message: `${header.name} not configured`,
        file: 'next.config.ts',
        severity: 'MEDIUM',
      })
    }
  }

  return findings
}

/**
 * Check environment variables
 */
function checkEnvironmentVariables(): SecurityFinding[] {
  const findings: SecurityFinding[] = []
  const envExamplePath = path.join(PROJECT_ROOT, '.env.example')
  const envExample = readFileSafe(envExamplePath)

  if (!envExample) {
    findings.push({
      type: 'WARNING',
      category: 'Environment Variables',
      message: '.env.example not found',
      severity: 'LOW',
    })
    return findings
  }

  // Check required env vars are documented
  for (const varName of REQUIRED_ENV_VARS) {
    if (envExample.includes(varName)) {
      findings.push({
        type: 'PASSED',
        category: 'Environment Variables',
        message: `${varName} documented in .env.example`,
      })
    } else {
      findings.push({
        type: 'FAILED',
        category: 'Environment Variables',
        message: `${varName} not documented in .env.example`,
        file: '.env.example',
        severity: 'MEDIUM',
      })
    }
  }

  // Check recommended env vars
  for (const varName of RECOMMENDED_ENV_VARS) {
    if (!envExample.includes(varName)) {
      findings.push({
        type: 'WARNING',
        category: 'Environment Variables',
        message: `${varName} not documented (recommended for security features)`,
        file: '.env.example',
        severity: 'LOW',
      })
    }
  }

  return findings
}

/**
 * Check Firebase security rules
 */
function checkFirebaseRules(): SecurityFinding[] {
  const findings: SecurityFinding[] = []

  // Check Firestore rules
  const firestoreRulesPath = path.join(PROJECT_ROOT, 'firestore.rules')
  const firestoreRules = readFileSafe(firestoreRulesPath)

  if (firestoreRules) {
    // Check for authentication requirements
    if (firestoreRules.includes('isAuthenticated()')) {
      findings.push({
        type: 'PASSED',
        category: 'Firebase Rules',
        message: 'Firestore rules enforce authentication',
      })
    }

    // Check for recipe pagination
    if (firestoreRules.includes('request.query.limit')) {
      findings.push({
        type: 'PASSED',
        category: 'Firebase Rules',
        message: 'Recipe pagination enforced in Firestore rules',
      })
    }
  } else {
    findings.push({
      type: 'WARNING',
      category: 'Firebase Rules',
      message: 'firestore.rules not found',
      severity: 'MEDIUM',
    })
  }

  // Check Storage rules
  const storageRulesPath = path.join(PROJECT_ROOT, 'storage.rules')
  const storageRules = readFileSafe(storageRulesPath)

  if (storageRules) {
    // Check for userId in document paths
    if (storageRules.includes('/{userId}/')) {
      findings.push({
        type: 'PASSED',
        category: 'Firebase Rules',
        message: 'Storage rules enforce userId in paths',
      })
    } else {
      findings.push({
        type: 'WARNING',
        category: 'Firebase Rules',
        message: 'Storage rules may not enforce userId in paths',
        file: 'storage.rules',
        severity: 'MEDIUM',
      })
    }
  } else {
    findings.push({
      type: 'WARNING',
      category: 'Firebase Rules',
      message: 'storage.rules not found',
      severity: 'MEDIUM',
    })
  }

  return findings
}

/**
 * Check rate limiting implementation
 */
function checkRateLimiting(files: string[]): SecurityFinding[] {
  const findings: SecurityFinding[] = []
  const rateLimitPath = path.join(PROJECT_ROOT, 'lib', 'rate-limit.ts')
  const rateLimitContent = readFileSafe(rateLimitPath)

  if (rateLimitContent) {
    findings.push({
      type: 'PASSED',
      category: 'Rate Limiting',
      message: 'Rate limiting infrastructure exists',
    })

    // Check for graceful degradation
    if (rateLimitContent.includes('InMemoryRateLimiter')) {
      findings.push({
        type: 'PASSED',
        category: 'Rate Limiting',
        message: 'Rate limiting has graceful degradation (in-memory fallback)',
      })
    }
  } else {
    findings.push({
      type: 'WARNING',
      category: 'Rate Limiting',
      message: 'Rate limiting infrastructure not found',
      severity: 'MEDIUM',
    })
  }

  return findings
}

// ============================================
// REPORT GENERATION
// ============================================

/**
 * Generate and print audit report
 */
function generateReport(report: AuditReport): void {
  console.log('\n' + '='.repeat(80))
  console.log('🔍 SECURITY AUDIT REPORT')
  console.log('='.repeat(80) + '\n')

  // Summary
  console.log('📊 SUMMARY')
  console.log('-'.repeat(80))
  console.log(`Total Checks: ${report.summary.totalChecks}`)
  console.log(`✅ Passed: ${report.summary.passedCount}`)
  console.log(`❌ Failed: ${report.summary.failedCount}`)
  console.log(`⚠️  Warnings: ${report.summary.warningCount}`)
  console.log()

  // Passed checks
  if (report.passed.length > 0) {
    console.log('✅ PASSED CHECKS (' + report.passed.length + ')')
    console.log('-'.repeat(80))
    const groupedPassed = groupByCategory(report.passed)
    for (const [category, findings] of Object.entries(groupedPassed)) {
      console.log(`\n  ${category}:`)
      findings.forEach(f => console.log(`    ✓ ${f.message}`))
    }
    console.log()
  }

  // Failed checks
  if (report.failed.length > 0) {
    console.log('❌ FAILED CHECKS (' + report.failed.length + ')')
    console.log('-'.repeat(80))
    const groupedFailed = groupByCategory(report.failed)
    for (const [category, findings] of Object.entries(groupedFailed)) {
      console.log(`\n  ${category}:`)
      findings.forEach(f => {
        console.log(`    ✗ [${f.severity}] ${f.message}`)
        if (f.file) console.log(`      File: ${f.file}${f.line ? `:${f.line}` : ''}`)
      })
    }
    console.log()
  }

  // Warnings
  if (report.warnings.length > 0) {
    console.log('⚠️  WARNINGS (' + report.warnings.length + ')')
    console.log('-'.repeat(80))
    const groupedWarnings = groupByCategory(report.warnings)
    for (const [category, findings] of Object.entries(groupedWarnings)) {
      console.log(`\n  ${category}:`)
      findings.forEach(f => {
        console.log(`    ⚠ ${f.message}`)
        if (f.file) console.log(`      File: ${f.file}${f.line ? `:${f.line}` : ''}`)
      })
    }
    console.log()
  }

  console.log('='.repeat(80) + '\n')
}

/**
 * Group findings by category
 */
function groupByCategory(findings: SecurityFinding[]): Record<string, SecurityFinding[]> {
  return findings.reduce((acc, finding) => {
    if (!acc[finding.category]) {
      acc[finding.category] = []
    }
    acc[finding.category].push(finding)
    return acc
  }, {} as Record<string, SecurityFinding[]>)
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('🔍 Starting security audit...\n')

  const report: AuditReport = {
    passed: [],
    failed: [],
    warnings: [],
    summary: {
      totalChecks: 0,
      passedCount: 0,
      failedCount: 0,
      warningCount: 0,
    },
  }

  // Get all source files
  const sourceFiles = getAllSourceFiles(PROJECT_ROOT)
  console.log(`📁 Scanning ${sourceFiles.length} source files...\n`)

  // Run all security checks
  const allFindings: SecurityFinding[] = [
    ...checkHardcodedCredentials(sourceFiles),
    ...checkDebugEndpoints(sourceFiles),
    ...checkCORSConfiguration(sourceFiles),
    ...checkStackTraceExposure(sourceFiles),
    ...checkSecurityHeaders(),
    ...checkEnvironmentVariables(),
    ...checkFirebaseRules(),
    ...checkRateLimiting(sourceFiles),
  ]

  // Categorize findings
  for (const finding of allFindings) {
    if (finding.type === 'PASSED') {
      report.passed.push(finding)
    } else if (finding.type === 'FAILED') {
      report.failed.push(finding)
    } else if (finding.type === 'WARNING') {
      report.warnings.push(finding)
    }
  }

  // Calculate summary
  report.summary.totalChecks = allFindings.length
  report.summary.passedCount = report.passed.length
  report.summary.failedCount = report.failed.length
  report.summary.warningCount = report.warnings.length

  // Generate report
  generateReport(report)

  // Determine exit code
  if (report.failed.length > 0) {
    console.log('❌ Security audit failed with critical issues.\n')
    process.exit(1)
  } else if (report.warnings.length > 0) {
    console.log('⚠️  Security audit completed with warnings.\n')
    process.exit(2)
  } else {
    console.log('✅ Security audit passed successfully!\n')
    process.exit(0)
  }
}

// Run the audit
main().catch(error => {
  console.error('❌ Security audit failed with error:', error)
  process.exit(1)
})
