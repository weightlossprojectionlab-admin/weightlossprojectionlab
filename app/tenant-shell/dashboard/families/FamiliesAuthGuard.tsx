'use client'

/**
 * Families Auth Guard
 *
 * Families is a SHARED tenant surface: authorizes super-admin OR any member of
 * THIS tenant (franchise_admin OR franchise_staff). Bounces to /login otherwise.
 * (Admin-only sections — staff/branding/packages — keep their own admin-only
 * guards; this guard is intentionally staff-inclusive.)
 *
 * NOTE (DOSI follow-up): the claims-resolution here is now duplicated across
 * TenantAuthGuard / StaffAuthGuard / BrandingEditor / DashboardTabs / the
 * Overview page — the rule of three has passed. Extract a shared
 * useTenantRole(tenantId) hook and migrate all call sites so the role is
 * defined ONCE (a single source would have prevented this guard drifting out
 * of sync with the staff-inclusive Overview).
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
        // Families is a SHARED surface (Overview + Families) — franchise_staff
        // are meant to work the client roster/workspace (the managed-families
        // APIs already allow verifyTenantStaffOrAdminAuth). Admin-only sections
        // (packages/staff/branding) keep their own admin-only guards.
        const isTenantMember =
          (claims.tenantRole === 'franchise_admin' || claims.tenantRole === 'franchise_staff') &&
          claims.tenantId === tenantId
        if (!isSuperAdmin && !isTenantMember) {
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
