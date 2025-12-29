'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { getAuthLoadingMessage } from '@/lib/auth-message-selector'
import { logger } from '@/lib/logger'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireAdmin?: boolean
}

/**
 * AuthGuard - Simple authentication check
 *
 * Checks if user is authenticated with Firebase Auth.
 * Optionally checks for admin privileges.
 * Does NOT check profile or onboarding status.
 * Individual pages should use OnboardingRouter or DashboardRouter for those checks.
 */
export default function AuthGuard({ children, fallback, requireAdmin = false }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const { isAdmin, loading: subscriptionLoading } = useSubscription()
  const router = useRouter()
  const [loadingMessage, setLoadingMessage] = useState('Loading your health journey...')

  useEffect(() => {
    if (!loading && !user) {
      logger.debug('🔒 AuthGuard: No user found, redirecting to /auth')
      router.push('/auth')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!loading && !subscriptionLoading && user && requireAdmin && !isAdmin) {
      logger.debug('🔒 AuthGuard: User is not admin, redirecting to dashboard')
      router.push('/dashboard')
    }
  }, [user, loading, subscriptionLoading, requireAdmin, isAdmin, router])

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

  // Show loading spinner while Firebase Auth or subscription initializes
  if (loading || (requireAdmin && subscriptionLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">{loadingMessage}</p>
        </div>
      </div>
    )
  }

  // If no user after loading completes, show fallback or redirect message
  if (!user) {
    return fallback || (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // If admin required but user is not admin, show access denied
  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Access denied. Redirecting...</p>
        </div>
      </div>
    )
  }

  // User is authenticated (and admin if required) → Render children
  // (Individual pages will handle profile/onboarding checks)
  return <>{children}</>
}