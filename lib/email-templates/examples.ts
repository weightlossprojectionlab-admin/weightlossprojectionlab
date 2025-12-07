/**
 * Example outputs for notification email templates
 * Run this file to see sample HTML and text outputs
 */

import {
  generateMedicationChangeEmail,
  generateVitalLoggedEmail,
  generateDocumentUploadedEmail,
  generateHealthReportEmail
} from './notification-emails'

// ============================================================================
// EXAMPLE 1: Medication Added
// ============================================================================

console.log('='.repeat(80))
console.log('EXAMPLE 1: MEDICATION ADDED')
console.log('='.repeat(80))

const medicationAddedExample = generateMedicationChangeEmail({
  recipientEmail: 'john.smith@example.com',
  recipientName: 'John Smith',
  patientName: 'Mary Smith',
  patientId: 'patient-123',
  medicationName: 'Lisinopril',
  strength: '10mg',
  dosageForm: 'Tablet',
  changeType: 'added',
  changedBy: 'Dr. Sarah Johnson',
  prescribedFor: 'High Blood Pressure',
  changeDate: new Date('2024-01-15T10:30:00')
})

console.log('\nSUBJECT:', medicationAddedExample.subject)
console.log('\nTEXT VERSION:')
console.log(medicationAddedExample.text)
console.log('\n[HTML version available in medicationAddedExample.html]')

// ============================================================================
// EXAMPLE 2: Medication Deleted
// ============================================================================

console.log('\n\n' + '='.repeat(80))
console.log('EXAMPLE 2: MEDICATION DELETED')
console.log('='.repeat(80))

const medicationDeletedExample = generateMedicationChangeEmail({
  recipientEmail: 'john.smith@example.com',
  recipientName: 'John Smith',
  patientName: 'Mary Smith',
  patientId: 'patient-123',
  medicationName: 'Metformin',
  strength: '500mg',
  dosageForm: 'Tablet',
  changeType: 'deleted',
  changedBy: 'Dr. Sarah Johnson',
  prescribedFor: 'Type 2 Diabetes',
  changeDate: new Date('2024-01-15T14:45:00')
})

console.log('\nSUBJECT:', medicationDeletedExample.subject)
console.log('\nTEXT VERSION:')
console.log(medicationDeletedExample.text)

// ============================================================================
// EXAMPLE 3: Weight Vital Logged
// ============================================================================

console.log('\n\n' + '='.repeat(80))
console.log('EXAMPLE 3: WEIGHT VITAL LOGGED')
console.log('='.repeat(80))

const weightVitalExample = generateVitalLoggedEmail({
  recipientEmail: 'john.smith@example.com',
  recipientName: 'John Smith',
  patientName: 'Mary Smith',
  patientId: 'patient-123',
  vitalType: 'Weight',
  vitalValue: '165.2',
  unit: 'lbs',
  loggedBy: 'Nurse Jennifer Williams',
  logDate: new Date('2024-01-15T08:00:00'),
  notes: 'Morning weight after breakfast, patient reports feeling great'
})

console.log('\nSUBJECT:', weightVitalExample.subject)
console.log('\nTEXT VERSION:')
console.log(weightVitalExample.text)

// ============================================================================
// EXAMPLE 4: Blood Pressure Vital Logged
// ============================================================================

console.log('\n\n' + '='.repeat(80))
console.log('EXAMPLE 4: BLOOD PRESSURE VITAL LOGGED')
console.log('='.repeat(80))

const bloodPressureExample = generateVitalLoggedEmail({
  recipientEmail: 'john.smith@example.com',
  recipientName: 'John Smith',
  patientName: 'Mary Smith',
  patientId: 'patient-123',
  vitalType: 'Blood Pressure',
  vitalValue: '120/80',
  unit: 'mmHg',
  loggedBy: 'Nurse Jennifer Williams',
  logDate: new Date('2024-01-15T08:15:00')
})

console.log('\nSUBJECT:', bloodPressureExample.subject)
console.log('\nTEXT VERSION:')
console.log(bloodPressureExample.text)

// ============================================================================
// EXAMPLE 5: Lab Results Document Uploaded
// ============================================================================

console.log('\n\n' + '='.repeat(80))
console.log('EXAMPLE 5: LAB RESULTS DOCUMENT UPLOADED')
console.log('='.repeat(80))

const labDocumentExample = generateDocumentUploadedEmail({
  recipientEmail: 'john.smith@example.com',
  recipientName: 'John Smith',
  patientName: 'Mary Smith',
  patientId: 'patient-123',
  documentName: 'Comprehensive Metabolic Panel - January 2024.pdf',
  documentCategory: 'Lab Results',
  uploadedBy: 'Dr. Sarah Johnson',
  uploadDate: new Date('2024-01-15T16:20:00'),
  fileSize: '2.4 MB'
})

console.log('\nSUBJECT:', labDocumentExample.subject)
console.log('\nTEXT VERSION:')
console.log(labDocumentExample.text)

// ============================================================================
// EXAMPLE 6: Prescription Document Uploaded
// ============================================================================

console.log('\n\n' + '='.repeat(80))
console.log('EXAMPLE 6: PRESCRIPTION DOCUMENT UPLOADED')
console.log('='.repeat(80))

const prescriptionDocumentExample = generateDocumentUploadedEmail({
  recipientEmail: 'john.smith@example.com',
  recipientName: 'John Smith',
  patientName: 'Mary Smith',
  patientId: 'patient-123',
  documentName: 'Prescription - Lisinopril 10mg.pdf',
  documentCategory: 'Prescription',
  uploadedBy: 'Dr. Sarah Johnson',
  uploadDate: new Date('2024-01-15T10:45:00'),
  fileSize: '156 KB'
})

console.log('\nSUBJECT:', prescriptionDocumentExample.subject)
console.log('\nTEXT VERSION:')
console.log(prescriptionDocumentExample.text)

// ============================================================================
// EXAMPLE 7: Monthly Health Report
// ============================================================================

console.log('\n\n' + '='.repeat(80))
console.log('EXAMPLE 7: MONTHLY HEALTH REPORT')
console.log('='.repeat(80))

const healthReportExample = generateHealthReportEmail({
  recipientEmail: 'john.smith@example.com',
  recipientName: 'John Smith',
  patientName: 'Mary Smith',
  patientId: 'patient-123',
  reportId: 'report-456',
  reportType: 'Monthly Health Summary',
  reportDate: new Date('2024-01-15'),
  generatedBy: 'Dr. Sarah Johnson',
  summary: 'Overall health metrics show positive trends this month. Patient has achieved excellent weight loss progress and maintained consistent medication compliance. Blood pressure readings are within normal range.',
  keyFindings: [
    'Weight decreased by 5.2 lbs (3.1% of starting weight)',
    'Blood pressure averaged 118/78 mmHg (optimal range)',
    'Medication compliance at 98% (all doses taken on time)',
    'No missed appointments this month',
    'Physical activity increased by 25% compared to last month'
  ]
})

console.log('\nSUBJECT:', healthReportExample.subject)
console.log('\nTEXT VERSION:')
console.log(healthReportExample.text)

// ============================================================================
// EXAMPLE 8: Health Report without optional fields
// ============================================================================

console.log('\n\n' + '='.repeat(80))
console.log('EXAMPLE 8: SIMPLE HEALTH REPORT (NO OPTIONAL FIELDS)')
console.log('='.repeat(80))

const simpleReportExample = generateHealthReportEmail({
  recipientEmail: 'john.smith@example.com',
  recipientName: 'John Smith',
  patientName: 'Mary Smith',
  patientId: 'patient-123',
  reportId: 'report-789',
  reportType: 'Weekly Progress Report',
  reportDate: new Date('2024-01-15'),
  generatedBy: 'System Auto-Generated'
})

console.log('\nSUBJECT:', simpleReportExample.subject)
console.log('\nTEXT VERSION:')
console.log(simpleReportExample.text)

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n\n' + '='.repeat(80))
console.log('SUMMARY')
console.log('='.repeat(80))

console.log(`
Total Examples Generated: 8

1. Medication Added - Shows full medication details with prescription info
2. Medication Deleted - Shows removal with red color coding
3. Weight Vital - Shows large visual display with notes
4. Blood Pressure Vital - Shows vital without notes
5. Lab Results Document - Shows document with category icon
6. Prescription Document - Shows smaller document file
7. Detailed Health Report - Shows all optional fields (summary + key findings)
8. Simple Health Report - Shows minimal required fields only

All templates include:
- ✓ Purple gradient header matching family invitation template
- ✓ Context-aware patient information
- ✓ Professional typography and spacing
- ✓ Direct deep links to specific patient tabs
- ✓ Both HTML and plain text versions
- ✓ Mobile-responsive design
- ✓ Branded footer with copyright
- ✓ Clear "who did what when" information
- ✓ Type-specific color coding and icons

Usage:
  import { sendEmail } from '@/lib/email-service'
  const { html, text, subject } = generateXXXEmail({ ...params })
  await sendEmail({ to: recipientEmail, subject, html, text })
`)

console.log('='.repeat(80))

// Export examples for testing
export {
  medicationAddedExample,
  medicationDeletedExample,
  weightVitalExample,
  bloodPressureExample,
  labDocumentExample,
  prescriptionDocumentExample,
  healthReportExample,
  simpleReportExample
}
