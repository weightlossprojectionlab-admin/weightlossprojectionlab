'use client'

/**
 * Tenant dashboard auth guard (owner-level).
 *
 * Verifies the signed-in Firebase user is super-admin or this tenant's
 * franchise_admin, and bounces to /login otherwise. Role resolution is the
 * shared useTenantRole hook (single source); this guard just applies the
 * owner-level policy + redirect.
 *
 * `nextPath` is where the user lands after logging in (defaults to the current
 * pathname).
 */

import { useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTenantRole } from '@/hooks/useTenantRole'

interface Props {
  tenantId: string
  nextPath?: string
  children: ReactNode
}

export default function TenantAuthGuard({ tenantId, nextPath, children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const role = useTenantRole(tenantId)
  const dest = `/login?next=${encodeURIComponent(nextPath || pathname || '/dashboard')}`

  useEffect(() => {
    if (role.checked && !role.isOwnerLevel) router.replace(dest)
  }, [role.checked, role.isOwnerLevel, router, dest])

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
