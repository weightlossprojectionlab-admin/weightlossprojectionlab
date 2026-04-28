'use client'

/**
 * Legacy household shopping route — redirects to the unified URL.
 *
 * /households/{id}/shopping?dutyId={duty} → /shopping?household={id}&dutyId={duty}
 *
 * Kept around so duty notifications, bell rows, and bookmarks shipped
 * before the unification still work. New code should link directly to
 * /shopping?household={id}.
 */

import { useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Spinner } from '@/components/ui/Spinner'

export default function LegacyHouseholdShoppingRedirect() {
  const params = useParams<{ householdId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const householdId = params.householdId
    if (!householdId) return

    const target = new URLSearchParams()
    target.set('household', householdId)
    const dutyId = searchParams.get('dutyId')
    if (dutyId) target.set('dutyId', dutyId)

    router.replace(`/shopping?${target.toString()}`)
  }, [params.householdId, router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Spinner />
    </div>
  )
}
