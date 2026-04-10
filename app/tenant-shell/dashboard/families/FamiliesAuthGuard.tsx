'use client'

/**
 * Families Auth Guard
 *
 * Mirrors the auth-check pattern from BrandingEditor.tsx — verifies the
 * signed-in Firebase user has either super-admin role or franchise_admin
 * tenantRole matching this tenant. Bounces to /login on mismatch.
 *
 * Lives next to the families page rather than in a shared lib because
 * (a) only one consumer today and (b) the BrandingEditor copy is the only
 * other instance — extraction to lib/ waits for the rule of three (next
 * dashboard page that needs it, e.g. /dashboard/staff in slice 4).
 */

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

interface Props {
  tenantId: string
  children: ReactNode
}

export default function FamiliesAuthGuard({ tenantId, children }: Props) {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!auth) {
      router.replace('/login?next=/dashboard/families')
      return
    }
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        router.replace('/login?next=/dashboard/families')
        return
      }
      try {
        const tokenResult = await user.getIdTokenResult()
        const claims = tokenResult.claims as any
        const isSuperAdmin = claims.role === 'admin'
        const isFranchiseAdminForThis =
          claims.tenantRole === 'franchise_admin' && claims.tenantId === tenantId
        if (!isSuperAdmin && !isFranchiseAdminForThis) {
          router.replace('/login?next=/dashboard/families')
          return
        }
        setAuthorized(true)
      } finally {
        setAuthChecked(true)
      }
    })
    return () => unsub()
  }, [router, tenantId])

  if (!authChecked) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-gray-500">
        Loading&hellip;
      </div>
    )
  }
  if (!authorized) return null
  return <>{children}</>
}
