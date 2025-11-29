'use client'

import { useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import { onAuthStateChange } from '@/lib/auth'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('[useAuth] Setting up auth listener...')
    const unsubscribe = onAuthStateChange((user) => {
      console.log('[useAuth] Auth state changed!', { userId: user?.uid, email: user?.email })
      setUser(user)
      setLoading(false)
    })

    return () => {
      console.log('[useAuth] Cleaning up auth listener')
      unsubscribe()
    }
  }, [])

  return { user, loading }
}