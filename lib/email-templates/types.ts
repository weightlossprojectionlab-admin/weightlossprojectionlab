/**
 * TypeScript type definitions for email notification templates
 */

// Common base interface for all notification emails
export interface BaseEmailParams {
  recipientEmail: string
  recipientName: string
  patientName: string
  patientId: string
}

// Email template return type
export interface EmailTemplate {
  html: string
  text: string
  subject: string
}

// Medication change types
export type MedicationChangeType = 'added' | 'updated' | 'deleted'

export interface MedicationChangeEmailParams extends BaseEmailParams {
  medicationName: string
  strength?: string
  dosageForm?: string
  changeType: MedicationChangeType
  changedBy: string
  prescribedFor?: string
  changeDate?: Date | string
}

// Vital types supported
export type VitalType =
  | 'Weight'
  | 'Blood Pressure'
  | 'Heart Rate'
  | 'Temperature'
  | 'Blood Glucose'
  | 'Oxygen Saturation'
  | string // Allow custom vital types

export interface VitalLoggedEmailParams extends BaseEmailParams {
  vitalType: VitalType
  vitalValue: string
  unit?: string
  loggedBy: string
  logDate?: Date | string
  notes?: string
}

// Document categories
export type DocumentCategory =
  | 'Lab Results'
  | 'Imaging'
  | 'Prescription'
  | 'Insurance'
  | 'Medical History'
  | 'Other'
  | string // Allow custom categories

export interface DocumentUploadedEmailParams extends BaseEmailParams {
  documentName: string
  documentCategory: DocumentCategory
  uploadedBy: string
  uploadDate?: Date | string
  fileSize?: string
}

// Health report types
export interface HealthReportEmailParams extends BaseEmailParams {
  reportId: string
  reportType: string
  reportDate: Date | string
  generatedBy: string
  summary?: string
  keyFindings?: string[]
}

// Email template generator function type
export type EmailTemplateGenerator<T> = (params: T) => EmailTemplate

// Export all template generators as a typed object
export interface NotificationEmailTemplates {
  medicationChange: EmailTemplateGenerator<MedicationChangeEmailParams>
  vitalLogged: EmailTemplateGenerator<VitalLoggedEmailParams>
  documentUploaded: EmailTemplateGenerator<DocumentUploadedEmailParams>
  healthReport: EmailTemplateGenerator<HealthReportEmailParams>
}
