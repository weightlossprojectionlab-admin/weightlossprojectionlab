/**
 * Medical Records System - Firestore Operations
 *
 * CRUD operations for patients, vital signs, providers, and appointments
 * Based on MEDICAL_RECORDS_PRD.json - Slice S1 (Single Patient Vitals)
 */

'use client'

import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/api-client'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore'
import type {
  PatientProfile,
  VitalSign,
  Provider,
  Appointment,
  FamilyMember,
  FamilyRole,
  FamilyInvitation,
  WeightLog,
  MealLog,
  StepLog,
  PatientMedication,
  PatientDocument
} from '@/types/medical'

// Helper: Make authenticated API request (uses unified API client)
const makeAuthenticatedRequest = async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
  const method = options.method || 'GET'

  try {
    switch (method.toUpperCase()) {
      case 'GET':
        return await apiClient.get<T>(url)
      case 'POST':
        return await apiClient.post<T>(url, options.body ? JSON.parse(options.body as string) : {})
      case 'PATCH':
        return await apiClient.patch<T>(url, options.body ? JSON.parse(options.body as string) : {})
      case 'PUT':
        return await apiClient.put<T>(url, options.body ? JSON.parse(options.body as string) : {})
      case 'DELETE':
        return await apiClient.delete<T>(url)
      default:
        return await apiClient.get<T>(url)
    }
  } catch (error: any) {
    logger.error('[MedicalOps] API Error', error, {
      url,
      method
    })
    throw error
  }
}

// ==================== PATIENT OPERATIONS ====================

export const patientOperations = {
  /**
   * Create a new patient profile
   */
  async createPatient(patientData: Omit<PatientProfile, 'id' | 'createdAt' | 'lastModified'>): Promise<PatientProfile> {
    try {
      logger.info('[MedicalOps] Creating patient', { type: patientData.type, name: patientData.name })

      const patient = await makeAuthenticatedRequest<PatientProfile>('/patients', {
        method: 'POST',
        body: JSON.stringify(patientData)
      })

      logger.info('[MedicalOps] Patient created successfully', { patientId: patient.id })
      return patient
    } catch (error) {
      logger.error('[MedicalOps] Error creating patient', error as Error)
      throw error
    }
  },

  /**
   * Get all patients for the current user
   */
  async getPatients(): Promise<PatientProfile[]> {
    try {
      logger.debug('[MedicalOps] Fetching patients')

      const patients = await makeAuthenticatedRequest<PatientProfile[]>('/patients', {
        method: 'GET'
      })

      logger.debug('[MedicalOps] Patients fetched', { count: patients?.length || 0 })
      return patients || []
    } catch (error) {
      logger.error('[MedicalOps] Error fetching patients', error as Error)
      throw error
    }
  },

  /**
   * Get a single patient by ID
   */
  async getPatient(patientId: string): Promise<PatientProfile> {
    try {
      logger.debug('[MedicalOps] Fetching patient', { patientId })

      const patient = await makeAuthenticatedRequest<PatientProfile>(`/patients/${patientId}`, {
        method: 'GET'
      })

      logger.debug('[MedicalOps] Patient fetched', { patientId })
      return patient
    } catch (error) {
      logger.error('[MedicalOps] Error fetching patient', error as Error, { patientId })
      throw error
    }
  },

  /**
   * Update an existing patient
   */
  async updatePatient(patientId: string, updates: Partial<PatientProfile>): Promise<PatientProfile> {
    try {
      logger.info('[MedicalOps] Updating patient', { patientId, updates })

      const patient = await makeAuthenticatedRequest<PatientProfile>(`/patients/${patientId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      })

      logger.info('[MedicalOps] Patient updated successfully', { patientId })
      return patient
    } catch (error) {
      logger.error('[MedicalOps] Error updating patient', error as Error, { patientId })
      throw error
    }
  },

  /**
   * Delete a patient
   */
  async deletePatient(patientId: string): Promise<void> {
    try {
      logger.info('[MedicalOps] Deleting patient', { patientId })

      await makeAuthenticatedRequest<void>(`/patients/${patientId}`, {
        method: 'DELETE'
      })

      logger.info('[MedicalOps] Patient deleted successfully', { patientId })
    } catch (error) {
      logger.error('[MedicalOps] Error deleting patient', error as Error, { patientId })
      throw error
    }
  }
}

// ==================== VITAL SIGNS OPERATIONS ====================

export const vitalOperations = {
  /**
   * Log a new vital sign reading
   */
  async logVital(patientId: string, vitalData: Omit<VitalSign, 'id' | 'patientId' | 'takenBy'>): Promise<VitalSign> {
    try {
      logger.info('[MedicalOps] Logging vital sign', { patientId, type: vitalData.type })

      const vital = await makeAuthenticatedRequest<VitalSign>(`/patients/${patientId}/vitals`, {
        method: 'POST',
        body: JSON.stringify(vitalData)
      })

      logger.info('[MedicalOps] Vital sign logged successfully', { patientId, vitalId: vital.id })
      return vital
    } catch (error) {
      logger.error('[MedicalOps] Error logging vital sign', error as Error, { patientId })
      throw error
    }
  },

  /**
   * Get all vital signs for a patient
   */
  async getVitals(patientId: string, options?: {
    type?: string
    limit?: number
    startDate?: string
    endDate?: string
  }): Promise<VitalSign[]> {
    try {
      logger.debug('[MedicalOps] Fetching vitals', { patientId, options })

      const queryParams = new URLSearchParams()
      if (options?.type) queryParams.append('type', options.type)
      if (options?.limit) queryParams.append('limit', options.limit.toString())
      if (options?.startDate) queryParams.append('startDate', options.startDate)
      if (options?.endDate) queryParams.append('endDate', options.endDate)

      const url = `/patients/${patientId}/vitals${queryParams.toString() ? `?${queryParams}` : ''}`

      const vitals = await makeAuthenticatedRequest<VitalSign[]>(url, {
        method: 'GET'
      })

      logger.debug('[MedicalOps] Vitals fetched', { patientId, count: vitals?.length || 0 })
      return vitals || []
    } catch (error) {
      logger.error('[MedicalOps] Error fetching vitals', error as Error, { patientId })
      throw error
    }
  },

  /**
   * Get a single vital sign by ID
   */
  async getVital(patientId: string, vitalId: string): Promise<VitalSign> {
    try {
      logger.debug('[MedicalOps] Fetching vital sign', { patientId, vitalId })

      const vital = await makeAuthenticatedRequest<VitalSign>(`/patients/${patientId}/vitals/${vitalId}`, {
        method: 'GET'
      })

      logger.debug('[MedicalOps] Vital sign fetched', { patientId, vitalId })
      return vital
    } catch (error) {
      logger.error('[MedicalOps] Error fetching vital sign', error as Error, { patientId, vitalId })
      throw error
    }
  },

  /**
   * Update a vital sign reading
   */
  async updateVital(patientId: string, vitalId: string, updates: Partial<VitalSign>): Promise<VitalSign> {
    try {
      logger.info('[MedicalOps] Updating vital sign', { patientId, vitalId, updates })

      const vital = await makeAuthenticatedRequest<VitalSign>(`/patients/${patientId}/vitals/${vitalId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      })

      logger.info('[MedicalOps] Vital sign updated successfully', { patientId, vitalId })
      return vital
    } catch (error) {
      logger.error('[MedicalOps] Error updating vital sign', error as Error, { patientId, vitalId })
      throw error
    }
  },

  /**
   * Delete a vital sign reading
   */
  async deleteVital(patientId: string, vitalId: string): Promise<void> {
    try {
      logger.info('[MedicalOps] Deleting vital sign', { patientId, vitalId })

      await makeAuthenticatedRequest<void>(`/patients/${patientId}/vitals/${vitalId}`, {
        method: 'DELETE'
      })

      logger.info('[MedicalOps] Vital sign deleted successfully', { patientId, vitalId })
    } catch (error) {
      logger.error('[MedicalOps] Error deleting vital sign', error as Error, { patientId, vitalId })
      throw error
    }
  },

  /**
   * Get latest vital sign of a specific type
   */
  async getLatestVital(patientId: string, type: string): Promise<VitalSign | null> {
    try {
      logger.debug('[MedicalOps] Fetching latest vital', { patientId, type })

      const vitals = await this.getVitals(patientId, { type, limit: 1 })
      return vitals.length > 0 ? vitals[0] : null
    } catch (error) {
      logger.error('[MedicalOps] Error fetching latest vital', error as Error, { patientId, type })
      throw error
    }
  }
}

// ==================== FAMILY COLLABORATION OPERATIONS ====================

export const familyOperations = {
  /**
   * Send a family invitation
   */
  async sendInvitation(invitationData: Omit<FamilyInvitation, 'id' | 'inviteCode' | 'createdAt' | 'expiresAt' | 'status'>): Promise<FamilyInvitation> {
    try {
      logger.info('[MedicalOps] Sending family invitation', { recipientEmail: invitationData.recipientEmail })

      const invitation = await makeAuthenticatedRequest<FamilyInvitation>('/invitations', {
        method: 'POST',
        body: JSON.stringify(invitationData)
      })

      logger.info('[MedicalOps] Invitation sent successfully', { invitationId: invitation.id })
      return invitation
    } catch (error) {
      logger.error('[MedicalOps] Error sending invitation', error as Error)
      throw error
    }
  },

  /**
   * Get all invitations (sent and received)
   */
  async getInvitations(): Promise<{ sent: FamilyInvitation[]; received: FamilyInvitation[] }> {
    try {
      logger.debug('[MedicalOps] Fetching invitations')

      const invitations = await makeAuthenticatedRequest<{ sent: FamilyInvitation[]; received: FamilyInvitation[] }>('/invitations', {
        method: 'GET'
      })

      logger.debug('[MedicalOps] Invitations fetched', {
        sentCount: invitations.sent?.length || 0,
        receivedCount: invitations.received?.length || 0
      })
      return invitations
    } catch (error) {
      logger.error('[MedicalOps] Error fetching invitations', error as Error)
      throw error
    }
  },

  /**
   * Accept an invitation
   */
  async acceptInvitation(invitationId: string): Promise<FamilyMember> {
    try {
      logger.info('[MedicalOps] Accepting invitation', { invitationId })

      const member = await makeAuthenticatedRequest<FamilyMember>(`/invitations/${invitationId}/accept`, {
        method: 'POST'
      })

      logger.info('[MedicalOps] Invitation accepted successfully', { invitationId })
      return member
    } catch (error) {
      logger.error('[MedicalOps] Error accepting invitation', error as Error, { invitationId })
      throw error
    }
  },

  /**
   * Decline an invitation
   */
  async declineInvitation(invitationId: string): Promise<void> {
    try {
      logger.info('[MedicalOps] Declining invitation', { invitationId })

      await makeAuthenticatedRequest<void>(`/invitations/${invitationId}/decline`, {
        method: 'POST'
      })

      logger.info('[MedicalOps] Invitation declined successfully', { invitationId })
    } catch (error) {
      logger.error('[MedicalOps] Error declining invitation', error as Error, { invitationId })
      throw error
    }
  },

  /**
   * Revoke an invitation (sender only)
   */
  async revokeInvitation(invitationId: string): Promise<void> {
    try {
      logger.info('[MedicalOps] Revoking invitation', { invitationId })

      await makeAuthenticatedRequest<void>(`/invitations/${invitationId}/revoke`, {
        method: 'POST'
      })

      logger.info('[MedicalOps] Invitation revoked successfully', { invitationId })
    } catch (error) {
      logger.error('[MedicalOps] Error revoking invitation', error as Error, { invitationId })
      throw error
    }
  },

  /**
   * Resend an invitation email (sender only)
   */
  async resendInvitation(invitationId: string): Promise<void> {
    try {
      logger.info('[MedicalOps] Resending invitation', { invitationId })

      await makeAuthenticatedRequest<void>(`/invitations/${invitationId}/resend`, {
        method: 'POST'
      })

      logger.info('[MedicalOps] Invitation resent successfully', { invitationId })
    } catch (error) {
      logger.error('[MedicalOps] Error resending invitation', error as Error, { invitationId })
      throw error
    }
  },

  /**
   * Get family members for a specific patient
   */
  async getFamilyMembers(patientId: string): Promise<FamilyMember[]> {
    try {
      logger.debug('[MedicalOps] Fetching family members', { patientId })

      const members = await makeAuthenticatedRequest<FamilyMember[]>(`/patients/${patientId}/family`, {
        method: 'GET'
      })

      logger.debug('[MedicalOps] Family members fetched', { patientId, count: members?.length || 0 })
      return members || []
    } catch (error) {
      logger.error('[MedicalOps] Error fetching family members', error as Error, { patientId })
      throw error
    }
  },

  /**
   * Update family member permissions
   */
  async updateMemberPermissions(patientId: string, memberId: string, permissions: Partial<FamilyMember>): Promise<FamilyMember> {
    try {
      logger.info('[MedicalOps] Updating member permissions', { patientId, memberId })

      const member = await makeAuthenticatedRequest<FamilyMember>(`/patients/${patientId}/family/${memberId}`, {
        method: 'PUT',
        body: JSON.stringify(permissions)
      })

      logger.info('[MedicalOps] Member permissions updated successfully', { patientId, memberId })
      return member
    } catch (error) {
      logger.error('[MedicalOps] Error updating permissions', error as Error, { patientId, memberId })
      throw error
    }
  },

  /**
   * Remove family member access
   */
  async removeFamilyMember(patientId: string, memberId: string): Promise<void> {
    try {
      logger.info('[MedicalOps] Removing family member', { patientId, memberId })

      await makeAuthenticatedRequest<void>(`/patients/${patientId}/family/${memberId}`, {
        method: 'DELETE'
      })

      logger.info('[MedicalOps] Family member removed successfully', { patientId, memberId })
    } catch (error) {
      logger.error('[MedicalOps] Error removing family member', error as Error, { patientId, memberId })
      throw error
    }
  },

  /**
   * Assign role to family member
   */
  async assignRole(memberId: string, newRole: string): Promise<FamilyMember> {
    try {
      logger.info('[MedicalOps] Assigning role to family member', { memberId, newRole })

      const member = await makeAuthenticatedRequest<FamilyMember>(`/family-members/${memberId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ familyRole: newRole })
      })

      logger.info('[MedicalOps] Role assigned successfully', { memberId, newRole })
      return member
    } catch (error) {
      logger.error('[MedicalOps] Error assigning role', error as Error, { memberId, newRole })
      throw error
    }
  },

  /**
   * Transfer Account Owner status to another family member
   */
  async transferOwnership(newOwnerId: string): Promise<{ oldOwner: FamilyMember; newOwner: FamilyMember }> {
    try {
      logger.info('[MedicalOps] Transferring ownership', { newOwnerId })

      const result = await makeAuthenticatedRequest<{ oldOwner: FamilyMember; newOwner: FamilyMember }>(
        '/family-members/transfer-ownership',
        {
          method: 'POST',
          body: JSON.stringify({ newOwnerId })
        }
      )

      logger.info('[MedicalOps] Ownership transferred successfully', { newOwnerId })
      return result
    } catch (error) {
      logger.error('[MedicalOps] Error transferring ownership', error as Error, { newOwnerId })
      throw error
    }
  },

  /**
   * Get family hierarchy (all family members across all patients)
   */
  async getFamilyHierarchy(): Promise<FamilyMember[]> {
    try {
      logger.debug('[MedicalOps] Fetching family hierarchy')

      const response = await makeAuthenticatedRequest<{
        accountOwner: any
        familyMembers: FamilyMember[]
        roleHierarchy: any[]
        summary: any
      }>('/family/hierarchy', {
        method: 'GET'
      })

      logger.debug('[MedicalOps] Family hierarchy fetched', { count: response?.familyMembers?.length || 0 })
      return response?.familyMembers || []
    } catch (error) {
      logger.error('[MedicalOps] Error fetching family hierarchy', error as Error)
      throw error
    }
  },

  /**
   * Update family member (role, patient access, permissions)
   */
  async updateMember(memberId: string, updates: {
    role?: FamilyRole
    patientsAccess?: string[]
    patientPermissions?: { [patientId: string]: any }
  }): Promise<FamilyMember> {
    try {
      logger.info('[MedicalOps] Updating family member', { memberId, updates })

      const member = await makeAuthenticatedRequest<FamilyMember>(`/family/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      })

      logger.info('[MedicalOps] Family member updated successfully', { memberId })
      return member
    } catch (error) {
      logger.error('[MedicalOps] Error updating family member', error as Error, { memberId })
      throw error
    }
  },

  /**
   * Remove family member from account
   */
  async removeMember(memberId: string): Promise<void> {
    try {
      logger.info('[MedicalOps] Removing family member', { memberId })

      await makeAuthenticatedRequest<void>(`/family/members/${memberId}`, {
        method: 'DELETE'
      })

      logger.info('[MedicalOps] Family member removed successfully', { memberId })
    } catch (error) {
      logger.error('[MedicalOps] Error removing family member', error as Error, { memberId })
      throw error
    }
  },

  /**
   * Migrate patient-level family member records (backfill for existing members)
   */
  async migratePatientRecords(): Promise<{
    totalFamilyMembers: number
    recordsCreated: number
    recordsSkipped: number
    errors: string[]
    details: any[]
  }> {
    try {
      logger.info('[MedicalOps] Running family member migration')

      const result = await makeAuthenticatedRequest<{
        totalFamilyMembers: number
        recordsCreated: number
        recordsSkipped: number
        errors: string[]
        details: any[]
      }>('/family/migrate-patient-records', {
        method: 'POST'
      })

      logger.info('[MedicalOps] Migration completed', {
        recordsCreated: result.recordsCreated,
        recordsSkipped: result.recordsSkipped
      })
      return result
    } catch (error) {
      logger.error('[MedicalOps] Error running migration', error as Error)
      throw error
    }
  }
}

// ==================== PROVIDER OPERATIONS ====================

export const providerOperations = {
  /**
   * Create a new provider
   */
  async createProvider(providerData: Omit<Provider, 'id' | 'userId' | 'addedAt' | 'patientsServed'>): Promise<Provider> {
    try {
      logger.info('[MedicalOps] Creating provider', { name: providerData.name, type: providerData.type })

      const provider = await makeAuthenticatedRequest<Provider>('/providers', {
        method: 'POST',
        body: JSON.stringify(providerData)
      })

      logger.info('[MedicalOps] Provider created successfully', { providerId: provider.id })
      return provider
    } catch (error) {
      logger.error('[MedicalOps] Error creating provider', error as Error)
      throw error
    }
  },

  /**
   * Get all providers for the current user
   */
  async getProviders(): Promise<Provider[]> {
    try {
      logger.debug('[MedicalOps] Fetching all providers')

      const providers = await makeAuthenticatedRequest<Provider[]>('/providers')

      logger.info('[MedicalOps] Providers fetched successfully', { count: providers.length })
      return providers
    } catch (error) {
      logger.error('[MedicalOps] Error fetching providers', error as Error)
      throw error
    }
  },

  /**
   * Get providers for a specific patient
   */
  async getProvidersByPatient(patientId: string): Promise<Provider[]> {
    try {
      logger.debug('[MedicalOps] Fetching providers for patient', { patientId })

      const providers = await makeAuthenticatedRequest<Provider[]>(`/providers?patientId=${patientId}`)

      logger.info('[MedicalOps] Patient providers fetched', { patientId, count: providers.length })
      return providers
    } catch (error) {
      logger.error('[MedicalOps] Error fetching patient providers', error as Error, { patientId })
      throw error
    }
  },

  /**
   * Get a single provider by ID
   */
  async getProvider(providerId: string): Promise<Provider> {
    try {
      logger.debug('[MedicalOps] Fetching provider', { providerId })

      const provider = await makeAuthenticatedRequest<Provider>(`/providers/${providerId}`)

      logger.info('[MedicalOps] Provider fetched successfully', { providerId })
      return provider
    } catch (error) {
      logger.error('[MedicalOps] Error fetching provider', error as Error, { providerId })
      throw error
    }
  },

  /**
   * Update a provider
   */
  async updateProvider(providerId: string, updates: Partial<Provider>): Promise<Provider> {
    try {
      logger.info('[MedicalOps] Updating provider', { providerId, updates })

      const provider = await makeAuthenticatedRequest<Provider>(`/providers/${providerId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      })

      logger.info('[MedicalOps] Provider updated successfully', { providerId })
      return provider
    } catch (error) {
      logger.error('[MedicalOps] Error updating provider', error as Error, { providerId })
      throw error
    }
  },

  /**
   * Delete a provider
   */
  async deleteProvider(providerId: string): Promise<void> {
    try {
      logger.info('[MedicalOps] Deleting provider', { providerId })

      await makeAuthenticatedRequest<void>(`/providers/${providerId}`, {
        method: 'DELETE'
      })

      logger.info('[MedicalOps] Provider deleted successfully', { providerId })
    } catch (error) {
      logger.error('[MedicalOps] Error deleting provider', error as Error, { providerId })
      throw error
    }
  },

  /**
   * Link a provider to a patient
   */
  async linkProviderToPatient(providerId: string, patientId: string): Promise<Provider> {
    try {
      logger.info('[MedicalOps] Linking provider to patient', { providerId, patientId })

      const provider = await makeAuthenticatedRequest<Provider>(`/providers/${providerId}/patients`, {
        method: 'POST',
        body: JSON.stringify({ patientId })
      })

      logger.info('[MedicalOps] Provider linked to patient', { providerId, patientId })
      return provider
    } catch (error) {
      logger.error('[MedicalOps] Error linking provider to patient', error as Error, { providerId, patientId })
      throw error
    }
  },

  /**
   * Unlink a provider from a patient
   */
  async unlinkProviderFromPatient(providerId: string, patientId: string): Promise<Provider> {
    try {
      logger.info('[MedicalOps] Unlinking provider from patient', { providerId, patientId })

      const provider = await makeAuthenticatedRequest<Provider>(`/providers/${providerId}/patients/${patientId}`, {
        method: 'DELETE'
      })

      logger.info('[MedicalOps] Provider unlinked from patient', { providerId, patientId })
      return provider
    } catch (error) {
      logger.error('[MedicalOps] Error unlinking provider from patient', error as Error, { providerId, patientId })
      throw error
    }
  }
}

// ==================== APPOINTMENT OPERATIONS ====================

export const appointmentOperations = {
  /**
   * Create a new appointment
   */
  async createAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'createdBy' | 'lastModified' | 'modifiedBy' | 'conflictSeverity'>): Promise<Appointment> {
    try {
      logger.info('[MedicalOps] Creating appointment', { patientId: appointmentData.patientId, providerId: appointmentData.providerId })

      const appointment = await makeAuthenticatedRequest<Appointment>('/appointments', {
        method: 'POST',
        body: JSON.stringify(appointmentData)
      })

      logger.info('[MedicalOps] Appointment created successfully', { appointmentId: appointment.id })
      return appointment
    } catch (error) {
      logger.error('[MedicalOps] Error creating appointment', error as Error)
      throw error
    }
  },

  /**
   * Get all appointments (optionally filter by patient or provider)
   */
  async getAppointments(options?: { patientId?: string; providerId?: string; startDate?: string; endDate?: string }): Promise<Appointment[]> {
    try {
      logger.debug('[MedicalOps] Fetching appointments', options)

      const params = new URLSearchParams()
      if (options?.patientId) params.append('patientId', options.patientId)
      if (options?.providerId) params.append('providerId', options.providerId)
      if (options?.startDate) params.append('startDate', options.startDate)
      if (options?.endDate) params.append('endDate', options.endDate)

      const appointments = await makeAuthenticatedRequest<Appointment[]>(`/appointments?${params.toString()}`)

      logger.info('[MedicalOps] Appointments fetched successfully', { count: appointments.length })
      return appointments
    } catch (error) {
      logger.error('[MedicalOps] Error fetching appointments', error as Error)
      throw error
    }
  },

  /**
   * Get a single appointment by ID
   */
  async getAppointment(appointmentId: string): Promise<Appointment> {
    try {
      logger.debug('[MedicalOps] Fetching appointment', { appointmentId })

      const appointment = await makeAuthenticatedRequest<Appointment>(`/appointments/${appointmentId}`)

      logger.info('[MedicalOps] Appointment fetched successfully', { appointmentId })
      return appointment
    } catch (error) {
      logger.error('[MedicalOps] Error fetching appointment', error as Error, { appointmentId })
      throw error
    }
  },

  /**
   * Update an appointment
   */
  async updateAppointment(appointmentId: string, updates: Partial<Appointment>): Promise<Appointment> {
    try {
      logger.info('[MedicalOps] Updating appointment', { appointmentId, updates })

      const appointment = await makeAuthenticatedRequest<Appointment>(`/appointments/${appointmentId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      })

      logger.info('[MedicalOps] Appointment updated successfully', { appointmentId })
      return appointment
    } catch (error) {
      logger.error('[MedicalOps] Error updating appointment', error as Error, { appointmentId })
      throw error
    }
  },

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(appointmentId: string, status: Appointment['status']): Promise<Appointment> {
    try {
      logger.info('[MedicalOps] Updating appointment status', { appointmentId, status })

      const appointment = await makeAuthenticatedRequest<Appointment>(`/appointments/${appointmentId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      })

      logger.info('[MedicalOps] Appointment status updated', { appointmentId, status })
      return appointment
    } catch (error) {
      logger.error('[MedicalOps] Error updating appointment status', error as Error, { appointmentId })
      throw error
    }
  },

  /**
   * Cancel an appointment
   */
  async cancelAppointment(appointmentId: string, reason?: string): Promise<Appointment> {
    try {
      logger.info('[MedicalOps] Cancelling appointment', { appointmentId, reason })

      const appointment = await makeAuthenticatedRequest<Appointment>(`/appointments/${appointmentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancellationReason: reason
        })
      })

      logger.info('[MedicalOps] Appointment cancelled', { appointmentId })
      return appointment
    } catch (error) {
      logger.error('[MedicalOps] Error cancelling appointment', error as Error, { appointmentId })
      throw error
    }
  },

  /**
   * Delete an appointment
   */
  async deleteAppointment(appointmentId: string): Promise<void> {
    try {
      logger.info('[MedicalOps] Deleting appointment', { appointmentId })

      await makeAuthenticatedRequest<void>(`/appointments/${appointmentId}`, {
        method: 'DELETE'
      })

      logger.info('[MedicalOps] Appointment deleted successfully', { appointmentId })
    } catch (error) {
      logger.error('[MedicalOps] Error deleting appointment', error as Error, { appointmentId })
      throw error
    }
  }
}

// ==================== WEIGHT LOG OPERATIONS ====================

export const weightLogOperations = {
  /**
   * Log a new weight entry for a patient
   */
  async logWeight(patientId: string, weightData: Omit<WeightLog, 'id' | 'patientId' | 'userId' | 'loggedBy'>): Promise<WeightLog> {
    try {
      logger.info('[MedicalOps] Logging weight', { patientId, weight: weightData.weight })

      const weightLog = await makeAuthenticatedRequest<WeightLog>(`/patients/${patientId}/weight-logs`, {
        method: 'POST',
        body: JSON.stringify(weightData)
      })

      logger.info('[MedicalOps] Weight logged successfully', { patientId, logId: weightLog.id })
      return weightLog
    } catch (error) {
      logger.error('[MedicalOps] Error logging weight', error as Error, { patientId })
      throw error
    }
  },

  /**
   * Get weight logs for a patient
   */
  async getWeightLogs(patientId: string, options?: {
    limit?: number
    startDate?: string
    endDate?: string
  }): Promise<WeightLog[]> {
    try {
      logger.debug('[MedicalOps] Fetching weight logs', { patientId, options })

      const queryParams = new URLSearchParams()
      if (options?.limit) queryParams.append('limit', options.limit.toString())
      if (options?.startDate) queryParams.append('startDate', options.startDate)
      if (options?.endDate) queryParams.append('endDate', options.endDate)

      const url = `/patients/${patientId}/weight-logs${queryParams.toString() ? `?${queryParams}` : ''}`

      const weightLogs = await makeAuthenticatedRequest<WeightLog[]>(url, {
        method: 'GET'
      })

      logger.debug('[MedicalOps] Weight logs fetched', { patientId, count: weightLogs?.length || 0 })
      return weightLogs || []
    } catch (error) {
      logger.error('[MedicalOps] Error fetching weight logs', error as Error, { patientId })
      throw error
    }
  }
}

// ==================== MEAL LOG OPERATIONS ====================

export const mealLogOperations = {
  /**
   * Log a new meal for a patient
   */
  async logMeal(patientId: string, mealData: Omit<MealLog, 'id' | 'patientId' | 'userId' | 'loggedBy'>): Promise<MealLog> {
    try {
      logger.info('[MedicalOps] Logging meal', { patientId, mealType: mealData.mealType })

      const mealLog = await makeAuthenticatedRequest<MealLog>(`/patients/${patientId}/meal-logs`, {
        method: 'POST',
        body: JSON.stringify(mealData)
      })

      logger.info('[MedicalOps] Meal logged successfully', { patientId, logId: mealLog.id })
      return mealLog
    } catch (error) {
      logger.error('[MedicalOps] Error logging meal', error as Error, { patientId })
      throw error
    }
  },

  /**
   * Get meal logs for a patient
   */
  async getMealLogs(patientId: string, options?: {
    limit?: number
    mealType?: string
    startDate?: string
    endDate?: string
  }): Promise<MealLog[]> {
    try {
      logger.debug('[MedicalOps] Fetching meal logs', { patientId, options })

      const queryParams = new URLSearchParams()
      if (options?.limit) queryParams.append('limit', options.limit.toString())
      if (options?.mealType) queryParams.append('mealType', options.mealType)
      if (options?.startDate) queryParams.append('startDate', options.startDate)
      if (options?.endDate) queryParams.append('endDate', options.endDate)

      const url = `/patients/${patientId}/meal-logs${queryParams.toString() ? `?${queryParams}` : ''}`

      const mealLogs = await makeAuthenticatedRequest<MealLog[]>(url, {
        method: 'GET'
      })

      logger.debug('[MedicalOps] Meal logs fetched', { patientId, count: mealLogs?.length || 0 })
      return mealLogs || []
    } catch (error) {
      logger.error('[MedicalOps] Error fetching meal logs', error as Error, { patientId })
      throw error
    }
  },

  /**
   * Delete a meal log for a patient
   */
  async deleteMealLog(patientId: string, logId: string): Promise<void> {
    try {
      logger.debug('[MedicalOps] Deleting meal log', { patientId, logId })

      await makeAuthenticatedRequest(`/patients/${patientId}/meal-logs/${logId}`, {
        method: 'DELETE'
      })

      logger.info('[MedicalOps] Meal log deleted successfully', { patientId, logId })
    } catch (error) {
      logger.error('[MedicalOps] Error deleting meal log', error as Error, { patientId, logId })
      throw error
    }
  }
}

// ==================== STEP LOG OPERATIONS ====================

export const stepLogOperations = {
  /**
   * Log steps for a patient
   */
  async logSteps(patientId: string, stepData: Omit<StepLog, 'id' | 'patientId' | 'userId' | 'loggedBy' | 'loggedAt'>): Promise<StepLog> {
    try {
      logger.info('[MedicalOps] Logging steps', { patientId, steps: stepData.steps, date: stepData.date })

      const stepLog = await makeAuthenticatedRequest<StepLog>(`/patients/${patientId}/step-logs`, {
        method: 'POST',
        body: JSON.stringify(stepData)
      })

      logger.info('[MedicalOps] Steps logged successfully', { patientId, logId: stepLog.id })
      return stepLog
    } catch (error) {
      logger.error('[MedicalOps] Error logging steps', error as Error, { patientId })
      throw error
    }
  },

  /**
   * Get step logs for a patient
   */
  async getStepLogs(patientId: string, options?: {
    limit?: number
    source?: string
    startDate?: string
    endDate?: string
  }): Promise<StepLog[]> {
    try {
      logger.debug('[MedicalOps] Fetching step logs', { patientId, options })

      const queryParams = new URLSearchParams()
      if (options?.limit) queryParams.append('limit', options.limit.toString())
      if (options?.source) queryParams.append('source', options.source)
      if (options?.startDate) queryParams.append('startDate', options.startDate)
      if (options?.endDate) queryParams.append('endDate', options.endDate)

      const url = `/patients/${patientId}/step-logs${queryParams.toString() ? `?${queryParams}` : ''}`

      const stepLogs = await makeAuthenticatedRequest<StepLog[]>(url, {
        method: 'GET'
      })

      logger.debug('[MedicalOps] Step logs fetched', { patientId, count: stepLogs?.length || 0 })
      return stepLogs || []
    } catch (error) {
      logger.error('[MedicalOps] Error fetching step logs', error as Error, { patientId })
      throw error
    }
  }
}

// ==================== MEDICATION OPERATIONS ====================

export const medicationOperations = {
  /**
   * Add a new medication for a patient
   */
  async addMedication(patientId: string, medicationData: Omit<PatientMedication, 'id' | 'patientId' | 'userId' | 'addedBy' | 'addedAt' | 'lastModified'>): Promise<PatientMedication> {
    try {
      logger.info('[MedicalOps] Adding medication', { patientId, name: medicationData.name })

      const medication = await makeAuthenticatedRequest<PatientMedication>(`/patients/${patientId}/medications`, {
        method: 'POST',
        body: JSON.stringify(medicationData)
      })

      logger.info('[MedicalOps] Medication added successfully', { patientId, medicationId: medication.id })
      return medication
    } catch (error) {
      logger.error('[MedicalOps] Error adding medication', error as Error, { patientId })
      throw error
    }
  },

  /**
   * Get all medications for a patient
   */
  async getMedications(patientId: string): Promise<PatientMedication[]> {
    try {
      logger.debug('[MedicalOps] Fetching medications', { patientId })

      const medications = await makeAuthenticatedRequest<PatientMedication[]>(`/patients/${patientId}/medications`, {
        method: 'GET'
      })

      logger.debug('[MedicalOps] Medications fetched', { patientId, count: medications?.length || 0 })
      return medications || []
    } catch (error) {
      logger.error('[MedicalOps] Error fetching medications', error as Error, { patientId })
      throw error
    }
  },

  /**
   * Listen to real-time medication updates for a patient
   * NOTE: Uses API call instead of direct Firestore listener because medications are stored in
   * users/{userId}/patients/{patientId}/medications which requires knowing the userId
   * For DRY real-time updates, use polling or switch to top-level collection
   * @returns Unsubscribe function to stop listening
   */
  listenToMedications(
    patientId: string,
    onUpdate: (medications: PatientMedication[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    try {
      // Safety check: don't set up listener with invalid patientId
      if (!patientId || patientId.length === 0) {
        logger.warn('[MedicalOps] Cannot set up medication listener with empty patientId')
        // Return a no-op unsubscribe function
        return () => {}
      }

      logger.debug('[MedicalOps] Setting up polling-based medication updates', { patientId })

      // Use API polling since we can't query nested collection without userId
      const fetchMedications = async () => {
        try {
          const data = await this.getMedications(patientId)
          onUpdate(data || []) // Handle null/undefined as empty array
        } catch (error) {
          // Silently handle 404 or "no medications" - this is normal
          const errorMessage = (error as any)?.message || ''
          const is404 = (error as any)?.status === 404
          const isNoMedications = errorMessage.includes('no medications') || errorMessage.includes('not found')

          if (!is404 && !isNoMedications) {
            // Only report actual errors, not missing medications
            logger.warn('[MedicalOps] Medication fetch issue (non-critical)', { patientId, errorMessage })
            if (onError) {
              onError(error as Error)
            }
          } else {
            // Patient has no medications - this is fine, return empty array
            onUpdate([])
          }
        }
      }

      // Initial fetch
      fetchMedications()

      // Poll every 5 seconds for updates
      const intervalId = setInterval(fetchMedications, 5000)

      // Return unsubscribe function that clears the interval
      return () => {
        logger.debug('[MedicalOps] Cleaning up medication polling', { patientId })
        clearInterval(intervalId)
      }
    } catch (error) {
      logger.error('[MedicalOps] Error setting up medication polling', error as Error, { patientId })
      throw error
    }
  },

  /**
   * DEPRECATED: Old onSnapshot-based listener (doesn't work with nested collections)
   */
  _listenToMedicationsFirestore(
    patientId: string,
    onUpdate: (medications: PatientMedication[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    try {
      logger.debug('[MedicalOps] Setting up Firestore listener for medications', { patientId })

      // This queries top-level collection which may not exist
      const medicationsRef = collection(db, 'medications')
      const q = query(medicationsRef, where('patientId', '==', patientId))

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const medications: PatientMedication[] = []
          snapshot.forEach((doc) => {
            medications.push({ id: doc.id, ...doc.data() } as PatientMedication)
          })

          logger.debug('[MedicalOps] Medications updated via listener', {
            patientId,
            count: medications.length
          })

          onUpdate(medications)
        },
        (error) => {
          logger.error('[MedicalOps] Medication listener error', error as Error, {
            patientId,
            errorMessage: (error as any)?.message,
            errorCode: (error as any)?.code,
            errorName: (error as any)?.name
          })
          if (onError) {
            onError(error as Error)
          }
        }
      )

      return unsubscribe
    } catch (error) {
      logger.error('[MedicalOps] Error setting up medication listener', error as Error, { patientId })
      throw error
    }
  },

  /**
   * Update a medication
   */
  async updateMedication(patientId: string, medicationId: string, updates: Partial<PatientMedication>): Promise<PatientMedication> {
    try {
      logger.info('[MedicalOps] Updating medication', { patientId, medicationId })

      const medication = await makeAuthenticatedRequest<PatientMedication>(`/patients/${patientId}/medications/${medicationId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      })

      logger.info('[MedicalOps] Medication updated successfully', { patientId, medicationId })
      return medication
    } catch (error) {
      logger.error('[MedicalOps] Error updating medication', error as Error, { patientId, medicationId })
      throw error
    }
  },

  /**
   * Delete a medication
   */
  async deleteMedication(patientId: string, medicationId: string): Promise<void> {
    try {
      logger.info('[MedicalOps] Deleting medication', { patientId, medicationId })

      await makeAuthenticatedRequest<void>(`/patients/${patientId}/medications/${medicationId}`, {
        method: 'DELETE'
      })

      logger.info('[MedicalOps] Medication deleted successfully', { patientId, medicationId })
    } catch (error) {
      logger.error('[MedicalOps] Error deleting medication', error as Error, { patientId, medicationId })
      throw error
    }
  },

  /**
   * Log a medication dose as taken
   */
  async logDose(patientId: string, medicationId: string, doseData: {
    takenAt?: string
    notes?: string
  }): Promise<PatientMedication> {
    try {
      logger.info('[MedicalOps] Logging medication dose', { patientId, medicationId })

      const medication = await makeAuthenticatedRequest<PatientMedication>(
        `/patients/${patientId}/medications/${medicationId}/log-dose`,
        {
          method: 'POST',
          body: JSON.stringify(doseData)
        }
      )

      logger.info('[MedicalOps] Dose logged successfully', { patientId, medicationId })
      return medication
    } catch (error) {
      logger.error('[MedicalOps] Error logging dose', error as Error, { patientId, medicationId })
      throw error
    }
  },

  /**
   * Get medication adherence logs
   */
  async getAdherenceLogs(patientId: string, medicationId: string, options?: {
    limit?: number
    startDate?: string
    endDate?: string
  }): Promise<any[]> {
    try {
      logger.debug('[MedicalOps] Fetching adherence logs', { patientId, medicationId, options })

      const queryParams = new URLSearchParams()
      if (options?.limit) queryParams.append('limit', options.limit.toString())
      if (options?.startDate) queryParams.append('startDate', options.startDate)
      if (options?.endDate) queryParams.append('endDate', options.endDate)

      const url = `/patients/${patientId}/medications/${medicationId}/adherence-logs${
        queryParams.toString() ? `?${queryParams}` : ''
      }`

      const logs = await makeAuthenticatedRequest<any[]>(url, {
        method: 'GET'
      })

      logger.debug('[MedicalOps] Adherence logs fetched', { patientId, medicationId, count: logs?.length || 0 })
      return logs || []
    } catch (error) {
      logger.error('[MedicalOps] Error fetching adherence logs', error as Error, { patientId, medicationId })
      throw error
    }
  }
}

// ==================== EXPORT ALL OPERATIONS ====================

// ==================== DOCUMENT OPERATIONS ====================

export const documentOperations = {
  /**
   * Upload a document for a patient
   */
  async uploadDocument(patientId: string, documentData: Omit<PatientDocument, 'id' | 'patientId' | 'userId' | 'uploadedAt' | 'uploadedBy'>): Promise<PatientDocument> {
    try {
      logger.info('[MedicalOps] Uploading document', { patientId, name: documentData.name })

      const document = await makeAuthenticatedRequest<PatientDocument>(`/patients/${patientId}/documents`, {
        method: 'POST',
        body: JSON.stringify(documentData)
      })

      logger.info('[MedicalOps] Document uploaded successfully', { patientId, documentId: document.id })
      return document
    } catch (error) {
      logger.error('[MedicalOps] Error uploading document', error as Error, { patientId })
      throw error
    }
  },

  /**
   * Get all documents for a patient
   */
  async getDocuments(patientId: string): Promise<PatientDocument[]> {
    try {
      logger.debug('[MedicalOps] Fetching documents', { patientId })

      const documents = await makeAuthenticatedRequest<PatientDocument[]>(`/patients/${patientId}/documents`, {
        method: 'GET'
      })

      logger.debug('[MedicalOps] Documents fetched', { patientId, count: documents?.length || 0 })
      return documents || []
    } catch (error) {
      logger.error('[MedicalOps] Error fetching documents', error as Error, { patientId })
      throw error
    }
  },

  /**
   * Delete a document
   */
  async deleteDocument(patientId: string, documentId: string): Promise<void> {
    try {
      logger.debug('[MedicalOps] Deleting document', { patientId, documentId })

      await makeAuthenticatedRequest(`/patients/${patientId}/documents/${documentId}`, {
        method: 'DELETE'
      })

      logger.info('[MedicalOps] Document deleted successfully', { patientId, documentId })
    } catch (error) {
      logger.error('[MedicalOps] Error deleting document', error as Error, { patientId, documentId })
      throw error
    }
  }
}

export const medicalOperations = {
  patients: patientOperations,
  vitals: vitalOperations,
  family: familyOperations,
  providers: providerOperations,
  appointments: appointmentOperations,
  weightLogs: weightLogOperations,
  mealLogs: mealLogOperations,
  stepLogs: stepLogOperations,
  medications: medicationOperations,
  documents: documentOperations
}
