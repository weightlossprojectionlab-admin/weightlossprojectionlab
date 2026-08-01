'use client'

/**
 * useTenantRole — single source for the signed-in viewer's role within a tenant.
 *
 * Replaces the claims-resolution that was copy-pasted across TenantAuthGuard,
 * StaffAuthGuard, FamiliesAuthGuard, BrandingEditor, DashboardTabs, and the
 * Overview page — where it had DRIFTED (Overview treated staff as members; the
 * guards didn't), which caused the Families-guard bug. Define the role ONCE;
 * consumers apply their own policy (owner-level vs. tenant-member) + redirect.
 *
 *   const role = useTenantRole(tenantId)
 *   if (role.checked && !role.isOwnerLevel) router.replace('/login?...')   // owner-only page
 *   if (role.checked && !role.isTenantMember) router.replace('/login?...') // shared page
 */

import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

export interface TenantRole {
  /** Auth state resolved (the claim check has run). Render a loader until true. */
  checked: boolean
  signedIn: boolean
  uid: string | null
  isSuperAdmin: boolean
  /** franchise_admin whose tenantId matches this tenant. */
  isFranchiseAdmin: boolean
  /** franchise_staff whose tenantId matches this tenant. */
  isFranchiseStaff: boolean
  /** super-admin OR this tenant's franchise_admin (owner-level surfaces). */
  isOwnerLevel: boolean
  /** super-admin OR this tenant's franchise_admin OR franchise_staff (shared surfaces). */
  isTenantMember: boolean
}

const SIGNED_OUT: TenantRole = {
  checked: true,
  signedIn: false,
  uid: null,
  isSuperAdmin: false,
  isFranchiseAdmin: false,
  isFranchiseStaff: false,
  isOwnerLevel: false,
  isTenantMember: false,
}

export function useTenantRole(tenantId: string): TenantRole {
  const [role, setRole] = useState<TenantRole>({ ...SIGNED_OUT, checked: false })

  useEffect(() => {
    if (!auth) {
      setRole(SIGNED_OUT)
      return
    }
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        setRole(SIGNED_OUT)
        return
      }
      try {
        const claims = (await user.getIdTokenResult()).claims as any
        const isSuperAdmin = claims.role === 'admin'
        const isFranchiseAdmin =
          claims.tenantRole === 'franchise_admin' && claims.tenantId === tenantId
        const isFranchiseStaff =
          claims.tenantRole === 'franchise_staff' && claims.tenantId === tenantId
        setRole({
          checked: true,
          signedIn: true,
          uid: user.uid,
          isSuperAdmin,
          isFranchiseAdmin,
          isFranchiseStaff,
          isOwnerLevel: isSuperAdmin || isFranchiseAdmin,
          isTenantMember: isSuperAdmin || isFranchiseAdmin || isFranchiseStaff,
        })
      } catch {
        // Token/claims unreadable — treat as signed-in-but-unauthorized (checked).
        setRole({ ...SIGNED_OUT, signedIn: true, uid: user.uid })
      }
    })
    return () => unsub()
  }, [tenantId])

  return role
}
