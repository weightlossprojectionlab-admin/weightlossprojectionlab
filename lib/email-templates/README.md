# Email Notification Templates

This directory contains beautifully designed HTML email templates for family member notifications with consistent purple gradient styling matching the existing family invitation template.

## Templates Overview

### 1. Medication Change Email
Notifies family members when medications are added, updated, or deleted.

**Features:**
- Prominent patient name
- Medication details (name, strength, dosage form)
- Who made the change and when
- Reason/prescribed for information
- Direct link to patient medications tab
- Color-coded by change type (blue for add/update, red for delete)

**Usage:**
```typescript
import { generateMedicationChangeEmail } from '@/lib/email-templates/notification-emails'
import { sendEmail } from '@/lib/email-service'

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

await sendEmail({ to: recipientEmail, subject, html, text })
```

### 2. Vital Logged Email
Notifies family members when new vitals are recorded.

**Features:**
- Large visual display of vital value
- Type-specific icons and colors (weight, BP, heart rate, etc.)
- Who logged it and when
- Optional notes field
- Direct link to patient vitals tab

**Usage:**
```typescript
import { generateVitalLoggedEmail } from '@/lib/email-templates/notification-emails'
import { sendEmail } from '@/lib/email-service'

const { html, text, subject } = generateVitalLoggedEmail({
  recipientEmail: 'family@example.com',
  recipientName: 'John Smith',
  patientName: 'Mary Smith',
  patientId: 'patient-123',
  vitalType: 'Weight',
  vitalValue: '165.2',
  unit: 'lbs',
  loggedBy: 'Nurse Williams',
  logDate: new Date(),
  notes: 'Morning weight after breakfast'
})

await sendEmail({ to: recipientEmail, subject, html, text })
```

### 3. Document Uploaded Email
Notifies family members when new documents are uploaded.

**Features:**
- Document name prominently displayed
- Category with icon and color
- File size information
- Who uploaded it and when
- Direct link to patient documents tab

**Usage:**
```typescript
import { generateDocumentUploadedEmail } from '@/lib/email-templates/notification-emails'
import { sendEmail } from '@/lib/email-service'

const { html, text, subject } = generateDocumentUploadedEmail({
  recipientEmail: 'family@example.com',
  recipientName: 'John Smith',
  patientName: 'Mary Smith',
  patientId: 'patient-123',
  documentName: 'Blood Test Results - Jan 2024.pdf',
  documentCategory: 'Lab Results',
  uploadedBy: 'Dr. Johnson',
  uploadDate: new Date(),
  fileSize: '2.4 MB'
})

await sendEmail({ to: recipientEmail, subject, html, text })
```

### 4. Health Report Email
Notifies family members when health reports are generated.

**Features:**
- Report type and date prominently displayed
- Optional summary section
- Optional key findings list
- Who generated it
- Direct link to view full report

**Usage:**
```typescript
import { generateHealthReportEmail } from '@/lib/email-templates/notification-emails'
import { sendEmail } from '@/lib/email-service'

const { html, text, subject } = generateHealthReportEmail({
  recipientEmail: 'family@example.com',
  recipientName: 'John Smith',
  patientName: 'Mary Smith',
  patientId: 'patient-123',
  reportId: 'report-456',
  reportType: 'Monthly Health Summary',
  reportDate: new Date(),
  generatedBy: 'Dr. Johnson',
  summary: 'Overall health metrics show positive trends with weight loss of 5 lbs this month.',
  keyFindings: [
    'Weight decreased by 5 lbs',
    'Blood pressure within normal range',
    'Medication compliance at 98%'
  ]
})

await sendEmail({ to: recipientEmail, subject, html, text })
```

## Design Features

All templates include:

- **Consistent Purple Gradient Header** - Matches family invitation template (#667eea to #764ba2)
- **Professional Typography** - System fonts with clean hierarchy
- **Responsive Design** - Mobile-friendly max-width 600px container
- **Context-Aware Links** - Direct deep links to specific patient tabs
- **Both HTML & Text Versions** - Ensures compatibility across all email clients
- **Accessibility** - High contrast, clear hierarchy, semantic HTML
- **Branded Footer** - Consistent copyright and auto-notification notice

## Color Coding

Templates use intelligent color coding:

- **Purple (#667eea)** - Primary brand color, general actions
- **Blue (#3b82f6)** - Information, lab results
- **Red (#ef4444)** - Deletions, blood pressure, alerts
- **Pink (#ec4899)** - Heart rate vitals
- **Orange (#f59e0b)** - Warnings, temperature, medical history
- **Green (#10b981)** - Success, insurance documents

## Integration with Email Service

All templates return an object with:
```typescript
{
  html: string,    // Fully formatted HTML email
  text: string,    // Plain text fallback
  subject: string  // Contextual subject line
}
```

These can be passed directly to `sendEmail()` from `lib/email-service.ts`.

## Environment Variables

Templates use `NEXT_PUBLIC_APP_URL` for generating links. Make sure this is set:

```env
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

For local development, defaults to `http://localhost:3000`.

## Testing

To test templates, you can create a simple test file:

```typescript
import { generateMedicationChangeEmail } from '@/lib/email-templates/notification-emails'

const { html } = generateMedicationChangeEmail({
  // ... params
})

console.log(html) // View raw HTML
// Or write to file to preview in browser
```

## Future Enhancements

Potential additions:
- Appointment reminder emails
- Care task assignment notifications
- Duty completion notifications
- Weekly/monthly digest emails
- Emergency alert emails
