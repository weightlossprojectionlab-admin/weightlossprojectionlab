/**
 * Providers Hook
 *
 * React hook for managing healthcare providers
 * Provides CRUD operations with optimistic UI updates
 */

import { useState, useEffect, useCallback } from 'react'
import { medicalOperations } from '@/lib/medical-operations'
import type { Provider } from '@/types/medical'
import toast from 'react-hot-toast'

interface UseProvidersOptions {
  patientId?: string
  autoFetch?: boolean
}

interface UseProvidersReturn {
  providers: Provider[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createProvider: (data: Omit<Provider, 'id' | 'userId' | 'addedAt' | 'patientsServed'>) => Promise<Provider>
  updateProvider: (providerId: string, updates: Partial<Provider>) => Promise<Provider>
  deleteProvider: (providerId: string) => Promise<void>
  linkToPatient: (providerId: string, patientId: string) => Promise<Provider>
  unlinkFromPatient: (providerId: string, patientId: string) => Promise<Provider>
}

export function useProviders({
  patientId,
  autoFetch = true
}: UseProvidersOptions = {}): UseProvidersReturn {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = patientId
        ? await medicalOperations.providers.getProvidersByPatient(patientId)
        : await medicalOperations.providers.getProviders()

      setProviders(data)
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch providers'
      setError(errorMsg)
      console.error('Error fetching providers:', err)
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    if (autoFetch) {
      fetchProviders()
    }
  }, [autoFetch, fetchProviders])

  const createProvider = useCallback(
    async (data: Omit<Provider, 'id' | 'userId' | 'addedAt' | 'patientsServed'>): Promise<Provider> => {
      try {
        const newProvider = await medicalOperations.providers.createProvider(data)

        // Add to list
        setProviders(prev => [newProvider, ...prev])

        toast.success('Provider added successfully')
        return newProvider
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to create provider'
        toast.error(errorMsg)
        throw err
      }
    },
    []
  )

  const updateProvider = useCallback(
    async (providerId: string, updates: Partial<Provider>): Promise<Provider> => {
      try {
        // Optimistic update
        setProviders(prev =>
          prev.map(provider =>
            provider.id === providerId ? { ...provider, ...updates } : provider
          )
        )

        const updatedProvider = await medicalOperations.providers.updateProvider(providerId, updates)

        // Update with server response
        setProviders(prev =>
          prev.map(provider =>
            provider.id === providerId ? updatedProvider : provider
          )
        )

        toast.success('Provider updated')
        return updatedProvider
      } catch (err: any) {
        // Revert optimistic update
        await fetchProviders()
        const errorMsg = err.message || 'Failed to update provider'
        toast.error(errorMsg)
        throw err
      }
    },
    [fetchProviders]
  )

  const deleteProvider = useCallback(
    async (providerId: string): Promise<void> => {
      try {
        // Optimistic update
        setProviders(prev => prev.filter(provider => provider.id !== providerId))

        await medicalOperations.providers.deleteProvider(providerId)

        toast.success('Provider deleted')
      } catch (err: any) {
        // Revert optimistic update
        await fetchProviders()
        const errorMsg = err.message || 'Failed to delete provider'
        toast.error(errorMsg)
        throw err
      }
    },
    [fetchProviders]
  )

  const linkToPatient = useCallback(
    async (providerId: string, patientId: string): Promise<Provider> => {
      try {
        const updatedProvider = await medicalOperations.providers.linkProviderToPatient(
          providerId,
          patientId
        )

        // Update in list
        setProviders(prev =>
          prev.map(provider =>
            provider.id === providerId ? updatedProvider : provider
          )
        )

        toast.success('Provider linked to family member')
        return updatedProvider
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to link provider to family member'
        toast.error(errorMsg)
        throw err
      }
    },
    []
  )

  const unlinkFromPatient = useCallback(
    async (providerId: string, patientId: string): Promise<Provider> => {
      try {
        const updatedProvider = await medicalOperations.providers.unlinkProviderFromPatient(
          providerId,
          patientId
        )

        // Update in list or remove if filtering by patient
        if (patientId) {
          setProviders(prev => prev.filter(provider => provider.id !== providerId))
        } else {
          setProviders(prev =>
            prev.map(provider =>
              provider.id === providerId ? updatedProvider : provider
            )
          )
        }

        toast.success('Provider unlinked from patient')
        return updatedProvider
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to unlink provider from patient'
        toast.error(errorMsg)
        throw err
      }
    },
    [patientId]
  )

  return {
    providers,
    loading,
    error,
    refetch: fetchProviders,
    createProvider,
    updateProvider,
    deleteProvider,
    linkToPatient,
    unlinkFromPatient
  }
}
