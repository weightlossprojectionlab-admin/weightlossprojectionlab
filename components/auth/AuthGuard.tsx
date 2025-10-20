'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

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

  useEffect(() => {
    if (!loading && !user) {
      console.log('🔒 AuthGuard: No user found, redirecting to /auth')
      router.push('/auth')
    }
  }, [user, loading, router])

  // Show loading spinner while Firebase Auth initializes
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-health-bg">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    )
  }

  // If no user after loading completes, show fallback or redirect message
  if (!user) {
    return fallback || (
      <div className="flex min-h-screen items-center justify-center bg-health-bg">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // User is authenticated → Render children
  // (Individual pages will handle profile/onboarding checks)
  return <>{children}</>
}