'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { determineUserDestination } from '@/lib/auth-router'

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
        console.log('⏳ DashboardRouter: Waiting for auth to load...')
        return
      }

      console.log('🔀 DashboardRouter: Checking if user should access protected page')

      try {
        const destination = await determineUserDestination(user, pathname)

        console.log('📍 DashboardRouter destination:', destination)

        switch (destination.type) {
          case 'auth':
            console.log('➡️ Redirecting to /auth:', destination.reason)
            router.push('/auth')
            break

          case 'onboarding':
            console.log('➡️ Redirecting to /onboarding:', destination.reason)
            router.push('/onboarding')
            break

          case 'stay':
            console.log('✅ User can access protected page:', destination.reason)
            setChecking(false)
            break

          default:
            console.log('✅ Allowing access to protected page')
            setChecking(false)
            break
        }
      } catch (error) {
        console.error('❌ DashboardRouter error:', error)
        // On error, redirect to onboarding (fail safe)
        console.log('⚠️ Error occurred - redirecting to /onboarding for safety')
        router.push('/onboarding')
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

  // User is allowed to be here → Render protected page
  return <>{children}</>
}
