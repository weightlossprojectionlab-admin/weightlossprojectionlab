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
 */

import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { StoreRosterPicker } from '@/components/family/StoreRosterPicker'
import { useStoreRoster } from '@/hooks/useStoreRoster'
import { Spinner } from '@/components/ui/Spinner'

function StoreRosterPageContent() {
  const { selectedIds, loading, saving, error, toggle } = useStoreRoster()

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="My Stores"
        subtitle="Pick the stores your family actually shops at. Caregivers will choose from this list when they head to the store."
      />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
          <div className="flex items-baseline justify-between mb-5">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {selectedIds.length}
              </span>{' '}
              store{selectedIds.length === 1 ? '' : 's'} selected
            </p>
            {saving && (
              <span className="text-xs text-muted-foreground">Saving…</span>
            )}
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
        </div>

        <p className="mt-6 text-xs text-muted-foreground text-center max-w-md mx-auto">
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
