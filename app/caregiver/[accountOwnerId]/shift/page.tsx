/**
 * Caregiver Shift View (P0 placeholder)
 *
 * Semantic caregiver dashboard: worklist on top, vertical workspaces below,
 * handoff log as cross-cutting spine. Built phased behind CAREGIVER_SHIFT_VIEW.
 *
 * P0: placeholder + back link. P1 wires useCaregiverWorklist. P2 renders worklist.
 */

'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { isFeatureEnabled } from '@/lib/featureFlags'

interface CaregiverShiftPageProps {
  params: Promise<{
    accountOwnerId: string
  }>
}

export default function CaregiverShiftPage({ params }: CaregiverShiftPageProps) {
  return (
    <AuthGuard>
      <CaregiverShiftContent params={params} />
    </AuthGuard>
  )
}

function CaregiverShiftContent({ params }: CaregiverShiftPageProps) {
  const router = useRouter()
  const { accountOwnerId } = use(params)

  if (!isFeatureEnabled('CAREGIVER_SHIFT_VIEW')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-foreground mb-3">Shift view unavailable</h1>
          <p className="text-muted-foreground mb-6">
            This view is gated behind a feature flag. Ask your admin to enable it.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/caregiver/${accountOwnerId}`)}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover min-h-[44px]"
          >
            Back to caregiver dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 px-4 text-center text-sm font-medium">
        Beta — Shift View
      </div>

      <PageHeader
        title="Your shift"
        subtitle="What's due in your window — worklist coming in the next phase."
      />

      <main className="container mx-auto px-4 py-8">
        <div className="bg-card rounded-lg border-2 border-border p-8 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">Worklist arrives next</h2>
          <p className="text-sm text-muted-foreground mb-6">
            P1 wires the &quot;what&apos;s due in my window&quot; predicate. P2 renders it here.
            Handoff log spine lands in P3–P4.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/caregiver/${accountOwnerId}`)}
            className="inline-flex items-center px-4 py-2 bg-card border-2 border-border text-foreground rounded-lg font-medium hover:border-primary min-h-[44px]"
          >
            Back to caregiver dashboard
          </button>
        </div>
      </main>
    </div>
  )
}
