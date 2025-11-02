'use client'

import { useState, useEffect } from 'react'
import { User } from 'firebase/auth'

/**
 * Lazy-loading version of useAuth that dynamically imports Firebase
 * This reduces initial bundle size for pages that don't immediately need auth
 */
export const useLazyAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    // Dynamically import auth module to defer Firebase loading
    import('@/lib/auth')
      .then((authModule) => {
        unsubscribe = authModule.onAuthStateChange((user) => {
          setUser(user)
          setLoading(false)
        })
      })
      .catch((error) => {
        console.error('Failed to load auth module:', error)
        setLoading(false)
      })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  return { user, loading }
}
