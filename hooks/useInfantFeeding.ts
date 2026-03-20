'use client'

import { useState, useEffect, useCallback } from 'react'
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { FeedingEntry, NewFeedingEntry } from '@/types/infant-feeding'
import { logger } from '@/lib/logger'

interface UseInfantFeedingOptions {
  patientId: string
  accountOwnerId: string // uid of the account owner (parent)
}

interface UseInfantFeedingReturn {
  entries: FeedingEntry[]
  loading: boolean
  error: string | null
  logFeeding: (entry: NewFeedingEntry) => Promise<void>
  deleteFeeding: (entryId: string) => Promise<void>
}

export function useInfantFeeding({ patientId, accountOwnerId }: UseInfantFeedingOptions): UseInfantFeedingReturn {
  const { user } = useAuth()
  const [entries, setEntries] = useState<FeedingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Listen to feeding logs for the last 7 days
  useEffect(() => {
    if (!accountOwnerId || !patientId) {
      setLoading(false)
      return
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo)

    const feedingRef = collection(db, `users/${accountOwnerId}/patients/${patientId}/feedingLogs`)
    const q = query(
      feedingRef,
      where('startedAt', '>=', sevenDaysAgo.toISOString()),
      orderBy('startedAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: FeedingEntry[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<FeedingEntry, 'id'>),
        }))
        setEntries(data)
        setLoading(false)
        setError(null)
      },
      (err) => {
        logger.error('[useInfantFeeding] Snapshot error', err)
        setError('Failed to load feeding logs')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [accountOwnerId, patientId])

  const logFeeding = useCallback(async (entry: NewFeedingEntry) => {
    if (!user || !accountOwnerId) throw new Error('Not authenticated')

    const feedingRef = collection(db, `users/${accountOwnerId}/patients/${patientId}/feedingLogs`)
    await addDoc(feedingRef, {
      ...entry,
      patientId,
      loggedBy: user.uid,
      createdAt: new Date().toISOString(),
    })
  }, [user, accountOwnerId, patientId])

  const deleteFeeding = useCallback(async (entryId: string) => {
    if (!accountOwnerId) throw new Error('Not authenticated')
    const entryRef = doc(db, `users/${accountOwnerId}/patients/${patientId}/feedingLogs/${entryId}`)
    await deleteDoc(entryRef)
  }, [accountOwnerId, patientId])

  return { entries, loading, error, logFeeding, deleteFeeding }
}
