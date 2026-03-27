'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { logger } from '@/lib/logger'

export function useReferral() {
  const { user } = useAuth()
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchCode = async () => {
      try {
        const token = await user.getIdToken()
        const res = await fetch('/api/referrals', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setReferralCode(data.code)
        }
      } catch (error) {
        logger.error('[useReferral] Failed to fetch code', error as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchCode()
  }, [user])

  const referralUrl = referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/ref/${referralCode}`
    : null

  return { referralCode, referralUrl, loading }
}
