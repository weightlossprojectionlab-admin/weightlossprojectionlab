// HIPAA Complaint Schema
// For privacy violations and HIPAA-related complaints

import { Timestamp } from 'firebase/firestore'

export type ComplaintStatus = 'pending' | 'reviewing' | 'investigating' | 'resolved' | 'closed'
export type ComplaintType =
  | 'unauthorized_access'
  | 'improper_disclosure'
  | 'lack_of_access'
  | 'breach_notification'
  | 'amendment_denied'
  | 'accounting_request'
  | 'other'

export interface HIPAAComplaint {
  id: string

  // Complainant Information
  userId?: string // If logged in
  email: string
  name: string
  phone?: string

  // Complaint Details
  type: ComplaintType
  description: string
  incidentDate?: string
  affectedData?: string // What PHI was involved

  // Status
  status: ComplaintStatus
  priority: 'low' | 'medium' | 'high' | 'critical'

  // Admin Response
  assignedTo?: string // Admin UID
  internalNotes?: string
  resolutionNotes?: string

  // Timestamps
  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
  resolvedAt?: Timestamp | Date

  // Tracking
  caseNumber: string // Auto-generated: HIPAA-YYYYMMDD-XXXX
}
