'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { determineUserDestination } from '@/lib/auth-router'

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
        console.log('⏳ OnboardingRouter: Waiting for auth to load...')
        return
      }

      console.log('🔀 OnboardingRouter: Checking if user should be on /onboarding')

      try {
        const destination = await determineUserDestination(user, pathname)

        console.log('📍 OnboardingRouter destination:', destination)

        switch (destination.type) {
          case 'auth':
            console.log('➡️ Redirecting to /auth:', destination.reason)
            router.push('/auth')
            break

          case 'dashboard':
            console.log('➡️ Redirecting to /dashboard:', destination.reason)
            router.push('/dashboard')
            break

          case 'stay':
            console.log('✅ User can stay on /onboarding:', destination.reason)
            setChecking(false)
            break

          default:
            console.log('✅ Allowing access to /onboarding')
            setChecking(false)
            break
        }
      } catch (error) {
        console.error('❌ OnboardingRouter error:', error)
        // On error, allow access (fail open for onboarding)
        setChecking(false)
      }
    }

    checkAccess()
  }, [user, authLoading, router, pathname])

  // Show loading spinner while checking access
  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-health-bg">
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
