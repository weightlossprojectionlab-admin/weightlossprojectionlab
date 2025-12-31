/**
 * useVaccinations Hook
 * Manage pet vaccination records and reminders
 */

'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  onSnapshot,
  serverTimestamp,
  limit
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { VaccinationRecord, VaccinationStatus } from '@/types/pet-vaccinations'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { differenceInDays, addDays, isPast, isFuture, parseISO } from 'date-fns'

interface UseVaccinationsOptions {
  userId: string
  petId: string
  autoFetch?: boolean
  realtime?: boolean
}

export function useVaccinations({ userId, petId, autoFetch = true, realtime = false }: UseVaccinationsOptions) {
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Fetch vaccination records
  const fetchVaccinations = async () => {
    setLoading(true)
    setError(null)

    try {
      logger.debug('[useVaccinations] Fetching vaccination records', { userId, petId })

      const vaccinationsRef = collection(db, 'users', userId, 'patients', petId, 'vaccinations')
      const q = query(vaccinationsRef, orderBy('administeredDate', 'desc'))

      const snapshot = await getDocs(q)
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VaccinationRecord[]

      // Update status for each record
      const updatedRecords = records.map(record => ({
        ...record,
        status: calculateVaccinationStatus(record)
      }))

      setVaccinations(updatedRecords)
      logger.debug('[useVaccinations] Fetched vaccination records', { count: updatedRecords.length })

      return updatedRecords
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch vaccination records')
      logger.error('[useVaccinations] Error fetching records', error)
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Create vaccination record
  const createVaccination = async (data: Omit<VaccinationRecord, 'id' | 'createdAt' | 'updatedAt' | 'petId' | 'status' | 'reminderSent'>) => {
    try {
      logger.debug('[useVaccinations] Creating vaccination record', { petId, vaccineName: data.vaccineName })

      const vaccinationsRef = collection(db, 'users', userId, 'patients', petId, 'vaccinations')
      const newDocRef = doc(vaccinationsRef)

      const newVaccination: Omit<VaccinationRecord, 'id'> = {
        ...data,
        petId,
        createdBy: userId,
        status: 'current', // Will be calculated
        reminderSent: false,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      }

      await setDoc(newDocRef, newVaccination)

      logger.info('[useVaccinations] Vaccination record created', { id: newDocRef.id })
      toast.success(`${data.vaccineName} vaccination recorded!`)

      // Refresh
      await fetchVaccinations()

      return { id: newDocRef.id, ...newVaccination } as VaccinationRecord
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create vaccination record')
      logger.error('[useVaccinations] Error creating record', error)
      toast.error('Failed to record vaccination')
      throw error
    }
  }

  // Update vaccination record
  const updateVaccination = async (id: string, updates: Partial<VaccinationRecord>) => {
    try {
      logger.debug('[useVaccinations] Updating vaccination record', { id, updates })

      const vaccinationRef = doc(db, 'users', userId, 'patients', petId, 'vaccinations', id)

      await updateDoc(vaccinationRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })

      logger.info('[useVaccinations] Vaccination record updated', { id })
      toast.success('Vaccination record updated')

      // Refresh
      await fetchVaccinations()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update vaccination record')
      logger.error('[useVaccinations] Error updating record', error)
      toast.error('Failed to update record')
      throw error
    }
  }

  // Delete vaccination record
  const deleteVaccination = async (id: string) => {
    try {
      logger.debug('[useVaccinations] Deleting vaccination record', { id })

      const vaccinationRef = doc(db, 'users', userId, 'patients', petId, 'vaccinations', id)
      await deleteDoc(vaccinationRef)

      logger.info('[useVaccinations] Vaccination record deleted', { id })
      toast.success('Vaccination record deleted')

      // Refresh
      await fetchVaccinations()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete vaccination record')
      logger.error('[useVaccinations] Error deleting record', error)
      toast.error('Failed to delete record')
      throw error
    }
  }

  // Calculate vaccination status
  const calculateVaccinationStatus = (vaccination: VaccinationRecord): 'current' | 'due-soon' | 'overdue' | 'expired' => {
    try {
      const now = new Date()

      // Check if expired (only if expirationDate exists)
      if (vaccination.expirationDate) {
        const expirationDate = parseISO(vaccination.expirationDate)
        if (isPast(expirationDate)) {
          return 'expired'
        }
      }

      // Check next due date
      if (vaccination.nextDueDate) {
        const nextDueDate = parseISO(vaccination.nextDueDate)
        const daysUntilDue = differenceInDays(nextDueDate, now)

        if (daysUntilDue < 0) {
          return 'overdue'
        } else if (daysUntilDue <= 30) {
          return 'due-soon'
        }
      }

      return 'current'
    } catch (err) {
      logger.error('[useVaccinations] Error calculating status', err)
      return 'current' // Default to current on error
    }
  }

  // Get vaccination status summary
  const getVaccinationStatus = (): VaccinationStatus => {
    const totalVaccines = vaccinations.length
    const currentVaccines = vaccinations.filter(v => v.status === 'current').length
    const dueSoon = vaccinations.filter(v => v.status === 'due-soon').length
    const overdue = vaccinations.filter(v => v.status === 'overdue').length

    // Find next due vaccine
    const upcomingVaccines = vaccinations
      .filter(v => v.nextDueDate && (v.status === 'due-soon' || v.status === 'current'))
      .sort((a, b) => a.nextDueDate!.localeCompare(b.nextDueDate!))

    return {
      totalVaccines,
      currentVaccines,
      dueSoon,
      overdue,
      nextDueDate: upcomingVaccines[0]?.nextDueDate,
      nextDueVaccine: upcomingVaccines[0]?.vaccineName
    }
  }

  // Get vaccinations by type
  const getVaccinationsByType = (vaccineType: string): VaccinationRecord[] => {
    return vaccinations.filter(v => v.vaccineType === vaccineType)
  }

  // Check if specific vaccine is current
  const isVaccineCurrent = (vaccineType: string): boolean => {
    const records = getVaccinationsByType(vaccineType)
    if (records.length === 0) return false

    const mostRecent = records[0] // Already sorted by administeredDate desc
    return mostRecent.status === 'current' || mostRecent.status === 'due-soon'
  }

  // Get overdue vaccinations
  const getOverdueVaccinations = (): VaccinationRecord[] => {
    return vaccinations.filter(v => v.status === 'overdue')
  }

  // Get vaccinations due soon (within 30 days)
  const getDueSoonVaccinations = (): VaccinationRecord[] => {
    return vaccinations.filter(v => v.status === 'due-soon')
  }

  // Get vaccination history for export
  const getVaccinationHistory = async (): Promise<VaccinationRecord[]> => {
    try {
      const vaccinationsRef = collection(db, 'users', userId, 'patients', petId, 'vaccinations')
      const q = query(vaccinationsRef, orderBy('administeredDate', 'asc'))

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VaccinationRecord[]
    } catch (err) {
      logger.error('[useVaccinations] Error getting vaccination history', err)
      return []
    }
  }

  // Quick add vaccination with minimal data
  const quickAddVaccination = async (
    vaccineName: string,
    vaccineType: VaccinationRecord['vaccineType'],
    administeredDate: string,
    administeredBy: string,
    expirationDate: string
  ) => {
    try {
      const vaccination: Omit<VaccinationRecord, 'id' | 'createdAt' | 'updatedAt' | 'petId' | 'status' | 'reminderSent'> = {
        vaccineName,
        vaccineType,
        administeredDate,
        administeredBy,
        expirationDate,
        dueDate: expirationDate, // Same as expiration for simplicity
        isBooster: false,
        hadReaction: false,
        createdBy: userId
      }

      return await createVaccination(vaccination)
    } catch (err) {
      logger.error('[useVaccinations] Error in quick add', err)
      throw err
    }
  }

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && userId && petId) {
      fetchVaccinations()
    }
  }, [userId, petId, autoFetch])

  // Real-time listener
  useEffect(() => {
    if (!realtime || !userId || !petId) return

    logger.debug('[useVaccinations] Setting up real-time listener')

    const vaccinationsRef = collection(db, 'users', userId, 'patients', petId, 'vaccinations')
    const q = query(vaccinationsRef, orderBy('administeredDate', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as VaccinationRecord[]

        // Update status for each record
        const updatedRecords = records.map(record => ({
          ...record,
          status: calculateVaccinationStatus(record)
        }))

        setVaccinations(updatedRecords)
        logger.debug('[useVaccinations] Real-time update', { count: updatedRecords.length })
      },
      (err) => {
        logger.error('[useVaccinations] Real-time listener error', err)
        setError(err instanceof Error ? err : new Error('Real-time listener failed'))
      }
    )

    return () => {
      logger.debug('[useVaccinations] Cleaning up real-time listener')
      unsubscribe()
    }
  }, [userId, petId, realtime])

  return {
    vaccinations,
    loading,
    error,
    fetchVaccinations,
    createVaccination,
    updateVaccination,
    deleteVaccination,
    quickAddVaccination,
    getVaccinationStatus,
    getVaccinationsByType,
    isVaccineCurrent,
    getOverdueVaccinations,
    getDueSoonVaccinations,
    getVaccinationHistory,
    refetch: fetchVaccinations
  }
}
