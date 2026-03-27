'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { logger } from '@/lib/logger'
import type { JournalEntry, JournalStats } from '@/types/journal'

export function useJournal(limitCount = 30) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [stats, setStats] = useState<JournalStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchEntries = useCallback(async () => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/journal?limit=${limitCount}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
      }
    } catch (error) {
      logger.error('[useJournal] Failed to fetch entries', error as Error)
    }
  }, [user, limitCount])

  const fetchStats = useCallback(async (days = 30) => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/journal/stats?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      logger.error('[useJournal] Failed to fetch stats', error as Error)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    Promise.all([fetchEntries(), fetchStats()]).finally(() => setLoading(false))
  }, [user, fetchEntries, fetchStats])

  const createEntry = async (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => {
    if (!user) return null
    const token = await user.getIdToken()
    const res = await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(entry),
    })
    if (!res.ok) throw new Error('Failed to save journal entry')
    const data = await res.json()
    await Promise.all([fetchEntries(), fetchStats()])
    return data
  }

  const deleteEntry = async (id: string) => {
    if (!user) return
    const token = await user.getIdToken()
    await fetch(`/api/journal/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    await Promise.all([fetchEntries(), fetchStats()])
  }

  return { entries, stats, loading, createEntry, deleteEntry, refresh: fetchEntries }
}
