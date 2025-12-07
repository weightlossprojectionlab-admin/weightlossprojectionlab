# Email Templates Integration Guide

This guide shows how to integrate the notification email templates into your existing application.

## Quick Start

### 1. Basic Usage

```typescript
import { generateMedicationChangeEmail } from '@/lib/email-templates'
import { sendEmail } from '@/lib/email-service'

// Generate email
const { html, text, subject } = generateMedicationChangeEmail({
  recipientEmail: 'family@example.com',
  recipientName: 'John Smith',
  patientName: 'Mary Smith',
  patientId: 'patient-123',
  medicationName: 'Lisinopril',
  strength: '10mg',
  dosageForm: 'Tablet',
  changeType: 'added',
  changedBy: 'Dr. Johnson',
  prescribedFor: 'High Blood Pressure',
  changeDate: new Date()
})

// Send email
await sendEmail({
  to: recipientEmail,
  subject,
  html,
  text
})
```

### 2. Integration with Notification System

If you have a notification system, integrate like this:

```typescript
// lib/notifications/send-family-notifications.ts
import { generateMedicationChangeEmail, generateVitalLoggedEmail } from '@/lib/email-templates'
import { sendEmail } from '@/lib/email-service'
import { db } from '@/lib/firebase'

/**
 * Send email notifications to all family members with access to a patient
 */
export async function notifyFamilyMembers(
  patientId: string,
  notificationType: 'medication' | 'vital' | 'document' | 'report',
  data: any
) {
  // Get all family members with access to this patient
  const familyMembersSnap = await db
    .collection('family_access')
    .where('patientId', '==', patientId)
    .where('status', '==', 'active')
    .get()

  const familyMembers = familyMembersSnap.docs.map(doc => doc.data())

  // Send email to each family member
  for (const member of familyMembers) {
    try {
      let emailTemplate

      switch (notificationType) {
        case 'medication':
          emailTemplate = generateMedicationChangeEmail({
            recipientEmail: member.email,
            recipientName: member.name,
            ...data
          })
          break

        case 'vital':
          emailTemplate = generateVitalLoggedEmail({
            recipientEmail: member.email,
            recipientName: member.name,
            ...data
          })
          break

        // ... other cases
      }

      if (emailTemplate) {
        await sendEmail({
          to: member.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text
        })
      }
    } catch (error) {
      console.error(`Failed to send notification to ${member.email}:`, error)
    }
  }
}
```

### 3. Integration with Medication API

```typescript
// app/api/medications/route.ts
import { notifyFamilyMembers } from '@/lib/notifications/send-family-notifications'

export async function POST(req: Request) {
  const { patientId, medicationName, strength, dosageForm, prescribedFor } = await req.json()

  // Save medication to database
  const medicationRef = await db.collection('medications').add({
    patientId,
    medicationName,
    strength,
    dosageForm,
    prescribedFor,
    createdAt: new Date(),
    createdBy: currentUser.uid
  })

  // Send notifications to family members
  await notifyFamilyMembers(patientId, 'medication', {
    patientName: patient.name,
    patientId,
    medicationName,
    strength,
    dosageForm,
    changeType: 'added',
    changedBy: currentUser.displayName,
    prescribedFor,
    changeDate: new Date()
  })

  return Response.json({ success: true })
}
```

### 4. Integration with Vitals Logging

```typescript
// app/api/vitals/route.ts
import { notifyFamilyMembers } from '@/lib/notifications/send-family-notifications'

export async function POST(req: Request) {
  const { patientId, vitalType, vitalValue, unit, notes } = await req.json()

  // Save vital to database
  const vitalRef = await db.collection('vitals').add({
    patientId,
    vitalType,
    vitalValue,
    unit,
    notes,
    loggedAt: new Date(),
    loggedBy: currentUser.uid
  })

  // Send notifications to family members
  await notifyFamilyMembers(patientId, 'vital', {
    patientName: patient.name,
    patientId,
    vitalType,
    vitalValue,
    unit,
    loggedBy: currentUser.displayName,
    logDate: new Date(),
    notes
  })

  return Response.json({ success: true })
}
```

### 5. Batch Notifications with Queue

For production, consider using a queue system:

```typescript
// lib/queues/email-queue.ts
import { generateMedicationChangeEmail } from '@/lib/email-templates'
import { sendEmail } from '@/lib/email-service'

interface EmailJob {
  type: 'medication' | 'vital' | 'document' | 'report'
  recipientEmail: string
  recipientName: string
  data: any
}

export async function processEmailJob(job: EmailJob) {
  try {
    let emailTemplate

    switch (job.type) {
      case 'medication':
        emailTemplate = generateMedicationChangeEmail({
          recipientEmail: job.recipientEmail,
          recipientName: job.recipientName,
          ...job.data
        })
        break
      // ... other cases
    }

    if (emailTemplate) {
      await sendEmail({
        to: job.recipientEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text
      })
    }

    console.log(`✓ Email sent to ${job.recipientEmail}`)
  } catch (error) {
    console.error(`✗ Failed to send email to ${job.recipientEmail}:`, error)
    throw error // Re-throw for retry logic
  }
}
```

## Best Practices

### 1. Error Handling

Always wrap email sending in try-catch:

```typescript
try {
  const { html, text, subject } = generateMedicationChangeEmail(params)
  await sendEmail({ to, subject, html, text })
} catch (error) {
  console.error('Failed to send notification email:', error)
  // Don't fail the main operation if email fails
}
```

### 2. Respect User Preferences

Check notification preferences before sending:

```typescript
const userPreferences = await getUserPreferences(familyMember.userId)

if (userPreferences.emailNotifications && userPreferences.medicationAlerts) {
  await sendEmail({ ... })
}
```

### 3. Rate Limiting

Avoid sending too many emails at once:

```typescript
import pLimit from 'p-limit'

const limit = pLimit(5) // Max 5 concurrent emails

await Promise.all(
  familyMembers.map(member =>
    limit(() => sendNotificationEmail(member))
  )
)
```

### 4. Testing

Test emails in development:

```typescript
// In development, log instead of sending
if (process.env.NODE_ENV === 'development') {
  console.log('Email would be sent:', { to, subject })
  console.log('HTML:', html)
  console.log('Text:', text)
} else {
  await sendEmail({ to, subject, html, text })
}
```

### 5. Logging and Monitoring

Track email sending:

```typescript
await sendEmail({ to, subject, html, text })

// Log for analytics
await db.collection('email_logs').add({
  recipientEmail: to,
  emailType: 'medication_change',
  patientId,
  sentAt: new Date(),
  status: 'sent'
})
```

## Notification Triggers

### When to Send Notifications

| Event | Template | Trigger Point |
|-------|----------|---------------|
| Medication added | `medicationChange` | After successful medication creation |
| Medication updated | `medicationChange` | After successful medication update |
| Medication deleted | `medicationChange` | After successful medication deletion |
| Vital logged | `vitalLogged` | After successful vital creation |
| Document uploaded | `documentUploaded` | After successful file upload |
| Health report generated | `healthReport` | After successful report generation |

### Example: Complete Medication Flow

```typescript
export async function addMedication(medicationData: MedicationData) {
  // 1. Validate data
  if (!medicationData.medicationName) {
    throw new Error('Medication name is required')
  }

  // 2. Get patient info
  const patientDoc = await db.collection('patients').doc(medicationData.patientId).get()
  const patient = patientDoc.data()

  // 3. Save to database
  const medicationRef = await db.collection('medications').add({
    ...medicationData,
    createdAt: new Date(),
    createdBy: currentUser.uid
  })

  // 4. Get family members
  const familyMembersSnap = await db
    .collection('family_access')
    .where('patientId', '==', medicationData.patientId)
    .where('status', '==', 'active')
    .get()

  // 5. Send notifications (don't wait for completion)
  const notifications = familyMembersSnap.docs.map(async (doc) => {
    const member = doc.data()

    // Check notification preferences
    const prefs = await getUserPreferences(member.userId)
    if (!prefs.emailNotifications || !prefs.medicationAlerts) {
      return
    }

    try {
      const { html, text, subject } = generateMedicationChangeEmail({
        recipientEmail: member.email,
        recipientName: member.name,
        patientName: patient.name,
        patientId: medicationData.patientId,
        medicationName: medicationData.medicationName,
        strength: medicationData.strength,
        dosageForm: medicationData.dosageForm,
        changeType: 'added',
        changedBy: currentUser.displayName,
        prescribedFor: medicationData.prescribedFor,
        changeDate: new Date()
      })

      await sendEmail({ to: member.email, subject, html, text })
    } catch (error) {
      console.error(`Failed to notify ${member.email}:`, error)
      // Don't throw - continue with other notifications
    }
  })

  // Fire and forget
  Promise.all(notifications).catch(console.error)

  // 6. Return success
  return {
    success: true,
    medicationId: medicationRef.id
  }
}
```

## Environment Setup

Ensure these environment variables are set:

```env
# SendGrid (from email-service.ts)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourapp.com
SENDGRID_FROM_NAME=Your App Name
SENDGRID_REPLY_TO_EMAIL=support@yourapp.com

# App URL (for email links)
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

## Troubleshooting

### Emails not sending
1. Check SENDGRID_API_KEY is set
2. Verify sender email is verified in SendGrid
3. Check SendGrid logs for delivery issues

### Links not working
1. Verify NEXT_PUBLIC_APP_URL is correct
2. Check patientId and other IDs are valid
3. Test links manually

### Styling issues
1. Some email clients strip CSS
2. Inline styles are used for maximum compatibility
3. Test in multiple email clients (Gmail, Outlook, etc.)

## Support

For issues or questions:
1. Check SendGrid documentation
2. Review email-service.ts configuration
3. Test with examples.ts file
4. Check application logs for errors
