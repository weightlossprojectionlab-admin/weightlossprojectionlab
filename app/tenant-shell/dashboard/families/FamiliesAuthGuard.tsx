'use client'

/**
 * Families Auth Guard (tenant-member).
 *
 * Families is a SHARED tenant surface: authorizes super-admin OR any member of
 * THIS tenant (franchise_admin OR franchise_staff), bouncing others to /login.
 * (Admin-only sections — staff/branding/packages — keep their own owner-level
 * guards.) Role resolution is the shared useTenantRole hook — the single source
 * that ended the drift which had this guard rejecting the staff the Overview
 * authorized.
 */

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useTenantRole } from '@/hooks/useTenantRole'

interface Props {
  tenantId: string
  children: ReactNode
}

export default function FamiliesAuthGuard({ tenantId, children }: Props) {
  const router = useRouter()
  const role = useTenantRole(tenantId)

  useEffect(() => {
    if (role.checked && !role.isTenantMember) router.replace('/login?next=/dashboard/families')
  }, [role.checked, role.isTenantMember, router])

  if (!role.checked) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-gray-500">
        Loading&hellip;
      </div>
    )
  }
  if (!role.isTenantMember) return null
  return <>{children}</>
}
