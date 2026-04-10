'use client'

/**
 * Staff Dashboard Auth Guard
 *
 * Same client-side claim check pattern as FamiliesAuthGuard, but admin-only
 * (not staff-or-admin). Staff cannot manage other staff — only the
 * franchise owner can invite or revoke. Staff visiting /dashboard/staff
 * should be bounced.
 *
 * Slice 4 ships this as a parallel guard. Slice 4-cleanup-or-later (rule
 * of three) extracts a shared role-aware DashboardAuthGuard.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

interface Props {
  tenantId: string
  children: ReactNode
}

export default function StaffAuthGuard({ tenantId, children }: Props) {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!auth) {
      router.replace('/login?next=/dashboard/staff')
      return
    }
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        router.replace('/login?next=/dashboard/staff')
        return
      }
      try {
        const tokenResult = await user.getIdTokenResult()
        const claims = tokenResult.claims as any
        const isSuperAdmin = claims.role === 'admin'
        const isFranchiseAdminForThis =
          claims.tenantRole === 'franchise_admin' && claims.tenantId === tenantId
        if (!isSuperAdmin && !isFranchiseAdminForThis) {
          router.replace('/login?next=/dashboard/staff')
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
