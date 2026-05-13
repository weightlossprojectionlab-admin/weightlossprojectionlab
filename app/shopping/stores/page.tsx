'use client'

/**
 * /shopping/stores — owner-facing "My Stores" roster page.
 *
 * The owner picks which chains they actually shop at from a curated
 * catalog (constants/store-roster.ts). The choices are persisted to
 * users/{ownerId}.householdStoreIds and later feed:
 *   • The Start Shopping "Which store?" picker (Phase 0a-ii)
 *   • Per-item store assignment on /shopping (Phase 0b)
 *   • The bell title — "Sarah is shopping at X" instead of generic
 *
 * Phase 0a-i scope: this page IS the only host for the picker.
 * Sidebar nav isn't updated yet — the page is deep-linkable, and the
 * Start Shopping integration in 0a-ii adds a discoverable entry point.
 *
 * UX state (post-Phase 0a-ii):
 *   - "What this enables" banner sets expectations about what the
 *     roster powers (caregiver flow today; per-item assignment soon).
 *     Owners who land here cold understand the payoff without having
 *     to dig into the caregiver-side surfaces.
 *   - Sticky bottom CTA gives a clear forward-motion exit ("Done →
 *     shopping list"). Disabled when zero stores are picked, with
 *     copy that tells the owner why. Mobile-first sticky pattern so
 *     the action stays visible while scrolling 30 tiles.
 */

import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { StoreRosterPicker } from '@/components/family/StoreRosterPicker'
import { useStoreRoster } from '@/hooks/useStoreRoster'
import { Spinner } from '@/components/ui/Spinner'

function StoreRosterPageContent() {
  const router = useRouter()
  const { selectedIds, loading, saving, error, toggle } = useStoreRoster()
  const hasSelection = selectedIds.length > 0

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="My Stores"
        subtitle="Pick the stores your family actually shops at. Caregivers will choose from this list when they head to the store."
      />

      {/*
        Mobile-first layout:
          • Page container drops outer horizontal padding to 0 on phones
            (the card hugs the screen edges via px-3 on the main element);
            sm: and up restores comfortable margins.
          • Vertical padding tighter on mobile (py-4) so more tiles fit
            above the fold without scroll.
          • Card padding tighter on mobile (p-3) — every pixel of
            chrome is taken from tiles in a 360–414px viewport.
      */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
        <div className="bg-card rounded-2xl border border-border p-3 sm:p-6 shadow-sm">
          {/*
            Sticky counter: on a 30-tile list the user is scrolling
            through ~3 screens of grid. Without sticking, the "N stores
            selected" feedback disappears the moment they leave the
            header. We pin it to the top of the card's scroll context
            so they see the running tally as they tap.
            bg-card + small backdrop-blur ensures it reads cleanly over
            tiles scrolling underneath.
          */}
          <div className="sticky top-0 z-10 -mx-3 -mt-3 sm:-mx-6 sm:-mt-6 px-3 sm:px-6 pt-3 sm:pt-6 pb-3 mb-4 sm:mb-5 bg-card/95 backdrop-blur-sm border-b border-border rounded-t-2xl flex items-baseline justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground text-base">
                {selectedIds.length}
              </span>{' '}
              store{selectedIds.length === 1 ? '' : 's'} selected
            </p>
            {saving && (
              <span className="text-xs text-muted-foreground" aria-live="polite">
                Saving…
              </span>
            )}
          </div>

          {/*
            "What this is for" explainer. Sets expectations so the
            owner doesn't think "I picked stores, now what?". Two
            beats: the immediate payoff (caregivers see this), and
            the coming payoff (per-item tagging). Small visual weight
            — meant to inform, not block.
          */}
          <div className="mb-5 sm:mb-6 px-3 py-3 sm:px-4 sm:py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl text-xs sm:text-sm text-blue-900 dark:text-blue-100 leading-snug">
            <p className="font-medium mb-1">What this is for</p>
            <p className="text-blue-800/90 dark:text-blue-100/90">
              Your caregivers see these stores when they head out shopping —
              they pick one before they go, and your family sees{' '}
              <span className="font-medium">&ldquo;Sarah is at Walmart&rdquo;</span>{' '}
              instead of a generic notification.
              <span className="block mt-1 text-blue-700/80 dark:text-blue-200/70">
                Coming soon: tag each item on your shopping list with which
                store to buy it at.
              </span>
            </p>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <StoreRosterPicker
              selectedIds={selectedIds}
              onToggle={toggle}
              disabled={saving}
            />
          )}

          {error && (
            <p className="mt-4 text-sm text-error" role="alert">
              {error}
            </p>
          )}

          {/*
            Sticky bottom CTA. position:sticky inside the card pins
            the button to the bottom of the viewport while the user
            scrolls the tile grid, then releases when the user reaches
            the natural end of the card. Mobile-first — the dominant
            pattern for "I'm done picking, take me forward."
            Disabled when zero stores selected; copy tells the owner
            what to do to enable it.
          */}
          <div className="sticky bottom-0 z-10 -mx-3 -mb-3 sm:-mx-6 sm:-mb-6 mt-6 px-3 sm:px-6 py-3 sm:py-4 bg-card/95 backdrop-blur-sm border-t border-border rounded-b-2xl">
            <button
              type="button"
              disabled={!hasSelection || saving}
              onClick={() => router.push('/shopping')}
              data-testid="store-roster-done"
              className="w-full px-4 py-3 text-sm sm:text-base font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] transition-colors"
            >
              {hasSelection
                ? 'Done — take me to my shopping list →'
                : 'Pick at least one store to continue'}
            </button>
          </div>
        </div>

        <p className="mt-5 sm:mt-6 px-2 text-xs text-muted-foreground text-center max-w-md mx-auto">
          Don&apos;t see a store you shop at? Tell us — we add new chains as
          households request them.
        </p>
      </main>
    </div>
  )
}

export default function StoreRosterPage() {
  return (
    <AuthGuard>
      <StoreRosterPageContent />
    </AuthGuard>
  )
}
