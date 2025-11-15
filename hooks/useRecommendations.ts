/**
 * Appointment Recommendations Hook
 *
 * React hook for managing AI-generated appointment recommendations
 */

import { useState, useEffect, useCallback } from 'react'
import { AppointmentRecommendation } from '@/types/medical'
import { apiClient } from '@/lib/api-client'
import toast from 'react-hot-toast'

interface UseRecommendationsOptions {
  autoFetch?: boolean
}

interface UseRecommendationsReturn {
  recommendations: AppointmentRecommendation[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  generate: () => Promise<void>
  dismiss: (recommendationId: string) => Promise<void>
  markScheduled: (recommendationId: string, appointmentId: string) => Promise<void>
}

export function useRecommendations({
  autoFetch = true
}: UseRecommendationsOptions = {}): UseRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<AppointmentRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await apiClient.get<{ data: AppointmentRecommendation[] }>('/appointments/recommendations')
      setRecommendations(data.data || [])
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch recommendations'
      setError(errorMsg)
      console.error('Error fetching recommendations:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (autoFetch) {
      fetchRecommendations()
    }
  }, [autoFetch, fetchRecommendations])

  const generate = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await apiClient.post<{ data: AppointmentRecommendation[]; count: number; message?: string }>(
        '/appointments/recommendations',
        {}
      )
      setRecommendations(data.data || [])

      if (data.count > 0) {
        toast.success(data.message || `Generated ${data.count} recommendation${data.count !== 1 ? 's' : ''}`)
      } else {
        toast.success('No new recommendations at this time')
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to generate recommendations'
      setError(errorMsg)
      toast.error(errorMsg)
      console.error('Error generating recommendations:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const dismiss = useCallback(async (recommendationId: string) => {
    try {
      // Optimistic update
      setRecommendations(prev => prev.filter(r => r.id !== recommendationId))

      await apiClient.patch(`/appointments/recommendations/${recommendationId}`, { action: 'dismiss' })

      toast.success('Recommendation dismissed')
    } catch (err: any) {
      // Revert optimistic update
      await fetchRecommendations()
      const errorMsg = err.message || 'Failed to dismiss recommendation'
      toast.error(errorMsg)
      console.error('Error dismissing recommendation:', err)
      throw err
    }
  }, [fetchRecommendations])

  const markScheduled = useCallback(async (recommendationId: string, appointmentId: string) => {
    try {
      // Optimistic update
      setRecommendations(prev => prev.filter(r => r.id !== recommendationId))

      await apiClient.patch(`/appointments/recommendations/${recommendationId}`, { action: 'schedule', appointmentId })
    } catch (err: any) {
      // Revert optimistic update
      await fetchRecommendations()
      console.error('Error marking recommendation as scheduled:', err)
      throw err
    }
  }, [fetchRecommendations])

  return {
    recommendations,
    loading,
    error,
    refetch: fetchRecommendations,
    generate,
    dismiss,
    markScheduled
  }
}
