/**
 * Healthcare Provider Operations
 * CRUD operations for managing healthcare providers and communications
 */

import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { HealthcareProvider, ProviderCommunication, HealthReport } from '@/types/providers'
import { logger } from '@/lib/logger'

/**
 * Provider Operations
 */
export const providerOperations = {
  /**
   * Get all providers for a patient
   */
  async getProviders(patientId: string): Promise<HealthcareProvider[]> {
    try {
      const providersRef = collection(db, 'healthcareProviders')
      const q = query(
        providersRef,
        where('patientId', '==', patientId),
        orderBy('name', 'asc')
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HealthcareProvider))
    } catch (error) {
      logger.error('[Provider Operations] Error fetching providers', error as Error)
      throw error
    }
  },

  /**
   * Get a single provider by ID
   */
  async getProvider(providerId: string): Promise<HealthcareProvider | null> {
    try {
      const providerRef = doc(db, 'healthcareProviders', providerId)
      const snapshot = await getDoc(providerRef)

      if (!snapshot.exists()) {
        return null
      }

      return {
        id: snapshot.id,
        ...snapshot.data()
      } as HealthcareProvider
    } catch (error) {
      logger.error('[Provider Operations] Error fetching provider', error as Error)
      throw error
    }
  },

  /**
   * Create a new provider
   */
  async createProvider(
    provider: Omit<HealthcareProvider, 'id'>
  ): Promise<HealthcareProvider> {
    try {
      const providersRef = collection(db, 'healthcareProviders')
      const docRef = await addDoc(providersRef, {
        ...provider,
        addedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })

      const newProvider = await providerOperations.getProvider(docRef.id)
      if (!newProvider) {
        throw new Error('Failed to retrieve created provider')
      }

      logger.info('[Provider Operations] Provider created', { providerId: docRef.id })
      return newProvider
    } catch (error) {
      logger.error('[Provider Operations] Error creating provider', error as Error)
      throw error
    }
  },

  /**
   * Update an existing provider
   */
  async updateProvider(
    providerId: string,
    updates: Partial<Omit<HealthcareProvider, 'id' | 'patientId' | 'addedBy' | 'addedAt'>>
  ): Promise<void> {
    try {
      const providerRef = doc(db, 'healthcareProviders', providerId)
      await updateDoc(providerRef, {
        ...updates,
        updatedAt: Timestamp.now()
      })

      logger.info('[Provider Operations] Provider updated', { providerId })
    } catch (error) {
      logger.error('[Provider Operations] Error updating provider', error as Error)
      throw error
    }
  },

  /**
   * Delete a provider
   */
  async deleteProvider(providerId: string): Promise<void> {
    try {
      const providerRef = doc(db, 'healthcareProviders', providerId)
      await deleteDoc(providerRef)

      logger.info('[Provider Operations] Provider deleted', { providerId })
    } catch (error) {
      logger.error('[Provider Operations] Error deleting provider', error as Error)
      throw error
    }
  },

  /**
   * Find provider by email
   */
  async findProviderByEmail(patientId: string, email: string): Promise<HealthcareProvider | null> {
    try {
      const providersRef = collection(db, 'healthcareProviders')
      const q = query(
        providersRef,
        where('patientId', '==', patientId),
        where('email', '==', email)
      )

      const snapshot = await getDocs(q)
      if (snapshot.empty) {
        return null
      }

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as HealthcareProvider
    } catch (error) {
      logger.error('[Provider Operations] Error finding provider by email', error as Error)
      throw error
    }
  },

  /**
   * Update last contact information
   */
  async updateLastContact(
    providerId: string,
    contactType: 'email' | 'call' | 'fax'
  ): Promise<void> {
    try {
      const providerRef = doc(db, 'healthcareProviders', providerId)
      await updateDoc(providerRef, {
        lastContactDate: Timestamp.now(),
        lastContactType: contactType
      })

      logger.info('[Provider Operations] Last contact updated', { providerId, contactType })
    } catch (error) {
      logger.error('[Provider Operations] Error updating last contact', error as Error)
      throw error
    }
  }
}

/**
 * Provider Communication Operations
 */
export const communicationOperations = {
  /**
   * Log a communication with a provider
   */
  async logCommunication(
    communication: Omit<ProviderCommunication, 'id'>
  ): Promise<ProviderCommunication> {
    try {
      const communicationsRef = collection(db, 'providerCommunications')
      const docRef = await addDoc(communicationsRef, {
        ...communication,
        sentAt: Timestamp.now()
      })

      // Update provider's last contact
      await providerOperations.updateLastContact(
        communication.providerId,
        communication.type
      )

      const newCommunication = {
        id: docRef.id,
        ...communication,
        sentAt: Timestamp.now()
      }

      logger.info('[Communication Operations] Communication logged', {
        communicationId: docRef.id,
        type: communication.type
      })

      return newCommunication
    } catch (error) {
      logger.error('[Communication Operations] Error logging communication', error as Error)
      throw error
    }
  },

  /**
   * Get all communications for a provider
   */
  async getProviderCommunications(providerId: string): Promise<ProviderCommunication[]> {
    try {
      const communicationsRef = collection(db, 'providerCommunications')
      const q = query(
        communicationsRef,
        where('providerId', '==', providerId),
        orderBy('sentAt', 'desc')
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProviderCommunication))
    } catch (error) {
      logger.error('[Communication Operations] Error fetching communications', error as Error)
      throw error
    }
  },

  /**
   * Get all communications for a patient
   */
  async getPatientCommunications(patientId: string): Promise<ProviderCommunication[]> {
    try {
      const communicationsRef = collection(db, 'providerCommunications')
      const q = query(
        communicationsRef,
        where('patientId', '==', patientId),
        orderBy('sentAt', 'desc')
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProviderCommunication))
    } catch (error) {
      logger.error('[Communication Operations] Error fetching patient communications', error as Error)
      throw error
    }
  },

  /**
   * Update communication status
   */
  async updateCommunicationStatus(
    communicationId: string,
    status: ProviderCommunication['status'],
    errorMessage?: string
  ): Promise<void> {
    try {
      const communicationRef = doc(db, 'providerCommunications', communicationId)
      await updateDoc(communicationRef, {
        status,
        ...(errorMessage && { errorMessage })
      })

      logger.info('[Communication Operations] Communication status updated', {
        communicationId,
        status
      })
    } catch (error) {
      logger.error('[Communication Operations] Error updating communication status', error as Error)
      throw error
    }
  }
}

/**
 * Health Report Operations
 */
export const healthReportOperations = {
  /**
   * Get health report for a specific date
   */
  async getReportByDate(patientId: string, reportDate: string): Promise<HealthReport | null> {
    try {
      const reportsRef = collection(db, 'healthReports')
      const q = query(
        reportsRef,
        where('patientId', '==', patientId),
        where('reportDate', '==', reportDate)
      )

      const snapshot = await getDocs(q)
      if (snapshot.empty) {
        return null
      }

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as HealthReport
    } catch (error) {
      logger.error('[Health Report Operations] Error fetching report', error as Error)
      throw error
    }
  },

  /**
   * Get all reports for a patient
   */
  async getPatientReports(patientId: string, limit?: number): Promise<HealthReport[]> {
    try {
      const reportsRef = collection(db, 'healthReports')
      let q = query(
        reportsRef,
        where('patientId', '==', patientId),
        orderBy('reportDate', 'desc')
      )

      if (limit) {
        const { limit: firestoreLimit } = await import('firebase/firestore')
        q = query(q, firestoreLimit(limit))
      }

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HealthReport))
    } catch (error) {
      logger.error('[Health Report Operations] Error fetching patient reports', error as Error)
      throw error
    }
  },

  /**
   * Create a new health report
   */
  async createReport(
    report: Omit<HealthReport, 'id' | 'generatedAt' | 'viewCount' | 'exportedCount' | 'emailedCount'>
  ): Promise<HealthReport> {
    try {
      const reportsRef = collection(db, 'healthReports')
      const docRef = await addDoc(reportsRef, {
        ...report,
        generatedAt: Timestamp.now(),
        viewCount: 0,
        exportedCount: 0,
        emailedCount: 0
      })

      const newReport = {
        id: docRef.id,
        ...report,
        generatedAt: Timestamp.now(),
        viewCount: 0,
        exportedCount: 0,
        emailedCount: 0
      }

      logger.info('[Health Report Operations] Report created', {
        reportId: docRef.id,
        reportDate: report.reportDate
      })

      return newReport
    } catch (error) {
      logger.error('[Health Report Operations] Error creating report', error as Error)
      throw error
    }
  },

  /**
   * Update an existing report (for regeneration)
   */
  async updateReport(
    reportId: string,
    report: string,
    generatedBy: string,
    generatedByName?: string,
    includedData?: HealthReport['includedData']
  ): Promise<void> {
    try {
      const reportRef = doc(db, 'healthReports', reportId)
      await updateDoc(reportRef, {
        report,
        generatedBy,
        generatedByName,
        generatedAt: Timestamp.now(),
        ...(includedData && { includedData })
      })

      logger.info('[Health Report Operations] Report updated', { reportId })
    } catch (error) {
      logger.error('[Health Report Operations] Error updating report', error as Error)
      throw error
    }
  },

  /**
   * Increment view count
   */
  async incrementViewCount(reportId: string): Promise<void> {
    try {
      const reportRef = doc(db, 'healthReports', reportId)
      const reportSnap = await getDoc(reportRef)

      if (reportSnap.exists()) {
        const currentCount = reportSnap.data().viewCount || 0
        await updateDoc(reportRef, {
          viewCount: currentCount + 1,
          lastViewedAt: Timestamp.now()
        })
      }
    } catch (error) {
      logger.error('[Health Report Operations] Error incrementing view count', error as Error)
      // Don't throw - view count is not critical
    }
  },

  /**
   * Increment export count
   */
  async incrementExportCount(reportId: string): Promise<void> {
    try {
      const reportRef = doc(db, 'healthReports', reportId)
      const reportSnap = await getDoc(reportRef)

      if (reportSnap.exists()) {
        const currentCount = reportSnap.data().exportedCount || 0
        await updateDoc(reportRef, {
          exportedCount: currentCount + 1
        })
      }
    } catch (error) {
      logger.error('[Health Report Operations] Error incrementing export count', error as Error)
      // Don't throw - export count is not critical
    }
  },

  /**
   * Increment email count
   */
  async incrementEmailCount(reportId: string): Promise<void> {
    try {
      const reportRef = doc(db, 'healthReports', reportId)
      const reportSnap = await getDoc(reportRef)

      if (reportSnap.exists()) {
        const currentCount = reportSnap.data().emailedCount || 0
        await updateDoc(reportRef, {
          emailedCount: currentCount + 1
        })
      }
    } catch (error) {
      logger.error('[Health Report Operations] Error incrementing email count', error as Error)
      // Don't throw - email count is not critical
    }
  },

  /**
   * Delete a report
   */
  async deleteReport(reportId: string): Promise<void> {
    try {
      const reportRef = doc(db, 'healthReports', reportId)
      await deleteDoc(reportRef)

      logger.info('[Health Report Operations] Report deleted', { reportId })
    } catch (error) {
      logger.error('[Health Report Operations] Error deleting report', error as Error)
      throw error
    }
  },

  /**
   * Get available report dates for a patient
   */
  async getAvailableReportDates(patientId: string): Promise<string[]> {
    try {
      const reports = await healthReportOperations.getPatientReports(patientId)
      return reports.map(report => report.reportDate).sort().reverse()
    } catch (error) {
      logger.error('[Health Report Operations] Error fetching available dates', error as Error)
      throw error
    }
  }
}
