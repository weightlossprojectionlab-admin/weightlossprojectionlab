/**
 * Caregiver Shift View
 *
 * Semantic caregiver dashboard: a flat worklist of what's due across
 * every household the caregiver helps, with a handoff-log spine landing
 * in P3–P4. Built phased behind CAREGIVER_SHIFT_VIEW.
 *
 * The [accountOwnerId] URL segment is currently a context anchor for
 * coming-from-which-owner navigation — the worklist itself spans ALL
 * owners the caregiver has access to (multi-household by design).
 */

'use client'

import { use, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { isFeatureEnabled } from '@/lib/featureFlags'
import { useCaregiverWorklist, type WorklistItem } from '@/hooks/useCaregiverWorklist'
import { HandoffNotes } from '@/components/caregiver/HandoffNotes'

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
  const { items, loading } = useCaregiverWorklist()

  // Group worklist items by owner so the UI can render one section per
  // household. Stable order: first occurrence in `items` wins.
  const groups = useMemo(() => {
    const byOwner = new Map<string, { ownerId: string; ownerName: string; items: WorklistItem[] }>()
    for (const item of items) {
      const existing = byOwner.get(item.ownerId)
      if (!existing) {
        byOwner.set(item.ownerId, {
          ownerId: item.ownerId,
          ownerName: item.ownerName,
          items: [item],
        })
      } else {
        existing.items.push(item)
      }
    }
    return Array.from(byOwner.values())
  }, [items])

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
        Beta — Today
      </div>

      <PageHeader
        title="Today"
        subtitle="What's due across every household you help."
      />

      <main className="container mx-auto px-4 py-8" data-testid="shift-worklist">
        {loading ? (
          <div className="bg-card rounded-lg border-2 border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Loading today's care…</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-card rounded-lg border-2 border-border p-8 text-center">
            <h2 className="text-lg font-semibold text-foreground mb-2">All clear</h2>
            <p className="text-sm text-muted-foreground">
              No households or patients on your access list right now. When someone invites
              you to caregive, their household appears here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.ownerId} data-testid={`shift-group-${group.ownerId}`}>
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.ownerName}&apos;s Family
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {group.items.length} {group.items.length === 1 ? 'patient' : 'patients'}
                  </span>
                </div>
                <ul className="space-y-2">
                  {group.items.map((item) => {
                    // Avatar initial: prefer the patient when a duty is tied to one,
                    // else fall back to the action verb's initial ("D" for duty,
                    // "C" for check_in) so household-wide duties don't render as "?".
                    const initialSource = item.patientName || item.kind || '?'
                    const initial = initialSource[0].toUpperCase()
                    const actionLabel = item.kind.replace(/_/g, ' ')
                    const urgencyLabel =
                      item.urgency === 'overdue'
                        ? 'Overdue'
                        : item.urgency === 'due_now'
                          ? 'Due now'
                          : null
                    const urgencyClass =
                      item.urgency === 'overdue'
                        ? 'bg-error-light text-error-dark'
                        : item.urgency === 'due_now'
                          ? 'bg-warning-light text-warning-dark'
                          : null
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => router.push(item.href)}
                          data-testid={`shift-item-${item.id}`}
                          className="w-full text-left bg-card rounded-lg border-2 border-border p-4 hover:border-primary transition-colors flex items-center gap-4"
                        >
                          <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                            <span className="text-primary font-semibold text-lg">{initial}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {item.patientName ? `${item.patientName} · ` : ''}{actionLabel}
                            </p>
                          </div>
                          {urgencyLabel && urgencyClass && (
                            <span className={`text-xs font-medium px-2 py-1 rounded ${urgencyClass} flex-shrink-0`}>
                              {urgencyLabel}
                            </span>
                          )}
                          <svg
                            className="w-5 h-5 text-muted-foreground flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {/* Per-household handoff log: composer + recent feed. */}
                <HandoffNotes ownerId={group.ownerId} ownerName={group.ownerName} />
              </section>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
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
