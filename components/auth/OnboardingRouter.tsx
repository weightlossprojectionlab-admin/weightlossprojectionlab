'use client'

import { useRouter, usePathname } from 'next/navigation'
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
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) {
        logger.debug('⏳ OnboardingRouter: Waiting for auth to load...')
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // User is allowed to be here → Render onboarding page
  return <>{children}</>
}
