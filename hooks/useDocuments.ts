/**
 * useDocuments Hook
 *
 * Centralized document management hook
 * Fetches and manages documents across all family members with filtering
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { PatientDocument } from '@/types/medical'

export interface DocumentFilters {
  patientId?: string
  category?: string
  startDate?: string
  endDate?: string
  search?: string
}

interface DocumentWithPatient extends PatientDocument {
  patientName: string
  patientId: string
  patientPhoto?: string
  patientType: string
}

interface DocumentStats {
  totalDocuments: number
  byCategory: Record<string, number>
  byPatient: Record<string, { count: number; name: string }>
  totalStorageUsed: number
}

interface Patient {
  id: string
  name: string
  type: string
  photo?: string
}

interface UseDocumentsReturn {
  documents: DocumentWithPatient[]
  patients: Patient[]
  stats: DocumentStats | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  filters: DocumentFilters
  setFilters: (filters: DocumentFilters) => void
  totalCount: number
}

export function useDocuments(): UseDocumentsReturn {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<DocumentWithPatient[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [stats, setStats] = useState<DocumentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<DocumentFilters>({})
  const [totalCount, setTotalCount] = useState(0)

  const fetchDocuments = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = await user.getIdToken()

      // Build query params
      const params = new URLSearchParams()
      if (filters.patientId) params.append('patientId', filters.patientId)
      if (filters.category) params.append('category', filters.category)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await fetch(`/api/admin/documents?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }

      const result = await response.json()

      if (result.success) {
        let docs = result.data.documents

        // Apply client-side search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          docs = docs.filter((doc: DocumentWithPatient) =>
            doc.name?.toLowerCase().includes(searchLower) ||
            doc.fileName?.toLowerCase().includes(searchLower) ||
            doc.notes?.toLowerCase().includes(searchLower) ||
            doc.extractedText?.toLowerCase().includes(searchLower) ||
            doc.patientName?.toLowerCase().includes(searchLower)
          )
        }

        setDocuments(docs)
        setPatients(result.data.patients || [])
        setStats(result.data.stats)
        setTotalCount(result.data.total || docs.length)
      } else {
        throw new Error(result.error || 'Failed to fetch documents')
      }
    } catch (err: any) {
      console.error('Error fetching documents:', err)
      setError(err.message || 'Failed to fetch documents')
    } finally {
      setLoading(false)
    }
  }, [user, filters])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return {
    documents,
    patients,
    stats,
    loading,
    error,
    refetch: fetchDocuments,
    filters,
    setFilters,
    totalCount
  }
}
