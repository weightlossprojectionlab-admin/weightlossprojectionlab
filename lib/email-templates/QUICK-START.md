# Quick Start Guide - Email Notification Templates

## 30-Second Quick Start

```typescript
import { generateMedicationChangeEmail } from '@/lib/email-templates'
import { sendEmail } from '@/lib/email-service'

// Generate email
const { html, text, subject } = generateMedicationChangeEmail({
  recipientEmail: 'family@example.com',
  recipientName: 'John',
  patientName: 'Mary',
  patientId: 'patient-123',
  medicationName: 'Lisinopril',
  strength: '10mg',
  dosageForm: 'Tablet',
  changeType: 'added',
  changedBy: 'Dr. Johnson'
})

// Send it
await sendEmail({ to: recipientEmail, subject, html, text })
```

## All 4 Templates

### 1. Medication Change
```typescript
import { generateMedicationChangeEmail } from '@/lib/email-templates'

generateMedicationChangeEmail({
  recipientEmail: string,
  recipientName: string,
  patientName: string,
  patientId: string,
  medicationName: string,
  strength?: string,
  dosageForm?: string,
  changeType: 'added' | 'updated' | 'deleted',
  changedBy: string,
  prescribedFor?: string,
  changeDate?: Date | string
})
```

### 2. Vital Logged
```typescript
import { generateVitalLoggedEmail } from '@/lib/email-templates'

generateVitalLoggedEmail({
  recipientEmail: string,
  recipientName: string,
  patientName: string,
  patientId: string,
  vitalType: string, // 'Weight', 'Blood Pressure', etc.
  vitalValue: string,
  unit?: string,
  loggedBy: string,
  logDate?: Date | string,
  notes?: string
})
```

### 3. Document Uploaded
```typescript
import { generateDocumentUploadedEmail } from '@/lib/email-templates'

generateDocumentUploadedEmail({
  recipientEmail: string,
  recipientName: string,
  patientName: string,
  patientId: string,
  documentName: string,
  documentCategory: string, // 'Lab Results', 'Prescription', etc.
  uploadedBy: string,
  uploadDate?: Date | string,
  fileSize?: string
})
```

### 4. Health Report
```typescript
import { generateHealthReportEmail } from '@/lib/email-templates'

generateHealthReportEmail({
  recipientEmail: string,
  recipientName: string,
  patientName: string,
  patientId: string,
  reportId: string,
  reportType: string,
  reportDate: Date | string,
  generatedBy: string,
  summary?: string,
  keyFindings?: string[]
})
```

## Common Pattern

All templates follow the same pattern:

1. **Import** the template generator
2. **Call** the function with parameters
3. **Get** back `{ html, text, subject }`
4. **Pass** to `sendEmail()` from `@/lib/email-service`

## Real-World Example

```typescript
// In your medication API route
export async function POST(req: Request) {
  // 1. Save medication
  const med = await saveMedication(medicationData)

  // 2. Get family members
  const family = await getFamilyMembers(patientId)

  // 3. Send notifications
  for (const member of family) {
    const { html, text, subject } = generateMedicationChangeEmail({
      recipientEmail: member.email,
      recipientName: member.name,
      patientName: patient.name,
      patientId,
      medicationName: med.name,
      strength: med.strength,
      dosageForm: med.form,
      changeType: 'added',
      changedBy: currentUser.name
    })

    await sendEmail({ to: member.email, subject, html, text })
  }

  return Response.json({ success: true })
}
```

## Files to Check

- **`notification-emails.ts`** - Main template code
- **`README.md`** - Detailed documentation
- **`INTEGRATION.md`** - Integration patterns
- **`preview.html`** - Visual preview (open in browser)
- **`sample-output.md`** - Example outputs

## Visual Preview

Open this file in your browser to see all 4 templates:
```
C:/Users/percy/wlpl/weightlossprojectlab/lib/email-templates/preview.html
```

## Environment Variables

```env
SENDGRID_API_KEY=your_key
SENDGRID_FROM_EMAIL=noreply@yourapp.com
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

## TypeScript Support

Full type safety included:

```typescript
import type {
  MedicationChangeEmailParams,
  VitalLoggedEmailParams,
  DocumentUploadedEmailParams,
  HealthReportEmailParams
} from '@/lib/email-templates'
```

## Need Help?

1. Check **README.md** for detailed usage
2. Check **INTEGRATION.md** for integration patterns
3. Check **sample-output.md** for example outputs
4. Open **preview.html** to see visual examples

---

Created: December 5, 2025
Location: `lib/email-templates/`
