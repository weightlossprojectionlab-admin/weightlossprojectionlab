'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { determineUserDestination } from '@/lib/auth-router'
import { logger } from '@/lib/logger'

interface DashboardRouterProps {
  children: React.ReactNode
}

/**
 * DashboardRouter - Protects dashboard and other protected pages
 *
 * Checks if the user should have access to protected pages:
 * - If unauthenticated → Redirect to /auth
 * - If onboarding incomplete → Redirect to /onboarding
 * - Otherwise → Allow access
 */
export default function DashboardRouter({ children }: DashboardRouterProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) {
        logger.debug('⏳ DashboardRouter: Waiting for auth to load...')
        return
      }

      logger.debug('🔀 DashboardRouter: Checking if user should access protected page')

      try {
        const destination = await determineUserDestination(user, pathname)

        logger.debug('📍 DashboardRouter destination:', destination)

        switch (destination.type) {
          case 'auth':
            logger.debug('➡️ Redirecting to /auth:', { reason: destination.reason })
            router.push('/auth')
            // Keep checking=true to prevent dashboard render during redirect
            return

          case 'onboarding':
            logger.debug('➡️ Redirecting to /onboarding:', { reason: destination.reason })
            router.push('/onboarding')
            // Keep checking=true to prevent dashboard render during redirect
            return

          case 'dashboard':
            logger.debug('➡️ Redirecting to /dashboard:', { reason: destination.reason })
            router.push('/dashboard')
            // Keep checking=true to prevent current page render during redirect
            return

          case 'patients':
            logger.debug('➡️ Redirecting to /patients:', { reason: destination.reason })
            router.push('/patients')
            // Keep checking=true to prevent current page render during redirect
            return

          case 'stay':
            logger.debug('✅ User can access protected page:', { reason: destination.reason })
            setChecking(false)
            break

          default:
            logger.debug('✅ Allowing access to protected page')
            setChecking(false)
            break
        }
      } catch (error) {
        logger.error('❌ DashboardRouter error:', error as Error)
        // On error, redirect to onboarding (fail safe)
        logger.debug('⚠️ Error occurred - redirecting to /onboarding for safety')
        router.push('/onboarding')
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

  // User is allowed to be here → Render protected page
  return <>{children}</>
}
