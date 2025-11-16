/**
 * Medical Records System - Firestore Operations
 *
 * CRUD operations for patients, vital signs, providers, and appointments
 * Based on MEDICAL_RECORDS_PRD.json - Slice S1 (Single Patient Vitals)
 */

'use client'

import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/api-client'
import type {
  PatientProfile,
  VitalSign,
  Provider,
  Appointment,
  FamilyMember,
  FamilyInvitation
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

      const patient = await makeAuthenticatedRequest<PatientProfile>(`/api/patients/${patientId}`, {
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

      const patient = await makeAuthenticatedRequest<PatientProfile>(`/api/patients/${patientId}`, {
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

      await makeAuthenticatedRequest<void>(`/api/patients/${patientId}`, {
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

      const vital = await makeAuthenticatedRequest<VitalSign>(`/api/patients/${patientId}/vitals`, {
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

      const url = `/api/patients/${patientId}/vitals${queryParams.toString() ? `?${queryParams}` : ''}`

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

      const vital = await makeAuthenticatedRequest<VitalSign>(`/api/patients/${patientId}/vitals/${vitalId}`, {
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

      const vital = await makeAuthenticatedRequest<VitalSign>(`/api/patients/${patientId}/vitals/${vitalId}`, {
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

      await makeAuthenticatedRequest<void>(`/api/patients/${patientId}/vitals/${vitalId}`, {
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

      const member = await makeAuthenticatedRequest<FamilyMember>(`/api/invitations/${invitationId}/accept`, {
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

      await makeAuthenticatedRequest<void>(`/api/invitations/${invitationId}/decline`, {
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

      await makeAuthenticatedRequest<void>(`/api/invitations/${invitationId}/revoke`, {
        method: 'POST'
      })

      logger.info('[MedicalOps] Invitation revoked successfully', { invitationId })
    } catch (error) {
      logger.error('[MedicalOps] Error revoking invitation', error as Error, { invitationId })
      throw error
    }
  },

  /**
   * Get family members for a specific patient
   */
  async getFamilyMembers(patientId: string): Promise<FamilyMember[]> {
    try {
      logger.debug('[MedicalOps] Fetching family members', { patientId })

      const members = await makeAuthenticatedRequest<FamilyMember[]>(`/api/patients/${patientId}/family`, {
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

      const member = await makeAuthenticatedRequest<FamilyMember>(`/api/patients/${patientId}/family/${memberId}`, {
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

      await makeAuthenticatedRequest<void>(`/api/patients/${patientId}/family/${memberId}`, {
        method: 'DELETE'
      })

      logger.info('[MedicalOps] Family member removed successfully', { patientId, memberId })
    } catch (error) {
      logger.error('[MedicalOps] Error removing family member', error as Error, { patientId, memberId })
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

      const providers = await makeAuthenticatedRequest<Provider[]>(`/api/providers?patientId=${patientId}`)

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

      const provider = await makeAuthenticatedRequest<Provider>(`/api/providers/${providerId}`)

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

      const provider = await makeAuthenticatedRequest<Provider>(`/api/providers/${providerId}`, {
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

      await makeAuthenticatedRequest<void>(`/api/providers/${providerId}`, {
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

      const provider = await makeAuthenticatedRequest<Provider>(`/api/providers/${providerId}/patients`, {
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

      const provider = await makeAuthenticatedRequest<Provider>(`/api/providers/${providerId}/patients/${patientId}`, {
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

      const appointments = await makeAuthenticatedRequest<Appointment[]>(`/api/appointments?${params.toString()}`)

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

      const appointment = await makeAuthenticatedRequest<Appointment>(`/api/appointments/${appointmentId}`)

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

      const appointment = await makeAuthenticatedRequest<Appointment>(`/api/appointments/${appointmentId}`, {
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

      const appointment = await makeAuthenticatedRequest<Appointment>(`/api/appointments/${appointmentId}/status`, {
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

      const appointment = await makeAuthenticatedRequest<Appointment>(`/api/appointments/${appointmentId}`, {
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

      await makeAuthenticatedRequest<void>(`/api/appointments/${appointmentId}`, {
        method: 'DELETE'
      })

      logger.info('[MedicalOps] Appointment deleted successfully', { appointmentId })
    } catch (error) {
      logger.error('[MedicalOps] Error deleting appointment', error as Error, { appointmentId })
      throw error
    }
  }
}

// ==================== EXPORT ALL OPERATIONS ====================

export const medicalOperations = {
  patients: patientOperations,
  vitals: vitalOperations,
  family: familyOperations,
  providers: providerOperations,
  appointments: appointmentOperations
}
