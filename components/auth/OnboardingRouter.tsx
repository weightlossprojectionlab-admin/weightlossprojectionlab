'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { determineUserDestination } from '@/lib/auth-router'
import { logger } from '@/lib/logger'

interface OnboardingRouterProps {
  children: React.ReactNode
}

/**
 * OnboardingRouter - Protects the onboarding page
 *
 * Checks if the user should be on the onboarding page:
 * - If onboarding already completed → Redirect to dashboard
 * - If unauthenticated → Redirect to /auth
 * - Otherwise → Allow access
 */
export default function OnboardingRouter({ children }: OnboardingRouterProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) {
        logger.debug('⏳ OnboardingRouter: Waiting for auth to load...')
        return
      }

      // Defense Layer #2: Check for onboardingComplete query param
      // If present, user just completed onboarding - allow access without Firestore check
      // This prevents race condition with Firestore eventual consistency
      const justCompleted = searchParams.get('onboardingComplete') === 'true'
      if (justCompleted) {
        logger.info('✅ OnboardingRouter: Onboarding just completed (query param), allowing access')
        setChecking(false)
        return
      }

      logger.debug('🔀 OnboardingRouter: Checking if user should be on /onboarding')

      try {
        const destination = await determineUserDestination(user, pathname)

        logger.debug('📍 OnboardingRouter destination:', destination)

        switch (destination.type) {
          case 'auth':
            logger.debug('➡️ Redirecting to /auth:', { reason: destination.reason })
            router.push('/auth')
            break

          case 'dashboard':
            logger.debug('➡️ Redirecting to /dashboard:', { reason: destination.reason })
            router.push('/dashboard')
            break

          case 'stay':
            logger.debug('✅ User can stay on /onboarding:', { reason: destination.reason })
            setChecking(false)
            break

          default:
            logger.debug('✅ Allowing access to /onboarding')
            setChecking(false)
            break
        }
      } catch (error) {
        logger.error('❌ OnboardingRouter error:', error as Error)
        // On error, allow access (fail open for onboarding)
        setChecking(false)
      }
    }

    checkAccess()
  }, [user, authLoading, router, pathname])

  // Show loading spinner while checking access
  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // User is allowed to be here → Render onboarding page
  return <>{children}</>
}
