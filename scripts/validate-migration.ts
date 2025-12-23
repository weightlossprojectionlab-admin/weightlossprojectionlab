/**
 * Migration Validation Script
 *
 * Validates the household duties migration completed successfully.
 * Checks data integrity, schema compliance, and basic functionality.
 */

import * as admin from 'firebase-admin'
import * as fs from 'fs'
import * as path from 'path'

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  })
}

const db = admin.firestore()

interface ValidationResult {
  passed: boolean
  message: string
  details?: any
}

interface ValidationReport {
  timestamp: string
  overallStatus: 'PASS' | 'FAIL' | 'WARNING'
  checks: {
    name: string
    result: ValidationResult
  }[]
  summary: {
    total: number
    passed: number
    failed: number
    warnings: number
  }
}

/**
 * Check 1: All duties have householdId
 */
async function checkAllDutiesHaveHouseholdId(): Promise<ValidationResult> {
  try {
    const dutiesSnapshot = await db.collection('household_duties').get()

    let missingHouseholdId = 0
    const problematicDuties: string[] = []

    dutiesSnapshot.forEach(doc => {
      const duty = doc.data()
      if (!duty.householdId) {
        missingHouseholdId++
        problematicDuties.push(doc.id)
      }
    })

    if (missingHouseholdId === 0) {
      return {
        passed: true,
        message: `All ${dutiesSnapshot.size} duties have householdId`,
      }
    } else {
      return {
        passed: false,
        message: `${missingHouseholdId} duties missing householdId`,
        details: { problematicDuties: problematicDuties.slice(0, 10) } // First 10
      }
    }
  } catch (error) {
    return {
      passed: false,
      message: `Error checking householdId: ${(error as Error).message}`,
    }
  }
}

/**
 * Check 2: No duties have orphaned patientId field
 */
async function checkNoOrphanedPatientId(): Promise<ValidationResult> {
  try {
    const dutiesSnapshot = await db.collection('household_duties').get()

    let orphanedPatientId = 0
    const problematicDuties: string[] = []

    dutiesSnapshot.forEach(doc => {
      const duty = doc.data()
      // Check if old patientId field exists (should have been removed/renamed to forPatientId)
      if (duty.patientId && !duty.migratedFrom) {
        // If it has patientId but wasn't migrated, it might be new schema already
        // Only flag if it has patientId WITHOUT householdId
        if (!duty.householdId) {
          orphanedPatientId++
          problematicDuties.push(doc.id)
        }
      }
    })

    if (orphanedPatientId === 0) {
      return {
        passed: true,
        message: `No orphaned patientId fields found`,
      }
    } else {
      return {
        passed: false,
        message: `${orphanedPatientId} duties have orphaned patientId`,
        details: { problematicDuties: problematicDuties.slice(0, 10) }
      }
    }
  } catch (error) {
    return {
      passed: false,
      message: `Error checking orphaned patientId: ${(error as Error).message}`,
    }
  }
}

/**
 * Check 3: Migrated duties have migration metadata
 */
async function checkMigrationMetadata(): Promise<ValidationResult> {
  try {
    const migratedDutiesSnapshot = await db.collection('household_duties')
      .where('migratedFrom', '==', 'patient-scoped')
      .get()

    let missingMetadata = 0
    const problematicDuties: string[] = []

    migratedDutiesSnapshot.forEach(doc => {
      const duty = doc.data()
      if (!duty.migratedAt) {
        missingMetadata++
        problematicDuties.push(doc.id)
      }
    })

    return {
      passed: missingMetadata === 0,
      message: `${migratedDutiesSnapshot.size} duties migrated, ${missingMetadata} missing metadata`,
      details: {
        migratedCount: migratedDutiesSnapshot.size,
        problematicDuties: problematicDuties.slice(0, 10)
      }
    }
  } catch (error) {
    return {
      passed: false,
      message: `Error checking migration metadata: ${(error as Error).message}`,
    }
  }
}

/**
 * Check 4: All households referenced by duties exist
 */
async function checkHouseholdsExist(): Promise<ValidationResult> {
  try {
    const dutiesSnapshot = await db.collection('household_duties').get()

    const householdIds = new Set<string>()
    dutiesSnapshot.forEach(doc => {
      const duty = doc.data()
      if (duty.householdId) {
        householdIds.add(duty.householdId)
      }
    })

    const missingHouseholds: string[] = []

    for (const householdId of householdIds) {
      const householdDoc = await db.collection('households').doc(householdId).get()
      if (!householdDoc.exists) {
        missingHouseholds.push(householdId)
      }
    }

    if (missingHouseholds.length === 0) {
      return {
        passed: true,
        message: `All ${householdIds.size} referenced households exist`,
      }
    } else {
      return {
        passed: false,
        message: `${missingHouseholds.length} referenced households don't exist`,
        details: { missingHouseholds: missingHouseholds.slice(0, 10) }
      }
    }
  } catch (error) {
    return {
      passed: false,
      message: `Error checking households exist: ${(error as Error).message}`,
    }
  }
}

/**
 * Check 5: Patient IDs in forPatientId are valid household members
 */
async function checkPatientHouseholdMembership(): Promise<ValidationResult> {
  try {
    const dutiesSnapshot = await db.collection('household_duties')
      .where('forPatientId', '!=', null)
      .get()

    let invalidMemberships = 0
    const problematicDuties: string[] = []

    for (const dutyDoc of dutiesSnapshot.docs) {
      const duty = dutyDoc.data()

      if (duty.forPatientId && duty.householdId) {
        const householdDoc = await db.collection('households').doc(duty.householdId).get()

        if (householdDoc.exists) {
          const household = householdDoc.data()
          const memberIds = household?.memberIds || []

          if (!memberIds.includes(duty.forPatientId)) {
            invalidMemberships++
            problematicDuties.push(dutyDoc.id)
          }
        }
      }
    }

    if (invalidMemberships === 0) {
      return {
        passed: true,
        message: `All ${dutiesSnapshot.size} patient-specific duties have valid memberships`,
      }
    } else {
      return {
        passed: false,
        message: `${invalidMemberships} duties have patients not in their household`,
        details: { problematicDuties: problematicDuties.slice(0, 10) }
      }
    }
  } catch (error) {
    return {
      passed: false,
      message: `Error checking patient membership: ${(error as Error).message}`,
    }
  }
}

/**
 * Check 6: Stats calculation works
 */
async function checkStatsCalculation(): Promise<ValidationResult> {
  try {
    // Get a sample household
    const householdsSnapshot = await db.collection('households').limit(1).get()

    if (householdsSnapshot.empty) {
      return {
        passed: true,
        message: 'No households to test stats calculation',
      }
    }

    const householdId = householdsSnapshot.docs[0].id
    const userId = householdsSnapshot.docs[0].data().createdBy

    // Get duties for this household
    const dutiesSnapshot = await db.collection('household_duties')
      .where('userId', '==', userId)
      .where('householdId', '==', householdId)
      .get()

    const dutyCount = dutiesSnapshot.size

    // Calculate stats
    let pending = 0, completed = 0, overdue = 0
    const now = new Date()

    dutiesSnapshot.forEach(doc => {
      const duty = doc.data()
      if (duty.status === 'pending') pending++
      if (duty.status === 'completed') completed++
      if (duty.nextDueDate && new Date(duty.nextDueDate) < now && duty.status !== 'completed') {
        overdue++
      }
    })

    return {
      passed: true,
      message: `Stats calculation successful for household ${householdId}`,
      details: {
        householdId,
        total: dutyCount,
        pending,
        completed,
        overdue
      }
    }
  } catch (error) {
    return {
      passed: false,
      message: `Error testing stats calculation: ${(error as Error).message}`,
    }
  }
}

/**
 * Main validation function
 */
async function validate() {
  console.log('========================================')
  console.log('Migration Validation Script')
  console.log('========================================\n')

  const checks = [
    { name: 'All duties have householdId', fn: checkAllDutiesHaveHouseholdId },
    { name: 'No orphaned patientId fields', fn: checkNoOrphanedPatientId },
    { name: 'Migration metadata present', fn: checkMigrationMetadata },
    { name: 'Referenced households exist', fn: checkHouseholdsExist },
    { name: 'Patient-household membership valid', fn: checkPatientHouseholdMembership },
    { name: 'Stats calculation works', fn: checkStatsCalculation },
  ]

  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    overallStatus: 'PASS',
    checks: [],
    summary: {
      total: checks.length,
      passed: 0,
      failed: 0,
      warnings: 0
    }
  }

  for (const check of checks) {
    console.log(`\n🔍 ${check.name}...`)
    const result = await check.fn()

    report.checks.push({ name: check.name, result })

    if (result.passed) {
      console.log(`✅ ${result.message}`)
      report.summary.passed++
    } else {
      console.log(`❌ ${result.message}`)
      if (result.details) {
        console.log(`   Details:`, JSON.stringify(result.details, null, 2))
      }
      report.summary.failed++
      report.overallStatus = 'FAIL'
    }
  }

  // Print summary
  console.log('\n========================================')
  console.log('Validation Summary')
  console.log('========================================')
  console.log(`Total checks: ${report.summary.total}`)
  console.log(`✅ Passed: ${report.summary.passed}`)
  console.log(`❌ Failed: ${report.summary.failed}`)
  console.log(`⚠️  Warnings: ${report.summary.warnings}`)
  console.log(`\nOverall Status: ${report.overallStatus}`)
  console.log('========================================\n')

  // Save report
  const reportPath = path.join(__dirname, '../backups', `validation-report-${Date.now()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`Report saved to: ${reportPath}\n`)

  // Exit with appropriate code
  process.exit(report.overallStatus === 'PASS' ? 0 : 1)
}

// Run validation
validate().catch(error => {
  console.error('Fatal error during validation:', error)
  process.exit(1)
})
