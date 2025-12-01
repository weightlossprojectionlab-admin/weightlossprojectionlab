import { Timestamp } from 'firebase/firestore'

/**
 * Healthcare Provider Information
 */
export interface HealthcareProvider {
  id: string
  patientId: string

  // Basic Info
  name: string
  title?: string // Dr., NP, PA, etc.
  specialty: string

  // Contact Information
  email?: string
  phone?: string
  fax?: string

  // Practice/Facility
  facility?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
  }

  // Metadata
  addedBy: string
  addedAt: Timestamp | Date
  updatedAt?: Timestamp | Date
  source: 'document' | 'medication' | 'manual'
  sourceId?: string // ID of document/medication if applicable

  // Communication History
  lastContactDate?: Timestamp | Date
  lastContactType?: 'email' | 'call' | 'fax'

  // Notes
  notes?: string
}

/**
 * Provider Communication Log
 */
export interface ProviderCommunication {
  id: string
  patientId: string
  providerId: string
  providerName: string // Denormalized for easier querying

  type: 'email' | 'call' | 'fax'
  sentBy: string
  sentByName?: string // Denormalized
  sentAt: Timestamp | Date

  // For emails/faxes
  subject?: string
  message?: string
  attachments?: {
    type: 'health_report' | 'document' | 'medication_list' | 'vitals_chart'
    id?: string
    name: string
  }[]

  // For calls
  duration?: number // in seconds
  callNotes?: string

  status: 'sent' | 'delivered' | 'failed' | 'completed'
  errorMessage?: string
}

/**
 * Daily Health Report
 */
export interface HealthReport {
  id: string
  patientId: string
  patientName: string // Denormalized

  reportDate: string // YYYY-MM-DD format for easy querying
  report: string // Markdown content

  generatedAt: Timestamp | Date
  generatedBy: string
  generatedByName?: string // Denormalized

  // Metadata about what was included in the report
  includedData?: {
    vitalsCount: number
    mealsCount: number
    weightLogsCount: number
    stepsLogsCount: number
    medicationsCount: number
    documentsCount: number
  }

  // Track views and exports
  viewCount?: number
  lastViewedAt?: Timestamp | Date
  exportedCount?: number
  emailedCount?: number
}

/**
 * Common specialty options for providers
 */
export const PROVIDER_SPECIALTIES = [
  'Primary Care',
  'Cardiology',
  'Endocrinology',
  'Gastroenterology',
  'Neurology',
  'Orthopedics',
  'Psychiatry',
  'Psychology',
  'Dermatology',
  'Ophthalmology',
  'ENT (Ear, Nose, Throat)',
  'Pulmonology',
  'Rheumatology',
  'Urology',
  'Oncology',
  'Nephrology',
  'Hematology',
  'Allergy & Immunology',
  'Infectious Disease',
  'Physical Therapy',
  'Occupational Therapy',
  'Nutrition/Dietitian',
  'Pharmacy',
  'Nursing',
  'Other'
] as const

/**
 * Common provider titles
 */
export const PROVIDER_TITLES = [
  'Dr.',
  'NP',
  'PA',
  'RN',
  'APRN',
  'PT',
  'OT',
  'RD',
  'PharmD',
  'DDS',
  'DMD',
  'DO',
  'MD'
] as const

/**
 * Email template types for provider communications
 */
export const EMAIL_TEMPLATES = {
  HEALTH_SUMMARY: {
    id: 'health_summary',
    name: 'Health Summary',
    subject: 'Health Summary for {patientName} - {reportDate}',
    body: `Dear {providerTitle} {providerName},

Please find attached the health summary for {patientName} for {reportDate}.

This report includes:
- Current vital signs and trends
- Weight and nutrition tracking
- Activity levels
- Current medications
- Recent health notes

If you have any questions or concerns, please don't hesitate to reach out.

Best regards,
{senderName}

---
This automated summary is for informational purposes only and should not replace professional medical advice.`
  },
  RECORDS_REQUEST: {
    id: 'records_request',
    name: 'Records Request',
    subject: 'Medical Records Request for {patientName}',
    body: `Dear {providerTitle} {providerName},

I am writing to request medical records for {patientName}.

Please provide the following information:
- Recent lab results
- Medication history
- Visit summaries
- Any relevant diagnostic reports

Thank you for your assistance.

Best regards,
{senderName}`
  },
  FOLLOW_UP: {
    id: 'follow_up',
    name: 'Follow-up',
    subject: 'Follow-up for {patientName}',
    body: `Dear {providerTitle} {providerName},

I wanted to follow up regarding {patientName}'s recent care.

{customMessage}

Thank you for your continued support.

Best regards,
{senderName}`
  }
} as const
