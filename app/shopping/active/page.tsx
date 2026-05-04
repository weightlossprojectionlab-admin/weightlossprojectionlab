'use client'

/**
 * In-store shopping mode (Stage 2a) — its own page.
 *
 * Lives at /shopping/active so it's a real navigation destination
 * (sidebar menu item, deep-linkable, browser-back works) instead
 * of an overlay bolted onto /shopping. The previous overlay-only
 * approach made the "Start Shopping" button feel bolted on; this
 * page-route gives it a peer relationship to /shopping (build the
 * list) and /inventory (pantry view).
 *
 * Connection points:
 *   - Out: sidebar menu has a "Start Shopping" link to here.
 *   - Back: the ActiveShoppingMode header's End / X close fires
 *           router.back(), which returns to wherever the user came
 *           from (typically /shopping). Browser-back is also wired
 *           naturally because this is a real route.
 *
 * Empty-state behavior: if the user has no needed items, the
 * ActiveShoppingMode list view shows its own "no items" message —
 * no special handling here.
 */

import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import AuthGuard from '@/components/auth/AuthGuard'
import { useShopping } from '@/hooks/useShopping'
import { Spinner } from '@/components/ui/Spinner'

const ActiveShoppingMode = dynamic(
  () =>
    import('@/components/shopping/ActiveShoppingMode').then((mod) => ({
      default: mod.ActiveShoppingMode,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <Spinner />
      </div>
    ),
  }
)

function ActiveShoppingPageContent() {
  const router = useRouter()
  const { items: allItems, loading } = useShopping()

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  // The component takes the full set of items; it filters to needed
  // internally (and snapshots on open). Same prop shape as before
  // when it was an overlay — only the parent surface changed.
  const neededItems = allItems.filter((item) => item.needed)

  return (
    <ActiveShoppingMode
      isOpen
      onClose={() => router.back()}
      items={neededItems}
    />
  )
}

export default function ActiveShoppingPage() {
  return (
    <AuthGuard>
      <ActiveShoppingPageContent />
    </AuthGuard>
  )
}
