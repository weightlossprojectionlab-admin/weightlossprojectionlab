'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from 'firebase/auth'
import { onAuthStateChange } from '@/lib/auth'
import { logger } from '@/lib/logger'

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    logger.info('[AuthContext] Initializing auth state listener')

    const unsubscribe = onAuthStateChange((authUser) => {
      logger.info('[AuthContext] Auth state changed', {
        hasUser: !!authUser,
        uid: authUser?.uid
      })
      setUser(authUser)
      setLoading(false)
    })

    return () => {
      logger.info('[AuthContext] Cleaning up auth state listener')
      unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
