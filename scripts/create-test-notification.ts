/**
 * Quick Test Notification Creator
 *
 * Usage: npx tsx scripts/create-test-notification.ts [type] [userId] [patientId]
 *
 * Examples:
 *   npx tsx scripts/create-test-notification.ts medication_added user123 patient456
 *   npx tsx scripts/create-test-notification.ts vital_alert user123 patient456
 *   npx tsx scripts/create-test-notification.ts
 *
 * If no arguments provided, will use environment variables or prompt for input.
 */

import * as dotenv from 'dotenv'
import * as readline from 'readline'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import {
  createNotification,
  sendEmailNotification,
  sendNotificationToFamilyMembers,
} from '@/lib/notification-service'
import type {
  NotificationType,
  MedicationMetadata,
  VitalMetadata,
  MealMetadata,
  WeightMetadata,
  DocumentMetadata,
  AppointmentMetadata,
} from '@/types/notifications'

// Load environment variables
dotenv.config({ path: '.env.local' })

// ============================================================================
// CONFIGURATION
// ============================================================================

const NOTIFICATION_TYPES: NotificationType[] = [
  'medication_added',
  'medication_updated',
  'medication_deleted',
  'vital_logged',
  'meal_logged',
  'weight_logged',
  'document_uploaded',
  'appointment_scheduled',
  'appointment_updated',
  'appointment_cancelled',
  'health_report_generated',
  'family_member_invited',
  'family_member_joined',
  'patient_added',
  'vital_alert',
  'medication_reminder',
  'appointment_reminder',
]

// ============================================================================
// SAMPLE METADATA GENERATORS
// ============================================================================

function generateSampleMetadata(type: NotificationType, patientName: string, userName: string, userId: string): any {
  const now = new Date()

  switch (type) {
    case 'medication_added':
    case 'medication_updated':
    case 'medication_deleted':
    case 'medication_reminder':
      return {
        medicationId: `med_${Date.now()}`,
        medicationName: 'Sample Medication',
        patientName,
        strength: '500mg',
        dosageForm: 'Tablet',
        frequency: 'Twice daily',
        prescribedFor: 'Sample condition',
        actionBy: userName,
        actionByUserId: userId,
      } as MedicationMetadata

    case 'vital_logged':
    case 'vital_alert':
      return {
        vitalId: `vital_${Date.now()}`,
        vitalType: type === 'vital_alert' ? 'blood_pressure' : 'weight',
        value: type === 'vital_alert' ? '180/110' : '175 lbs',
        unit: type === 'vital_alert' ? 'mmHg' : 'lbs',
        patientName,
        isAbnormal: type === 'vital_alert',
        abnormalReason: type === 'vital_alert' ? 'High blood pressure detected' : undefined,
        actionBy: userName,
        actionByUserId: userId,
      } as VitalMetadata

    case 'meal_logged':
      return {
        mealId: `meal_${Date.now()}`,
        mealType: 'lunch',
        calories: 650,
        patientName,
        hasPhoto: true,
        foodItems: ['Grilled Chicken', 'Rice', 'Vegetables'],
        actionBy: userName,
        actionByUserId: userId,
      } as MealMetadata

    case 'weight_logged':
      return {
        weightLogId: `weight_${Date.now()}`,
        weight: 175,
        unit: 'lbs',
        patientName,
        changeFromPrevious: -2.5,
        trendDirection: 'down',
        goalProgress: 68,
        actionBy: userName,
        actionByUserId: userId,
      } as WeightMetadata

    case 'document_uploaded':
      return {
        documentId: `doc_${Date.now()}`,
        documentName: 'Lab Results - Blood Work.pdf',
        documentCategory: 'lab-results',
        patientName,
        fileType: 'pdf',
        fileSize: 2048000,
        actionBy: userName,
        actionByUserId: userId,
      } as DocumentMetadata

    case 'appointment_scheduled':
    case 'appointment_updated':
    case 'appointment_cancelled':
    case 'appointment_reminder':
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      return {
        appointmentId: `appt_${Date.now()}`,
        patientName,
        providerName: 'Dr. Johnson',
        appointmentType: 'Annual Checkup',
        appointmentDateTime: futureDate.toISOString(),
        location: 'Main Medical Center',
        requiresDriver: true,
        actionBy: userName,
        actionByUserId: userId,
        reason: type === 'appointment_cancelled' ? 'Schedule conflict' : undefined,
      } as AppointmentMetadata

    case 'health_report_generated':
      return {
        reportId: `report_${Date.now()}`,
        reportType: 'weekly',
        patientName,
        dateRange: {
          start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: now.toISOString(),
        },
        includesVitals: true,
        includesMeals: true,
        includesWeight: true,
        includesMedications: true,
        generatedBy: userName,
        generatedByUserId: userId,
      }

    case 'family_member_invited':
    case 'family_member_joined':
      return {
        familyMemberName: 'John Doe',
        familyMemberEmail: 'john@example.com',
        relationship: 'Son',
        actionBy: userName,
        actionByUserId: userId,
      }

    case 'patient_added':
      return {
        patientId: `patient_${Date.now()}`,
        patientName,
        patientType: 'human',
        relationship: 'Parent',
        actionBy: userName,
        actionByUserId: userId,
      }

    default:
      return {
        patientName,
        actionBy: userName,
        actionByUserId: userId,
      }
  }
}

function getNotificationTitle(type: NotificationType, patientName: string): string {
  const titles: Record<NotificationType, string> = {
    medication_added: `Medication Added for ${patientName}`,
    medication_updated: `Medication Updated for ${patientName}`,
    medication_deleted: `Medication Removed for ${patientName}`,
    vital_logged: `New Vital Logged for ${patientName}`,
    meal_logged: `Meal Logged for ${patientName}`,
    weight_logged: `Weight Updated for ${patientName}`,
    document_uploaded: `New Document for ${patientName}`,
    appointment_scheduled: `Appointment Scheduled for ${patientName}`,
    appointment_updated: `Appointment Updated for ${patientName}`,
    appointment_cancelled: `Appointment Cancelled for ${patientName}`,
    health_report_generated: `Health Report Ready for ${patientName}`,
    family_member_invited: 'New Family Member Invitation',
    family_member_joined: 'Family Member Joined',
    patient_added: 'New Patient Added',
    vital_alert: `⚠️ Health Alert for ${patientName}`,
    medication_reminder: `Medication Reminder for ${patientName}`,
    appointment_reminder: `Appointment Reminder for ${patientName}`,
  }

  return titles[type] || `Notification for ${patientName}`
}

function getNotificationMessage(type: NotificationType, patientName: string): string {
  const messages: Record<NotificationType, string> = {
    medication_added: `A new medication has been added to ${patientName}'s profile.`,
    medication_updated: `Medication information has been updated for ${patientName}.`,
    medication_deleted: `A medication has been removed from ${patientName}'s profile.`,
    vital_logged: `A new vital sign has been recorded for ${patientName}.`,
    meal_logged: `A new meal has been logged for ${patientName}.`,
    weight_logged: `Weight has been updated for ${patientName}.`,
    document_uploaded: `A new document has been uploaded to ${patientName}'s records.`,
    appointment_scheduled: `A new appointment has been scheduled for ${patientName}.`,
    appointment_updated: `An appointment has been updated for ${patientName}.`,
    appointment_cancelled: `An appointment has been cancelled for ${patientName}.`,
    health_report_generated: `A new health report is ready for ${patientName}.`,
    family_member_invited: 'A new family member has been invited to join.',
    family_member_joined: 'A family member has accepted the invitation.',
    patient_added: 'A new patient has been added to your family.',
    vital_alert: `⚠️ ALERT: Abnormal vital signs detected for ${patientName}. Please review immediately.`,
    medication_reminder: `Time for ${patientName} to take their medication.`,
    appointment_reminder: `${patientName} has an upcoming appointment.`,
  }

  return messages[type] || `New notification for ${patientName}.`
}

function getPriority(type: NotificationType): 'low' | 'normal' | 'high' | 'urgent' {
  const urgentTypes: NotificationType[] = ['vital_alert']
  const highTypes: NotificationType[] = ['appointment_reminder', 'medication_reminder', 'appointment_cancelled']

  if (urgentTypes.includes(type)) return 'urgent'
  if (highTypes.includes(type)) return 'high'
  return 'normal'
}

// ============================================================================
// INTERACTIVE PROMPTS
// ============================================================================

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

function question(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve))
}

async function promptForInput(): Promise<{ type: NotificationType; userId: string; patientId: string }> {
  const rl = createReadlineInterface()

  try {
    console.log('\n=== Create Test Notification ===\n')

    // Show available types
    console.log('Available notification types:')
    NOTIFICATION_TYPES.forEach((type, index) => {
      console.log(`  ${index + 1}. ${type}`)
    })
    console.log('')

    const typeInput = await question(rl, 'Select notification type (number or name): ')
    const typeIndex = parseInt(typeInput) - 1
    const type = isNaN(typeIndex) ? typeInput as NotificationType : NOTIFICATION_TYPES[typeIndex]

    if (!NOTIFICATION_TYPES.includes(type)) {
      throw new Error(`Invalid notification type: ${type}`)
    }

    const userId = await question(rl, 'Enter user ID (or press Enter for default): ') ||
                   process.env.TEST_USER_ID || 'test_user_001'

    const patientId = await question(rl, 'Enter patient ID (or press Enter for default): ') ||
                      process.env.TEST_PATIENT_ID || 'test_patient_001'

    return { type, userId, patientId }
  } finally {
    rl.close()
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function createTestNotification() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════╗')
  console.log('║          Quick Test Notification Creator                             ║')
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n')

  try {
    // Get parameters from command line or prompt
    let type: NotificationType
    let userId: string
    let patientId: string

    if (process.argv.length >= 4) {
      // Use command line arguments
      type = process.argv[2] as NotificationType
      userId = process.argv[3]
      patientId = process.argv[4] || userId

      if (!NOTIFICATION_TYPES.includes(type)) {
        console.error(`❌ Invalid notification type: ${type}`)
        console.error(`\nValid types: ${NOTIFICATION_TYPES.join(', ')}`)
        process.exit(1)
      }
    } else {
      // Interactive mode
      const input = await promptForInput()
      type = input.type
      userId = input.userId
      patientId = input.patientId
    }

    console.log('\nConfiguration:')
    console.log(`  Type: ${type}`)
    console.log(`  User ID: ${userId}`)
    console.log(`  Patient ID: ${patientId}`)

    // Get user and patient info
    const userDoc = await getDoc(doc(db, 'users', userId))
    const patientDoc = await getDoc(doc(db, 'patients', patientId))

    const userName = userDoc.exists() ? userDoc.data().name || userDoc.data().email : 'Test User'
    const patientName = patientDoc.exists() ? patientDoc.data().name : 'Test Patient'

    console.log(`  User Name: ${userName}`)
    console.log(`  Patient Name: ${patientName}`)

    // Generate metadata
    const metadata = generateSampleMetadata(type, patientName, userName, userId)
    const title = getNotificationTitle(type, patientName)
    const message = getNotificationMessage(type, patientName)
    const priority = getPriority(type)

    console.log('\n📝 Creating notification...')

    // Create notification
    const notification = await createNotification({
      userId,
      patientId,
      type,
      priority,
      title,
      message,
      metadata,
      actionUrl: `/patients/${patientId}`,
      actionLabel: 'View Details',
      expiresInDays: 30,
    })

    console.log(`\n✅ Notification created successfully!`)
    console.log(`\nNotification ID: ${notification.id}`)
    console.log(`Priority: ${notification.priority}`)
    console.log(`Status: ${notification.status}`)
    console.log(`Title: ${notification.title}`)
    console.log(`Message: ${notification.message}`)

    // Ask if user wants to send to family
    const rl = createReadlineInterface()
    const sendToFamily = await question(rl, '\nSend to all family members? (y/n): ')
    rl.close()

    if (sendToFamily.toLowerCase() === 'y') {
      console.log('\n📤 Sending to family members...')

      const result = await sendNotificationToFamilyMembers({
        userId,
        patientId,
        type,
        priority,
        title,
        message,
        metadata,
        actionUrl: `/patients/${patientId}`,
        actionLabel: 'View Details',
      })

      console.log(`\n✅ Family notification sent!`)
      console.log(`  Total recipients: ${result.totalRecipients}`)
      console.log(`  Successful: ${result.successCount}`)
      console.log(`  Failed: ${result.failureCount}`)

      if (result.results.length > 0) {
        console.log('\nRecipient Details:')
        result.results.forEach((r) => {
          const status = r.success ? '✓' : '✗'
          const error = r.error ? ` (${r.error})` : ''
          console.log(`  ${status} ${r.userName || r.userId}${error}`)
        })
      }
    }

    console.log('\n✨ Done!\n')
  } catch (error) {
    console.error('\n❌ Error creating notification:', error instanceof Error ? error.message : error)
    console.error(error)
    process.exit(1)
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.error('❌ Firebase configuration missing. Please check your .env.local file.')
  process.exit(1)
}

createTestNotification()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
