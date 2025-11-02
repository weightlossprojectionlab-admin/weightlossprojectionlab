'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getAuthLoadingMessage } from '@/lib/auth-message-selector'
import { logger } from '@/lib/logger'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * AuthGuard - Simple authentication check
 *
 * Only checks if user is authenticated with Firebase Auth.
 * Does NOT check profile or onboarding status.
 * Individual pages should use OnboardingRouter or DashboardRouter for those checks.
 */
export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [loadingMessage, setLoadingMessage] = useState('Loading your health journey...')

  useEffect(() => {
    if (!loading && !user) {
      logger.debug('🔒 AuthGuard: No user found, redirecting to /auth')
      router.push('/auth')
    }
  }, [user, loading, router])

  // Rotate loading message every 3 seconds for entertainment
  useEffect(() => {
    if (loading) {
      // Set first random message immediately on client mount
      setLoadingMessage(getAuthLoadingMessage())

      // Then rotate every 3 seconds
      const interval = setInterval(() => {
        setLoadingMessage(getAuthLoadingMessage())
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [loading])

  // Show loading spinner while Firebase Auth initializes
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{loadingMessage}</p>
        </div>
      </div>
    )
  }

  // If no user after loading completes, show fallback or redirect message
  if (!user) {
    return fallback || (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // User is authenticated → Render children
  // (Individual pages will handle profile/onboarding checks)
  return <>{children}</>
}