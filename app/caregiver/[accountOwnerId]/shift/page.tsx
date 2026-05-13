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

// ─── visual helpers ────────────────────────────────────────────────────

/** Time-of-day greeting in the page title. Keeps "Today" but warmer. */
function greetingTitle(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Tonight'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Tonight'
}

/** Pick a per-item emoji from kind + duty category. The category set
 *  is open-ended (custom user duties), so unknown values fall back to
 *  a generic clipboard. */
function pickIcon(kind: string, category?: string): string {
  if (kind === 'check_in') return '👋'
  switch ((category || '').toLowerCase()) {
    case 'medication':
    case 'medications':
      return '💊'
    case 'meals':
    case 'meal':
    case 'cooking':
      return '🍽️'
    case 'household':
    case 'chores':
    case 'cleaning':
      return '🏠'
    case 'errands':
    case 'shopping':
      return '🛒'
    case 'appointments':
    case 'appointment':
      return '📅'
    case 'finances':
    case 'bills':
      return '💵'
    case 'transportation':
    case 'transport':
      return '🚗'
    case 'yard_work':
      return '🌳'
    case 'self_care':
      return '🛁'
    default:
      return '📋'
  }
}

/** Soft pastel tint for the avatar tile, picked from the same vocabulary
 *  as pickIcon so icons and colors agree per category. */
function pickTint(kind: string, category?: string): string {
  if (kind === 'check_in') return 'bg-teal-100 dark:bg-teal-900/30'
  switch ((category || '').toLowerCase()) {
    case 'medication':
    case 'medications':
      return 'bg-rose-100 dark:bg-rose-900/30'
    case 'meals':
    case 'meal':
    case 'cooking':
      return 'bg-orange-100 dark:bg-orange-900/30'
    case 'household':
    case 'chores':
    case 'cleaning':
      return 'bg-amber-100 dark:bg-amber-900/30'
    case 'errands':
    case 'shopping':
      return 'bg-yellow-100 dark:bg-yellow-900/30'
    case 'appointments':
    case 'appointment':
      return 'bg-purple-100 dark:bg-purple-900/30'
    case 'finances':
    case 'bills':
      return 'bg-emerald-100 dark:bg-emerald-900/30'
    case 'yard_work':
      return 'bg-lime-100 dark:bg-lime-900/30'
    default:
      return 'bg-blue-100 dark:bg-blue-900/30'
  }
}

/** Snake_case → Title Case for the small subtitle line ("medication" →
 *  "Medication"; "yard_work" → "Yard Work"). */
function prettyCategory(category: string): string {
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
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
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-blue-50/40 to-background dark:from-purple-900/10 dark:via-blue-900/5 dark:to-background">
      <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 text-white py-2 px-4 text-center text-xs font-semibold tracking-wide">
        ✨ Beta — Today
      </div>

      <PageHeader
        title={greetingTitle()}
        subtitle="A quick look at what's on your plate across every household you help. 💛"
      />

      <main className="container mx-auto px-4 py-8" data-testid="shift-worklist">
        {loading ? (
          <div className="bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-sm p-10 text-center">
            <div className="text-4xl mb-2">☕</div>
            <p className="text-sm text-muted-foreground">Loading today&apos;s care…</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-sm p-10 text-center">
            <div className="text-5xl mb-3">🌿</div>
            <h2 className="text-xl font-semibold text-foreground mb-2">All clear today</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              No households on your list yet. When someone invites you to caregive, you&apos;ll see their family here.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {groups.map((group, groupIdx) => {
              // Soft per-section accent — each household gets a different
              // pastel band so the eye can scan across multiple families.
              const accents = [
                { ring: 'ring-purple-200', dot: 'bg-purple-400', soft: 'from-purple-100 to-pink-50' },
                { ring: 'ring-blue-200', dot: 'bg-blue-400', soft: 'from-blue-100 to-teal-50' },
                { ring: 'ring-amber-200', dot: 'bg-amber-400', soft: 'from-amber-100 to-orange-50' },
                { ring: 'ring-emerald-200', dot: 'bg-emerald-400', soft: 'from-emerald-100 to-lime-50' },
              ]
              const accent = accents[groupIdx % accents.length]

              return (
                <section key={group.ownerId} data-testid={`shift-group-${group.ownerId}`}>
                  <div className={`bg-gradient-to-r ${accent.soft} dark:bg-none dark:bg-card rounded-2xl px-5 py-3 mb-4 flex items-center justify-between shadow-sm`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${accent.dot}`}></span>
                      <h2 className="text-sm font-semibold text-foreground">
                        {group.ownerName}&apos;s Family
                      </h2>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {group.items.length} {group.items.length === 1 ? 'thing' : 'things'} on your plate
                    </span>
                  </div>

                  <ul className="space-y-3">
                    {group.items.map((item) => {
                      const icon = pickIcon(item.kind, item.category)
                      const tint = pickTint(item.kind, item.category)
                      const actionLabel =
                        item.kind === 'duty'
                          ? (item.category ? prettyCategory(item.category) : 'Duty')
                          : 'Check-in'
                      const urgencyLabel =
                        item.urgency === 'overdue'
                          ? '⚠️ Overdue'
                          : item.urgency === 'due_now'
                            ? '⏰ Due today'
                            : null
                      const urgencyClass =
                        item.urgency === 'overdue'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                          : item.urgency === 'due_now'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : null
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => router.push(item.href)}
                            data-testid={`shift-item-${item.id}`}
                            className="w-full text-left bg-white dark:bg-card rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-4 flex items-center gap-4"
                          >
                            <div className={`w-12 h-12 rounded-2xl ${tint} flex items-center justify-center flex-shrink-0 text-2xl`}>
                              {icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground truncate">{item.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.patientName ? `for ${item.patientName} · ` : ''}{actionLabel}
                              </p>
                            </div>
                            {urgencyLabel && urgencyClass && (
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${urgencyClass} flex-shrink-0`}>
                                {urgencyLabel}
                              </span>
                            )}
                            <svg
                              className="w-5 h-5 text-muted-foreground/60 flex-shrink-0"
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
              )
            })}
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
