'use client'

/**
 * Staff Dashboard Auth Guard (owner-level).
 *
 * Staff cannot manage other staff — only the franchise owner (or super-admin)
 * can. Role resolution is the shared useTenantRole hook (single source); this
 * guard applies the owner-level policy + bounces franchise_staff to /login.
 */

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useTenantRole } from '@/hooks/useTenantRole'

interface Props {
  tenantId: string
  children: ReactNode
}

export default function StaffAuthGuard({ tenantId, children }: Props) {
  const router = useRouter()
  const role = useTenantRole(tenantId)

  useEffect(() => {
    if (role.checked && !role.isOwnerLevel) router.replace('/login?next=/dashboard/staff')
  }, [role.checked, role.isOwnerLevel, router])

  if (!role.checked) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-gray-500">
        Loading&hellip;
      </div>
    )
  }
  if (!role.isOwnerLevel) return null
  return <>{children}</>
}
