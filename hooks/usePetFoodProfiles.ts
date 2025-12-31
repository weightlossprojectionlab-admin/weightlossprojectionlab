/**
 * usePetFoodProfiles Hook
 * Manage pet food profiles (CRUD operations)
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
  serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { PetFoodProfile } from '@/types/pet-feeding'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'

interface UsePetFoodProfilesOptions {
  userId: string
  petId: string
  autoFetch?: boolean
  realtime?: boolean // Use onSnapshot for real-time updates
}

export function usePetFoodProfiles({ userId, petId, autoFetch = true, realtime = false }: UsePetFoodProfilesOptions) {
  const [foodProfiles, setFoodProfiles] = useState<PetFoodProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Fetch food profiles
  const fetchFoodProfiles = async (activeOnly = false) => {
    setLoading(true)
    setError(null)

    try {
      logger.debug('[usePetFoodProfiles] Fetching food profiles', { userId, petId, activeOnly })

      const foodProfilesRef = collection(db, 'users', userId, 'patients', petId, 'foodProfiles')

      let q = query(
        foodProfilesRef,
        orderBy('createdAt', 'desc')
      )

      if (activeOnly) {
        q = query(
          foodProfilesRef,
          where('isCurrentFood', '==', true),
          orderBy('createdAt', 'desc')
        )
      }

      const snapshot = await getDocs(q)
      const profiles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PetFoodProfile[]

      setFoodProfiles(profiles)
      logger.debug('[usePetFoodProfiles] Fetched food profiles', { count: profiles.length })

      return profiles
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch food profiles')
      logger.error('[usePetFoodProfiles] Error fetching food profiles', error)
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Create food profile
  const createFoodProfile = async (data: Omit<PetFoodProfile, 'id' | 'createdAt' | 'updatedAt' | 'petId' | 'createdBy'>) => {
    try {
      logger.debug('[usePetFoodProfiles] Creating food profile', { petId, foodName: data.foodName })

      const foodProfilesRef = collection(db, 'users', userId, 'patients', petId, 'foodProfiles')
      const newDocRef = doc(foodProfilesRef)

      const foodProfile: Omit<PetFoodProfile, 'id'> = {
        ...data,
        petId,
        createdBy: userId,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      }

      await setDoc(newDocRef, foodProfile)

      logger.info('[usePetFoodProfiles] Food profile created', { id: newDocRef.id, foodName: data.foodName })
      toast.success(`${data.foodName} added!`)

      // Refresh list
      await fetchFoodProfiles()

      return { id: newDocRef.id, ...foodProfile } as PetFoodProfile
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create food profile')
      logger.error('[usePetFoodProfiles] Error creating food profile', error)
      toast.error('Failed to add food profile')
      throw error
    }
  }

  // Update food profile
  const updateFoodProfile = async (id: string, updates: Partial<PetFoodProfile>) => {
    try {
      logger.debug('[usePetFoodProfiles] Updating food profile', { id, updates })

      const foodProfileRef = doc(db, 'users', userId, 'patients', petId, 'foodProfiles', id)

      await updateDoc(foodProfileRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })

      logger.info('[usePetFoodProfiles] Food profile updated', { id })
      toast.success('Food profile updated')

      // Refresh list
      await fetchFoodProfiles()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update food profile')
      logger.error('[usePetFoodProfiles] Error updating food profile', error)
      toast.error('Failed to update food profile')
      throw error
    }
  }

  // Delete food profile
  const deleteFoodProfile = async (id: string) => {
    try {
      logger.debug('[usePetFoodProfiles] Deleting food profile', { id })

      const foodProfileRef = doc(db, 'users', userId, 'patients', petId, 'foodProfiles', id)
      await deleteDoc(foodProfileRef)

      logger.info('[usePetFoodProfiles] Food profile deleted', { id })
      toast.success('Food profile deleted')

      // Refresh list
      await fetchFoodProfiles()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete food profile')
      logger.error('[usePetFoodProfiles] Error deleting food profile', error)
      toast.error('Failed to delete food profile')
      throw error
    }
  }

  // Mark food as current (and unmark others)
  const setCurrentFood = async (id: string) => {
    try {
      logger.debug('[usePetFoodProfiles] Setting current food', { id })

      // Unmark all other foods as current
      const foodProfilesRef = collection(db, 'users', userId, 'patients', petId, 'foodProfiles')
      const currentFoodsQuery = query(foodProfilesRef, where('isCurrentFood', '==', true))
      const currentFoods = await getDocs(currentFoodsQuery)

      const batch: Promise<void>[] = []

      // Unmark existing current foods
      currentFoods.docs.forEach(doc => {
        if (doc.id !== id) {
          batch.push(
            updateDoc(doc.ref, {
              isCurrentFood: false,
              endedAt: new Date().toISOString(),
              updatedAt: serverTimestamp()
            })
          )
        }
      })

      // Mark new food as current
      const newCurrentRef = doc(db, 'users', userId, 'patients', petId, 'foodProfiles', id)
      batch.push(
        updateDoc(newCurrentRef, {
          isCurrentFood: true,
          startedAt: new Date().toISOString(),
          endedAt: null,
          updatedAt: serverTimestamp()
        })
      )

      await Promise.all(batch)

      logger.info('[usePetFoodProfiles] Current food updated', { id })
      toast.success('Current food updated')

      // Refresh list
      await fetchFoodProfiles()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to set current food')
      logger.error('[usePetFoodProfiles] Error setting current food', error)
      toast.error('Failed to set current food')
      throw error
    }
  }

  // Get current active food
  const getCurrentFood = async (): Promise<PetFoodProfile | null> => {
    try {
      const foodProfilesRef = collection(db, 'users', userId, 'patients', petId, 'foodProfiles')
      const q = query(foodProfilesRef, where('isCurrentFood', '==', true))
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        return null
      }

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as PetFoodProfile
    } catch (err) {
      logger.error('[usePetFoodProfiles] Error getting current food', err)
      return null
    }
  }

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && userId && petId) {
      fetchFoodProfiles()
    }
  }, [userId, petId, autoFetch])

  // Real-time listener
  useEffect(() => {
    if (!realtime || !userId || !petId) return

    logger.debug('[usePetFoodProfiles] Setting up real-time listener')

    const foodProfilesRef = collection(db, 'users', userId, 'patients', petId, 'foodProfiles')
    const q = query(foodProfilesRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const profiles = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PetFoodProfile[]

        setFoodProfiles(profiles)
        logger.debug('[usePetFoodProfiles] Real-time update', { count: profiles.length })
      },
      (err) => {
        logger.error('[usePetFoodProfiles] Real-time listener error', err)
        setError(err instanceof Error ? err : new Error('Real-time listener failed'))
      }
    )

    return () => {
      logger.debug('[usePetFoodProfiles] Cleaning up real-time listener')
      unsubscribe()
    }
  }, [userId, petId, realtime])

  return {
    foodProfiles,
    loading,
    error,
    fetchFoodProfiles,
    createFoodProfile,
    updateFoodProfile,
    deleteFoodProfile,
    setCurrentFood,
    getCurrentFood,
    refetch: fetchFoodProfiles
  }
}
