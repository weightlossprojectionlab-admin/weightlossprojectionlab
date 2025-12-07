/**
 * Email Templates - Main Export
 *
 * Centralized export for all email notification templates and types.
 * Import from this file for cleaner imports throughout the application.
 *
 * @example
 * ```typescript
 * import { generateMedicationChangeEmail, type MedicationChangeEmailParams } from '@/lib/email-templates'
 * import { sendEmail } from '@/lib/email-service'
 *
 * const { html, text, subject } = generateMedicationChangeEmail({
 *   recipientEmail: 'family@example.com',
 *   recipientName: 'John Smith',
 *   patientName: 'Mary Smith',
 *   patientId: 'patient-123',
 *   medicationName: 'Lisinopril',
 *   strength: '10mg',
 *   dosageForm: 'Tablet',
 *   changeType: 'added',
 *   changedBy: 'Dr. Johnson',
 *   prescribedFor: 'High Blood Pressure'
 * })
 *
 * await sendEmail({ to: recipientEmail, subject, html, text })
 * ```
 */

// Export all template generator functions
export {
  generateMedicationChangeEmail,
  generateVitalLoggedEmail,
  generateDocumentUploadedEmail,
  generateHealthReportEmail,
  notificationEmailTemplates
} from './notification-emails'

// Export all TypeScript types
export type {
  MedicationChangeEmailParams,
  VitalLoggedEmailParams,
  DocumentUploadedEmailParams,
  HealthReportEmailParams,
  EmailTemplate,
  MedicationChangeType,
  VitalType,
  DocumentCategory,
  BaseEmailParams,
  EmailTemplateGenerator,
  NotificationEmailTemplates
} from './types'
