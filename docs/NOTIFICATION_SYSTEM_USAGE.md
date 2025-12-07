# Notification System Usage Guide

This guide explains how to use the context-aware notification system for family members.

## Overview

The notification system consists of:

1. **types/notifications.ts** - Comprehensive TypeScript types
2. **lib/notification-service.ts** - Core notification orchestration functions

## Features

- Context-aware message generation
- Email and push notification support
- User notification preferences
- Quiet hours support
- Batch notifications to family members
- Comprehensive error handling and logging
- Read/unread tracking
- Notification statistics

## Usage Examples

### 1. Send Notification When Medication is Added

```typescript
import { sendNotificationToFamilyMembers } from '@/lib/notification-service'
import type { MedicationMetadata } from '@/types/notifications'

async function onMedicationAdded(
  patientId: string,
  medication: PatientMedication,
  addedByUserId: string,
  addedByName: string
) {
  const metadata: MedicationMetadata = {
    medicationId: medication.id,
    medicationName: medication.name,
    patientName: patientProfile.name,
    strength: medication.strength,
    dosageForm: medication.dosageForm,
    frequency: medication.frequency,
    prescribedFor: medication.prescribedFor,
    actionBy: addedByName,
    actionByUserId: addedByUserId
  }

  const result = await sendNotificationToFamilyMembers({
    patientId,
    type: 'medication_added',
    priority: 'normal',
    title: 'New Medication Added',
    message: `${addedByName} added a new medication for ${patientProfile.name}`,
    metadata,
    actionUrl: `/patients/${patientId}/medications/${medication.id}`,
    actionLabel: 'View Medication',
    excludeUserId: addedByUserId, // Don't notify the person who added it
    expiresInDays: 30
  })

  console.log(`Notified ${result.successCount} of ${result.totalRecipients} family members`)
}
```

### 2. Send Notification When Vital Sign is Logged (with Alert)

```typescript
import { sendNotificationToFamilyMembers } from '@/lib/notification-service'
import type { VitalMetadata } from '@/types/notifications'

async function onVitalLogged(
  patientId: string,
  vital: VitalSign,
  loggedByUserId: string,
  loggedByName: string
) {
  // Check if vital is abnormal
  const isAbnormal = checkIfAbnormal(vital)

  const metadata: VitalMetadata = {
    vitalId: vital.id,
    vitalType: vital.type,
    value: formatVitalValue(vital), // e.g., "145/95 mmHg"
    unit: vital.unit,
    patientName: patientProfile.name,
    isAbnormal,
    abnormalReason: isAbnormal ? 'Blood pressure is elevated' : undefined,
    actionBy: loggedByName,
    actionByUserId: loggedByUserId
  }

  // Use urgent priority if abnormal
  const result = await sendNotificationToFamilyMembers({
    patientId,
    type: isAbnormal ? 'vital_alert' : 'vital_logged',
    priority: isAbnormal ? 'urgent' : 'normal',
    title: isAbnormal ? '⚠️ Abnormal Vital Sign Alert' : 'Vital Sign Logged',
    message: `${loggedByName} logged vital sign for ${patientProfile.name}`,
    metadata,
    actionUrl: `/patients/${patientId}/vitals`,
    actionLabel: 'View Vitals',
    excludeUserId: loggedByUserId,
    expiresInDays: isAbnormal ? 7 : 30
  })

  console.log(`Alert sent to ${result.successCount} family members`)
}
```

### 3. Send Notification When Weight is Logged

```typescript
import { sendNotificationToFamilyMembers } from '@/lib/notification-service'
import type { WeightMetadata } from '@/types/notifications'

async function onWeightLogged(
  patientId: string,
  weightLog: WeightLog,
  previousWeight: number | null,
  loggedByUserId: string,
  loggedByName: string
) {
  let changeFromPrevious: number | undefined
  let trendDirection: 'up' | 'down' | 'stable' | undefined

  if (previousWeight !== null) {
    changeFromPrevious = weightLog.weight - previousWeight
    trendDirection = changeFromPrevious > 0.5 ? 'up' : changeFromPrevious < -0.5 ? 'down' : 'stable'
  }

  const goalProgress = calculateGoalProgress(weightLog.weight, patientProfile.goals)

  const metadata: WeightMetadata = {
    weightLogId: weightLog.id,
    weight: weightLog.weight,
    unit: weightLog.unit,
    patientName: patientProfile.name,
    changeFromPrevious,
    trendDirection,
    goalProgress,
    actionBy: loggedByName,
    actionByUserId: loggedByUserId
  }

  await sendNotificationToFamilyMembers({
    patientId,
    type: 'weight_logged',
    priority: 'normal',
    title: 'Weight Logged',
    message: `${loggedByName} logged weight for ${patientProfile.name}`,
    metadata,
    actionUrl: `/patients/${patientId}/weight`,
    actionLabel: 'View Weight Trends',
    excludeUserId: loggedByUserId,
    expiresInDays: 30
  })
}
```

### 4. Send Notification When Appointment is Scheduled

```typescript
import { sendNotificationToFamilyMembers } from '@/lib/notification-service'
import type { AppointmentMetadata } from '@/types/notifications'

async function onAppointmentScheduled(
  patientId: string,
  appointment: Appointment,
  scheduledByUserId: string,
  scheduledByName: string
) {
  const metadata: AppointmentMetadata = {
    appointmentId: appointment.id,
    patientName: patientProfile.name,
    providerName: appointment.providerName,
    appointmentType: appointment.type,
    appointmentDateTime: appointment.dateTime,
    location: appointment.location,
    requiresDriver: appointment.requiresDriver,
    assignedDriverId: appointment.assignedDriverId,
    assignedDriverName: appointment.assignedDriverName,
    actionBy: scheduledByName,
    actionByUserId: scheduledByUserId
  }

  await sendNotificationToFamilyMembers({
    patientId,
    type: 'appointment_scheduled',
    priority: 'high',
    title: 'Appointment Scheduled',
    message: `${scheduledByName} scheduled an appointment for ${patientProfile.name}`,
    metadata,
    actionUrl: `/patients/${patientId}/appointments/${appointment.id}`,
    actionLabel: 'View Appointment',
    excludeUserId: scheduledByUserId,
    expiresInDays: 60
  })
}
```

### 5. Send Notification When Health Report is Generated

```typescript
import { sendNotificationToFamilyMembers } from '@/lib/notification-service'
import type { HealthReportMetadata } from '@/types/notifications'

async function onHealthReportGenerated(
  patientId: string,
  reportId: string,
  reportType: 'weekly' | 'monthly',
  dateRange: { start: string; end: string },
  downloadUrl: string,
  generatedByUserId: string,
  generatedByName: string
) {
  const metadata: HealthReportMetadata = {
    reportId,
    reportType,
    patientName: patientProfile.name,
    dateRange,
    includesVitals: true,
    includesMeals: true,
    includesWeight: true,
    includesMedications: true,
    generatedBy: generatedByName,
    generatedByUserId,
    downloadUrl
  }

  await sendNotificationToFamilyMembers({
    patientId,
    type: 'health_report_generated',
    priority: 'normal',
    title: 'Health Report Generated',
    message: `${generatedByName} generated a ${reportType} health report for ${patientProfile.name}`,
    metadata,
    actionUrl: downloadUrl,
    actionLabel: 'Download Report',
    expiresInDays: 90
  })
}
```

### 6. Send Single Notification (Not to Entire Family)

```typescript
import { createNotification, sendEmailNotification, sendPushNotification, getNotificationPreferences } from '@/lib/notification-service'

async function sendSingleNotification(
  userId: string,
  userEmail: string,
  userName: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata: NotificationMetadata
) {
  // Create notification
  const notification = await createNotification({
    userId,
    type,
    priority: 'normal',
    title,
    message,
    metadata,
    actionUrl: '/dashboard',
    actionLabel: 'View Dashboard'
  })

  // Get user preferences
  const preferences = await getNotificationPreferences(userId)

  // Send email if enabled
  if (preferences.globallyEnabled && preferences[type]?.email) {
    await sendEmailNotification(notification, userEmail, userName)
  }

  // Send push if enabled
  if (preferences.globallyEnabled && preferences[type]?.push) {
    await sendPushNotification(notification, userId)
  }
}
```

## User Notification Preferences

### Get User Preferences

```typescript
import { getNotificationPreferences } from '@/lib/notification-service'

const preferences = await getNotificationPreferences(userId)
console.log('Email enabled for medications:', preferences.medication_added.email)
console.log('Push enabled for vitals:', preferences.vital_logged.push)
console.log('Quiet hours:', preferences.quietHours)
```

### Update User Preferences

```typescript
import { updateNotificationPreferences } from '@/lib/notification-service'

await updateNotificationPreferences(userId, {
  medication_added: {
    email: true,
    push: true,
    inApp: true
  },
  vital_logged: {
    email: false,
    push: true,
    inApp: true
  },
  quietHours: {
    enabled: true,
    startHour: 22, // 10 PM
    endHour: 7 // 7 AM
  }
})
```

## Notification Management

### Get User Notifications

```typescript
import { getUserNotifications } from '@/lib/notification-service'

// Get all notifications
const allNotifications = await getUserNotifications(userId)

// Get unread notifications only
const unreadNotifications = await getUserNotifications(userId, { read: false })

// Get recent 10 notifications
const recentNotifications = await getUserNotifications(userId, { limit: 10 })

// Get urgent notifications
const urgentNotifications = await getUserNotifications(userId, { priority: 'urgent' })

// Get medication notifications
const medicationNotifications = await getUserNotifications(userId, {
  type: ['medication_added', 'medication_updated', 'medication_deleted']
})
```

### Mark as Read

```typescript
import { markAsRead, markMultipleAsRead } from '@/lib/notification-service'

// Mark single notification as read
await markAsRead(notificationId)

// Mark multiple notifications as read
await markMultipleAsRead([notificationId1, notificationId2, notificationId3])
```

### Get Notification Statistics

```typescript
import { getNotificationStats } from '@/lib/notification-service'

const stats = await getNotificationStats(userId)
console.log('Total notifications:', stats.total)
console.log('Unread:', stats.unread)
console.log('By type:', stats.byType)
console.log('By priority:', stats.byPriority)
console.log('Recent (last 7 days):', stats.recentCount)
```

## Firebase Cloud Messaging Setup

To enable push notifications, you need to:

1. **Set up Firebase Cloud Messaging in Firebase Console**
2. **Add VAPID key to environment variables**:
   ```
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key-here
   ```

3. **Create API route for sending push notifications** (server-side only):

Create `app/api/notifications/send-push/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { initializeApp } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { token, notification, data } = await request.json()

    // Initialize Firebase Admin
    const app = initializeApp()

    // Send push notification
    const response = await admin.messaging().send({
      token,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data,
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png'
        }
      }
    })

    return NextResponse.json({ success: true, messageId: response })
  } catch (error) {
    console.error('Error sending push notification:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send push notification' },
      { status: 500 }
    )
  }
}
```

## Context-Aware Message Generation

The system automatically generates human-readable messages based on the notification type and metadata. You don't need to manually construct messages - just provide the structured metadata:

```typescript
import { generateContextAwareMessage } from '@/lib/notification-service'

const metadata: MedicationMetadata = {
  medicationId: 'med123',
  medicationName: 'Metformin',
  patientName: 'Mom',
  strength: '500mg',
  prescribedFor: 'Type 2 Diabetes',
  actionBy: 'John',
  actionByUserId: 'user123'
}

const message = generateContextAwareMessage('medication_added', metadata)
// Output: "John added a new medication for Mom: Metformin (500mg) for Type 2 Diabetes."
```

## Error Handling

All notification functions include comprehensive error handling:

```typescript
try {
  const result = await sendNotificationToFamilyMembers({
    patientId,
    type: 'medication_added',
    title: 'Medication Added',
    message: 'New medication added',
    metadata
  })

  if (result.failureCount > 0) {
    console.warn('Some notifications failed:', result.results.filter(r => !r.success))
  }
} catch (error) {
  console.error('Failed to send notifications:', error)
  // Handle error appropriately
}
```

## Best Practices

1. **Always exclude the action performer** - Don't notify the user who performed the action
2. **Set appropriate priorities** - Use 'urgent' for critical alerts, 'high' for appointments, 'normal' for routine updates
3. **Provide action URLs** - Deep link to relevant pages for quick access
4. **Set expiration dates** - Use `expiresInDays` to auto-cleanup old notifications
5. **Respect user preferences** - The system automatically checks preferences before sending
6. **Log all notification events** - The service logs all actions for debugging
7. **Handle quiet hours** - Push notifications are automatically suppressed during quiet hours

## Firestore Collections

The notification system uses these Firestore collections:

- `notifications` - Individual notification records
- `notification_preferences` - User notification preferences
- `notification_tokens` - FCM tokens for push notifications
- `patients` - Patient profiles (to get family members)
- `family_members` - Family member access and permissions

## Integration Points

Integrate notifications at these key points in your application:

1. **After medication operations** (add, update, delete)
2. **After vital sign logging**
3. **After meal logging**
4. **After weight logging**
5. **After document uploads**
6. **After appointment scheduling/updates**
7. **After health report generation**
8. **After family member invitations/acceptance**
9. **For medication reminders** (scheduled)
10. **For appointment reminders** (scheduled)

## Testing

Test notifications in development:

```typescript
// Test email notification
const testMetadata: MedicationMetadata = {
  medicationId: 'test123',
  medicationName: 'Test Medication',
  patientName: 'Test Patient',
  strength: '500mg',
  actionBy: 'Test User',
  actionByUserId: 'test-user-id'
}

const notification = await createNotification({
  userId: 'your-test-user-id',
  patientId: 'your-test-patient-id',
  type: 'medication_added',
  title: 'Test Notification',
  message: 'This is a test',
  metadata: testMetadata
})

await sendEmailNotification(notification, 'your-test-email@example.com', 'Test User')
```
