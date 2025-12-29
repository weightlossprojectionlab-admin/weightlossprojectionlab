/**
 * Demo Request Types
 *
 * TypeScript interfaces for demo request system
 */

export type DemoRequestStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled'

export type CompanySize = 'solo' | '2-10' | '11-50' | '51-200' | '201-1000' | '1000+'

export type PreferredTime = 'morning' | 'afternoon' | 'evening'

export type Urgency = 'low' | 'medium' | 'high'

export interface DemoRequest {
  id: string

  // Contact Info
  name: string
  email: string
  phone?: string
  company?: string
  companySize?: CompanySize
  role?: string

  // Scheduling
  preferredDate?: string // ISO date string
  preferredTime?: PreferredTime
  timezone?: string

  // Context
  useCase?: string
  currentSolution?: string
  urgency?: Urgency

  // Status Tracking
  status: DemoRequestStatus
  submittedAt: string // ISO timestamp
  scheduledAt?: string
  completedAt?: string
  cancelledAt?: string

  // Admin Tracking
  assignedTo?: string
  internalNotes?: string
  followUpDate?: string

  // Audit Trail
  ipAddress: string
  userAgent: string
  source: string
  utmParams?: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
  }
}

export interface CreateDemoRequestInput {
  name: string
  email: string
  phone?: string
  company?: string
  companySize?: CompanySize
  role?: string
  preferredDate?: string
  preferredTime?: PreferredTime
  timezone?: string
  useCase?: string
  currentSolution?: string
  urgency?: Urgency
  source: string
  utmParams?: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
  }
}

export interface UpdateDemoRequestInput {
  status?: DemoRequestStatus
  scheduledAt?: string
  completedAt?: string
  cancelledAt?: string
  assignedTo?: string
  internalNotes?: string
  followUpDate?: string
}
