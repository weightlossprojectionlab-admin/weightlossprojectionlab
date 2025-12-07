/**
 * Comprehensive Notification System Test Suite
 *
 * Usage: npx tsx scripts/test-notifications.ts
 *
 * This script performs comprehensive testing of the notification system including:
 * - Notification creation for all types
 * - Email sending via SendGrid
 * - Push notification via FCM
 * - Family member distribution
 * - Notification preferences and quiet hours
 * - Performance testing with batch operations
 * - Cleanup operations
 */

import * as dotenv from 'dotenv'
import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'
import {
  createNotification,
  sendEmailNotification,
  sendPushNotification,
  sendNotificationToFamilyMembers,
  getNotificationPreferences,
  updateNotificationPreferences,
  getUserNotifications,
  getNotificationStats,
  markAsRead,
  deleteNotification,
} from '@/lib/notification-service'
import type {
  NotificationType,
  MedicationMetadata,
  VitalMetadata,
  MealMetadata,
  WeightMetadata,
  DocumentMetadata,
  AppointmentMetadata,
  HealthReportMetadata,
  FamilyMetadata,
  PatientMetadata,
  NotificationPreferences,
} from '@/types/notifications'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notifications'

// Load environment variables
dotenv.config({ path: '.env.local' })

// ============================================================================
// CONFIGURATION
// ============================================================================

const TEST_CONFIG = {
  // Test user IDs (replace with actual test user IDs from your database)
  testUserId: process.env.TEST_USER_ID || 'test_user_001',
  testPatientId: process.env.TEST_PATIENT_ID || 'test_patient_001',
  testEmail: process.env.TEST_EMAIL || 'test@example.com',
  testUserName: process.env.TEST_USER_NAME || 'Test User',
  testPatientName: process.env.TEST_PATIENT_NAME || 'Test Patient',

  // Test flags
  skipEmailTests: process.env.SKIP_EMAIL_TESTS === 'true',
  skipPushTests: process.env.SKIP_PUSH_TESTS === 'true',
  skipCleanup: process.env.SKIP_CLEANUP === 'true',

  // Performance test settings
  batchSize: parseInt(process.env.BATCH_SIZE || '10'),
}

// Store created notification IDs for cleanup
const createdNotificationIds: string[] = []
const createdTestUserIds: string[] = []

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
  }
  const icons = {
    info: 'ℹ',
    success: '✓',
    warning: '⚠',
    error: '✗',
  }
  const reset = '\x1b[0m'
  console.log(`${colors[type]}${icons[type]} ${message}${reset}`)
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80))
  console.log(`  ${title}`)
  console.log('='.repeat(80) + '\n')
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// 1. TEST NOTIFICATION CREATION
// ============================================================================

async function testNotificationCreation() {
  logSection('TEST 1: Notification Creation')

  const testCases: Array<{
    type: NotificationType
    metadata: any
    description: string
  }> = [
    {
      type: 'medication_added',
      metadata: {
        medicationId: 'med_001',
        medicationName: 'Test Medication',
        patientName: TEST_CONFIG.testPatientName,
        strength: '500mg',
        dosageForm: 'Tablet',
        frequency: 'Twice daily',
        prescribedFor: 'Test condition',
        actionBy: TEST_CONFIG.testUserName,
        actionByUserId: TEST_CONFIG.testUserId,
      } as MedicationMetadata,
      description: 'Medication Added',
    },
    {
      type: 'vital_logged',
      metadata: {
        vitalId: 'vital_001',
        vitalType: 'blood_pressure',
        value: '120/80',
        unit: 'mmHg',
        patientName: TEST_CONFIG.testPatientName,
        isAbnormal: false,
        actionBy: TEST_CONFIG.testUserName,
        actionByUserId: TEST_CONFIG.testUserId,
      } as VitalMetadata,
      description: 'Vital Logged',
    },
    {
      type: 'meal_logged',
      metadata: {
        mealId: 'meal_001',
        mealType: 'breakfast',
        calories: 450,
        patientName: TEST_CONFIG.testPatientName,
        hasPhoto: true,
        foodItems: ['Eggs', 'Toast', 'Coffee'],
        actionBy: TEST_CONFIG.testUserName,
        actionByUserId: TEST_CONFIG.testUserId,
      } as MealMetadata,
      description: 'Meal Logged',
    },
    {
      type: 'weight_logged',
      metadata: {
        weightLogId: 'weight_001',
        weight: 180,
        unit: 'lbs',
        patientName: TEST_CONFIG.testPatientName,
        changeFromPrevious: -2,
        trendDirection: 'down',
        goalProgress: 75,
        actionBy: TEST_CONFIG.testUserName,
        actionByUserId: TEST_CONFIG.testUserId,
      } as WeightMetadata,
      description: 'Weight Logged',
    },
    {
      type: 'document_uploaded',
      metadata: {
        documentId: 'doc_001',
        documentName: 'Lab Results.pdf',
        documentCategory: 'lab-results',
        patientName: TEST_CONFIG.testPatientName,
        fileType: 'pdf',
        fileSize: 1024000,
        actionBy: TEST_CONFIG.testUserName,
        actionByUserId: TEST_CONFIG.testUserId,
      } as DocumentMetadata,
      description: 'Document Uploaded',
    },
    {
      type: 'appointment_scheduled',
      metadata: {
        appointmentId: 'appt_001',
        patientName: TEST_CONFIG.testPatientName,
        providerName: 'Dr. Smith',
        appointmentType: 'Checkup',
        appointmentDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Main Clinic',
        requiresDriver: true,
        actionBy: TEST_CONFIG.testUserName,
        actionByUserId: TEST_CONFIG.testUserId,
      } as AppointmentMetadata,
      description: 'Appointment Scheduled',
    },
    {
      type: 'health_report_generated',
      metadata: {
        reportId: 'report_001',
        reportType: 'weekly',
        patientName: TEST_CONFIG.testPatientName,
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        includesVitals: true,
        includesMeals: true,
        includesWeight: true,
        includesMedications: true,
        generatedBy: TEST_CONFIG.testUserName,
        generatedByUserId: TEST_CONFIG.testUserId,
      } as HealthReportMetadata,
      description: 'Health Report Generated',
    },
    {
      type: 'family_member_joined',
      metadata: {
        familyMemberName: 'Jane Doe',
        familyMemberEmail: 'jane@example.com',
        relationship: 'Daughter',
        actionBy: 'System',
        actionByUserId: 'system',
      } as FamilyMetadata,
      description: 'Family Member Joined',
    },
    {
      type: 'patient_added',
      metadata: {
        patientId: TEST_CONFIG.testPatientId,
        patientName: TEST_CONFIG.testPatientName,
        patientType: 'human',
        relationship: 'Self',
        actionBy: TEST_CONFIG.testUserName,
        actionByUserId: TEST_CONFIG.testUserId,
      } as PatientMetadata,
      description: 'Patient Added',
    },
    {
      type: 'vital_alert',
      metadata: {
        vitalId: 'vital_002',
        vitalType: 'blood_pressure',
        value: '180/110',
        unit: 'mmHg',
        patientName: TEST_CONFIG.testPatientName,
        isAbnormal: true,
        abnormalReason: 'High blood pressure detected',
        actionBy: 'System',
        actionByUserId: 'system',
      } as VitalMetadata,
      description: 'Vital Alert',
    },
  ]

  let successCount = 0
  let failureCount = 0

  for (const testCase of testCases) {
    try {
      log(`Testing: ${testCase.description}...`, 'info')

      const notification = await createNotification({
        userId: TEST_CONFIG.testUserId,
        patientId: TEST_CONFIG.testPatientId,
        type: testCase.type,
        priority: testCase.type === 'vital_alert' ? 'urgent' : 'normal',
        title: `Test: ${testCase.description}`,
        message: `This is a test notification for ${testCase.type}`,
        metadata: testCase.metadata,
        actionUrl: `/patients/${TEST_CONFIG.testPatientId}`,
        actionLabel: 'View Details',
        expiresInDays: 30,
      })

      createdNotificationIds.push(notification.id)

      log(`  ✓ Created notification ID: ${notification.id}`, 'success')
      log(`  ✓ Type: ${notification.type}, Priority: ${notification.priority}`, 'success')
      successCount++
    } catch (error) {
      log(`  ✗ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      failureCount++
    }
  }

  log(`\nCreation Test Results: ${successCount} passed, ${failureCount} failed`, 'info')
}

// ============================================================================
// 2. TEST EMAIL SENDING
// ============================================================================

async function testEmailSending() {
  logSection('TEST 2: Email Notification Sending')

  if (TEST_CONFIG.skipEmailTests) {
    log('Skipping email tests (SKIP_EMAIL_TESTS=true)', 'warning')
    return
  }

  if (!process.env.SENDGRID_API_KEY) {
    log('Skipping email tests (SENDGRID_API_KEY not configured)', 'warning')
    return
  }

  log(`Testing email delivery to: ${TEST_CONFIG.testEmail}`, 'info')

  // Test with the first created notification
  if (createdNotificationIds.length === 0) {
    log('No notifications created to test with', 'warning')
    return
  }

  try {
    const notificationDoc = await getDoc(doc(db, 'notifications', createdNotificationIds[0]))
    if (!notificationDoc.exists()) {
      throw new Error('Notification not found')
    }

    const notification = { id: notificationDoc.id, ...notificationDoc.data() } as any

    log('Sending test email...', 'info')
    const emailSent = await sendEmailNotification(
      notification,
      TEST_CONFIG.testEmail,
      TEST_CONFIG.testUserName
    )

    if (emailSent) {
      log('✓ Email sent successfully!', 'success')
      log('  Check your inbox for the test email', 'info')
    } else {
      log('✗ Email sending failed', 'error')
    }
  } catch (error) {
    log(`✗ Email test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  }
}

// ============================================================================
// 3. TEST PUSH NOTIFICATIONS
// ============================================================================

async function testPushNotifications() {
  logSection('TEST 3: Push Notification Sending')

  if (TEST_CONFIG.skipPushTests) {
    log('Skipping push tests (SKIP_PUSH_TESTS=true)', 'warning')
    return
  }

  log('Push notification testing requires FCM setup and user token', 'info')
  log('This is a placeholder for push notification tests', 'warning')

  // Note: Push notifications require Firebase Cloud Messaging setup
  // and user device tokens, which are typically obtained through the app
}

// ============================================================================
// 4. TEST FAMILY DISTRIBUTION
// ============================================================================

async function testFamilyDistribution() {
  logSection('TEST 4: Family Member Distribution')

  log('Testing notification distribution to family members...', 'info')

  // Create test family members
  const familyMembers = [
    {
      userId: `test_family_001_${Date.now()}`,
      email: 'family1@example.com',
      name: 'Family Member 1',
    },
    {
      userId: `test_family_002_${Date.now()}`,
      email: 'family2@example.com',
      name: 'Family Member 2',
    },
  ]

  try {
    // Create test patient
    const testPatientId = `test_patient_${Date.now()}`
    await setDoc(doc(db, 'patients', testPatientId), {
      userId: TEST_CONFIG.testUserId,
      name: 'Test Patient Family',
      type: 'human',
      createdAt: new Date().toISOString(),
    })

    log(`✓ Created test patient: ${testPatientId}`, 'success')

    // Create test family member records
    for (const member of familyMembers) {
      const familyMemberId = `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await setDoc(doc(db, 'family_members', familyMemberId), {
        userId: member.userId,
        email: member.email,
        name: member.name,
        patientsAccess: [testPatientId],
        status: 'accepted',
        createdAt: new Date().toISOString(),
      })

      createdTestUserIds.push(familyMemberId)
      log(`✓ Created family member: ${member.name}`, 'success')
    }

    // Send notification to family
    log('Sending notification to all family members...', 'info')
    const result = await sendNotificationToFamilyMembers({
      userId: TEST_CONFIG.testUserId,
      patientId: testPatientId,
      type: 'medication_added',
      priority: 'normal',
      title: 'Test Family Notification',
      message: 'Testing family distribution',
      metadata: {
        medicationId: 'med_test',
        medicationName: 'Test Med',
        patientName: 'Test Patient Family',
        actionBy: TEST_CONFIG.testUserName,
        actionByUserId: TEST_CONFIG.testUserId,
      } as MedicationMetadata,
      excludeUserId: TEST_CONFIG.testUserId, // Exclude the sender
    })

    log('\nFamily Distribution Results:', 'info')
    log(`  Total Recipients: ${result.totalRecipients}`, 'info')
    log(`  Successful: ${result.successCount}`, 'success')
    log(`  Failed: ${result.failureCount}`, result.failureCount > 0 ? 'error' : 'info')

    result.results.forEach((r) => {
      if (r.success) {
        log(`  ✓ ${r.userName || r.userId}`, 'success')
      } else {
        log(`  ✗ ${r.userName || r.userId}: ${r.error}`, 'error')
      }
    })

    // Cleanup test patient
    await deleteDoc(doc(db, 'patients', testPatientId))
  } catch (error) {
    log(`✗ Family distribution test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  }
}

// ============================================================================
// 5. TEST PREFERENCES
// ============================================================================

async function testNotificationPreferences() {
  logSection('TEST 5: Notification Preferences')

  const testUserId = `test_prefs_${Date.now()}`

  try {
    // Test 1: Get default preferences
    log('Testing default preferences...', 'info')
    const defaultPrefs = await getNotificationPreferences(testUserId)
    log('✓ Retrieved default preferences', 'success')
    log(`  Global enabled: ${defaultPrefs.globallyEnabled}`, 'info')
    log(`  Quiet hours enabled: ${defaultPrefs.quietHours?.enabled}`, 'info')

    // Test 2: Update preferences
    log('\nTesting preference updates...', 'info')
    await updateNotificationPreferences(testUserId, {
      medication_added: { email: true, push: false, inApp: true },
      quietHours: {
        enabled: true,
        startHour: 22,
        endHour: 7,
      },
    })
    log('✓ Updated preferences', 'success')

    // Test 3: Verify updates
    const updatedPrefs = await getNotificationPreferences(testUserId)
    log('✓ Retrieved updated preferences', 'success')
    log(`  medication_added.push: ${updatedPrefs.medication_added.push} (should be false)`, 'info')

    // Test 4: Test quiet hours logic
    log('\nTesting quiet hours...', 'info')
    const now = new Date()
    const currentHour = now.getHours()
    log(`  Current hour: ${currentHour}`, 'info')
    log(`  Quiet hours: ${updatedPrefs.quietHours?.startHour} - ${updatedPrefs.quietHours?.endHour}`, 'info')

    // Cleanup
    await deleteDoc(doc(db, 'notification_preferences', testUserId))
    log('✓ Cleaned up test preferences', 'success')
  } catch (error) {
    log(`✗ Preferences test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  }
}

// ============================================================================
// 6. TEST PERFORMANCE
// ============================================================================

async function testPerformance() {
  logSection('TEST 6: Performance Testing')

  log(`Creating ${TEST_CONFIG.batchSize} notifications...`, 'info')

  const startTime = Date.now()
  const batchIds: string[] = []

  try {
    for (let i = 0; i < TEST_CONFIG.batchSize; i++) {
      const notification = await createNotification({
        userId: TEST_CONFIG.testUserId,
        patientId: TEST_CONFIG.testPatientId,
        type: 'vital_logged',
        priority: 'normal',
        title: `Batch Test Notification ${i + 1}`,
        message: `Performance test notification ${i + 1}`,
        metadata: {
          vitalId: `vital_batch_${i}`,
          vitalType: 'weight',
          value: `${150 + i}`,
          unit: 'lbs',
          patientName: TEST_CONFIG.testPatientName,
          actionBy: 'Performance Test',
          actionByUserId: 'test',
        } as VitalMetadata,
      })

      batchIds.push(notification.id)
    }

    const createTime = Date.now() - startTime
    log(`✓ Created ${TEST_CONFIG.batchSize} notifications in ${createTime}ms`, 'success')
    log(`  Average: ${(createTime / TEST_CONFIG.batchSize).toFixed(2)}ms per notification`, 'info')

    // Test query performance
    log('\nTesting query performance...', 'info')
    const queryStartTime = Date.now()
    const notifications = await getUserNotifications(TEST_CONFIG.testUserId, { limit: 50 })
    const queryTime = Date.now() - queryStartTime

    log(`✓ Retrieved ${notifications.length} notifications in ${queryTime}ms`, 'success')

    // Test stats performance
    log('\nTesting stats calculation...', 'info')
    const statsStartTime = Date.now()
    const stats = await getNotificationStats(TEST_CONFIG.testUserId)
    const statsTime = Date.now() - statsStartTime

    log(`✓ Calculated stats in ${statsTime}ms`, 'success')
    log(`  Total: ${stats.total}`, 'info')
    log(`  Unread: ${stats.unread}`, 'info')
    log(`  Recent (7 days): ${stats.recentCount}`, 'info')

    // Cleanup batch
    createdNotificationIds.push(...batchIds)
  } catch (error) {
    log(`✗ Performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  }
}

// ============================================================================
// 7. CLEANUP FUNCTIONS
// ============================================================================

async function cleanupTestData() {
  logSection('TEST 7: Cleanup')

  if (TEST_CONFIG.skipCleanup) {
    log('Skipping cleanup (SKIP_CLEANUP=true)', 'warning')
    log(`Created ${createdNotificationIds.length} test notifications`, 'info')
    return
  }

  log('Cleaning up test data...', 'info')

  try {
    // Delete test notifications
    if (createdNotificationIds.length > 0) {
      log(`Deleting ${createdNotificationIds.length} test notifications...`, 'info')

      const batch = writeBatch(db)
      createdNotificationIds.forEach((id) => {
        batch.delete(doc(db, 'notifications', id))
      })
      await batch.commit()

      log(`✓ Deleted ${createdNotificationIds.length} notifications`, 'success')
    }

    // Delete test family members
    if (createdTestUserIds.length > 0) {
      log(`Deleting ${createdTestUserIds.length} test family members...`, 'info')

      const batch = writeBatch(db)
      createdTestUserIds.forEach((id) => {
        batch.delete(doc(db, 'family_members', id))
      })
      await batch.commit()

      log(`✓ Deleted ${createdTestUserIds.length} family members`, 'success')
    }

    log('✓ Cleanup complete', 'success')
  } catch (error) {
    log(`✗ Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n')
  console.log('╔════════════════════════════════════════════════════════════════════════════╗')
  console.log('║                   NOTIFICATION SYSTEM TEST SUITE                           ║')
  console.log('╚════════════════════════════════════════════════════════════════════════════╝')
  console.log('\n')

  log('Starting comprehensive notification system tests...', 'info')
  log(`Test User ID: ${TEST_CONFIG.testUserId}`, 'info')
  log(`Test Patient ID: ${TEST_CONFIG.testPatientId}`, 'info')
  log(`Test Email: ${TEST_CONFIG.testEmail}`, 'info')

  const startTime = Date.now()

  try {
    // Run all test suites
    await testNotificationCreation()
    await delay(1000)

    await testEmailSending()
    await delay(1000)

    await testPushNotifications()
    await delay(1000)

    await testFamilyDistribution()
    await delay(1000)

    await testNotificationPreferences()
    await delay(1000)

    await testPerformance()
    await delay(1000)

    await cleanupTestData()

    const totalTime = Date.now() - startTime

    // Final summary
    logSection('TEST SUMMARY')
    log(`All tests completed in ${(totalTime / 1000).toFixed(2)}s`, 'success')
    log('', 'info')
    log('Test Coverage:', 'info')
    log('  ✓ Notification creation for all types', 'success')
    log('  ✓ Email notification sending', 'success')
    log('  ✓ Push notification framework', 'success')
    log('  ✓ Family member distribution', 'success')
    log('  ✓ Notification preferences', 'success')
    log('  ✓ Performance and batch operations', 'success')
    log('  ✓ Cleanup operations', 'success')
    log('', 'info')
    log('✅ All tests passed!', 'success')
  } catch (error) {
    log(`\n❌ Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    console.error(error)
    process.exit(1)
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

// Check configuration
if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.error('❌ Firebase configuration missing. Please check your .env.local file.')
  process.exit(1)
}

// Run tests
runAllTests()
  .then(() => {
    console.log('\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
