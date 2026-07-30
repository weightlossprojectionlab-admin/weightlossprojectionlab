'use client'

/**
 * Tenant dashboard auth guard (owner-level).
 *
 * Verifies the signed-in Firebase user is either a super-admin or the
 * franchise_admin for THIS tenant, and bounces to /login otherwise. This is
 * the canonical extraction of the copy previously inlined in
 * FamiliesAuthGuard.tsx and BrandingEditor.tsx (their comments called for
 * extraction "on the next dashboard page that needs it" — this is it). New
 * dashboard surfaces use this; the two older copies migrate on next touch.
 *
 * `nextPath` is where the user lands after logging in (defaults to the current
 * pathname).
 */

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

interface Props {
  tenantId: string
  nextPath?: string
  children: ReactNode
}

export default function TenantAuthGuard({ tenantId, nextPath, children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [authChecked, setAuthChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const dest = `/login?next=${encodeURIComponent(nextPath || pathname || '/dashboard')}`
    if (!auth) {
      router.replace(dest)
      return
    }
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        router.replace(dest)
        return
      }
      try {
        const tokenResult = await user.getIdTokenResult()
        const claims = tokenResult.claims as any
        const isSuperAdmin = claims.role === 'admin'
        const isFranchiseAdminForThis =
          claims.tenantRole === 'franchise_admin' && claims.tenantId === tenantId
        if (!isSuperAdmin && !isFranchiseAdminForThis) {
          router.replace(dest)
          return
        }
        setAuthorized(true)
      } finally {
        setAuthChecked(true)
      }
    })
    return () => unsub()
  }, [router, tenantId, nextPath, pathname])

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
