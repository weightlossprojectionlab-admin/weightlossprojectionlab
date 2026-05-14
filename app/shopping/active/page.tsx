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
 * Session lifecycle:
 *   On mount we kick off shoppingSessionManager.startSession so that
 *   (a) the active-shoppers strip on /family/dashboard knows who is
 *   in-store right now, and (b) the bell fan-out endpoint
 *   /api/owners/[ownerId]/shopping/start has a sessionId to attach
 *   the notification metadata to. The session ends inside
 *   ActiveShoppingMode after Confirm Purchase succeeds — same place
 *   the duty auto-close fires.
 *
 * Store picker (Phase 0a-ii):
 *   Caregiver flows (ownerIdParam set) show the ShoppingStorePicker
 *   BEFORE the session starts. The picked store name flows into
 *   shopping_sessions.storeLocation.name → the announce-start request
 *   body → the bell title ("Sarah is shopping at Walmart") and the
 *   active-shoppers strip's per-card display. Empty roster or an
 *   explicit Skip starts the session without a storeLocation —
 *   identical behavior to the pre-0a-ii flow.
 *
 *   Owner-self trips (no ownerIdParam) skip the picker entirely —
 *   owner shopping their own list doesn't need the "for the family"
 *   context disambiguation, and the modal would just be friction
 *   between the dashboard and the items.
 *
 * Empty-state behavior: if the user has no needed items, the
 * ActiveShoppingMode list view shows its own "no items" message —
 * no special handling here.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import AuthGuard from '@/components/auth/AuthGuard'
import { useShopping } from '@/hooks/useShopping'
import { Spinner } from '@/components/ui/Spinner'
import { auth } from '@/lib/firebase'
import { shoppingSessionManager } from '@/lib/shopping-session-manager'
import { generateDeviceId } from '@/types/shopping-session'
import { logger } from '@/lib/logger'
import { ShoppingStorePicker } from '@/components/shopping/ShoppingStorePicker'
import { STORE_CATALOG_BY_ID } from '@/constants/store-roster'

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
  const searchParams = useSearchParams()
  // ?ownerId=<uid> — caregiver shopping on behalf of an owner they have
  // household access to. Undefined means "shop my own list" (owner path).
  // The Firestore rule's userId-as-owner branch gates the cross-account
  // read; if the caregiver isn't a familyMember of that owner, the
  // listener errors and the page falls back to the loading/empty state.
  const ownerIdParam = searchParams.get('ownerId') || undefined
  // ?dutyId=<id> — caregiver tapped a shopping-ish duty on the Today
  // view. ActiveShoppingMode fires the duty-complete endpoint on
  // Confirm Purchase so the caregiver doesn't have to mark it done
  // as a second step.
  const dutyIdParam = searchParams.get('dutyId') || undefined
  // ?store=<catalog-id> — Phase 0b. Caregiver picked a store from
  // the household roster; we filter the visible items to those
  // assigned to that store + unassigned ("any store"). When unset
  // OR 'any', the caregiver sees the full list.
  const storeIdParam = searchParams.get('store') || undefined
  const { items: allItems, loading } = useShopping(ownerIdParam)

  // Session id captured from shoppingSessionManager.startSession. Drives
  // the bell fan-out (start + done) and is passed through to
  // ActiveShoppingMode so handleConfirmPurchase has it for done.
  const [sessionId, setSessionId] = useState<string | null>(null)
  // Guard against React 18 strict-mode double-invocation creating two
  // sessions on first render. The ref flips after the FIRST startSession
  // call kicks off.
  const startedRef = useRef(false)

  // Store-picker gating. Caregiver mode shows the picker; the picked
  // store (or explicit skip) flips `pickerResolved` and the session-
  // start effect proceeds. Owner-self mode skips the picker entirely.
  //
  // If ?store= was already on the URL (deep-link from the duty card
  // pre-tagged with a store, or shared link), the picker is already
  // resolved — no modal flash. The caregiver still sees the correct
  // filtered list.
  const isCaregiverMode = !!ownerIdParam && ownerIdParam !== auth.currentUser?.uid
  const [pickerResolved, setPickerResolved] = useState<boolean>(!isCaregiverMode || !!storeIdParam)
  // When ?store= deep-links straight to the active mode (e.g. duty
  // card with a pre-tagged store, shared URL, e2e test), the picker's
  // onPick callback never fires — so we'd lose the store NAME for the
  // header. Resolve it from the catalog on initial render to keep
  // "Shopping at Walmart" rendering even without a picker interaction.
  const [pickedStoreName, setPickedStoreName] = useState<string | null>(() => {
    if (!storeIdParam) return null
    return STORE_CATALOG_BY_ID[storeIdParam]?.name ?? null
  })
  // Phase 0b — track the picked catalog id so we can:
  //   (a) thread it into shoppingSessionManager.startSession's storeId
  //   (b) filter the items the caregiver sees in ActiveShoppingMode
  //   (c) reflect it back into the URL so a refresh stays scoped
  const [pickedStoreId, setPickedStoreId] = useState<string | null>(
    storeIdParam ?? null,
  )

  const handlePickStore = useCallback((id: string | null, name: string | null) => {
    setPickedStoreId(id)
    setPickedStoreName(name)
    setPickerResolved(true)
    // Reflect into the URL so a refresh / deep-link stays scoped.
    // Skip when the URL already matches (avoids a no-op replace).
    if (id && id !== storeIdParam) {
      const next = new URLSearchParams(searchParams.toString())
      next.set('store', id)
      router.replace(`/shopping/active?${next.toString()}`)
    }
  }, [router, searchParams, storeIdParam])
  const handleEmptyRoster = useCallback(() => {
    // Roster has no entries — nothing to pick from; proceed without
    // a storeLocation. Same outcome as Skip, no modal flash.
    setPickerResolved(true)
  }, [])

  useEffect(() => {
    if (startedRef.current) return
    // Wait for the picker to resolve before creating the session —
    // otherwise we'd kick off without the storeLocation context we
    // were specifically asking for.
    if (!pickerResolved) return
    const user = auth.currentUser
    if (!user) return
    startedRef.current = true

    const householdId = ownerIdParam || user.uid
    const userName = user.displayName || user.email || 'Shopper'
    const userRole = ownerIdParam && ownerIdParam !== user.uid ? 'caregiver' : 'owner'

    ;(async () => {
      try {
        const id = await shoppingSessionManager.startSession({
          householdId,
          userId: user.uid,
          userName,
          userRole,
          deviceId: generateDeviceId(),
          // Lat/lng placeholders match logStoreVisit's current shape —
          // real geolocation lands in a future phase (per-store layout
          // learning). The brand-name string is the user-visible value
          // and the one the bell title surfaces.
          ...(pickedStoreName
            ? { storeLocation: { name: pickedStoreName, latitude: 0, longitude: 0 } }
            : {}),
          // Phase 0b — canonical catalog id (joins against
          // ShoppingItem.assignedStoreId for filtering). Distinct
          // from storeLocation.name (free text). Receipt OCR may
          // overwrite this post-checkout if the caregiver ended up
          // somewhere different.
          ...(pickedStoreId ? { storeId: pickedStoreId } : {}),
        })
        setSessionId(id)

        // Best-effort: announce the start to the owner + other
        // accepted family members. Failures don't block the trip.
        if (ownerIdParam) {
          try {
            const token = await user.getIdToken()
            await fetch(`/api/owners/${ownerIdParam}/shopping/start`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                sessionId: id,
                ...(dutyIdParam ? { fromDutyId: dutyIdParam } : {}),
                ...(pickedStoreName ? { storeName: pickedStoreName } : {}),
              }),
            })
          } catch (err) {
            logger.warn('[ActiveShoppingPage] announce-start failed', {
              error: (err as Error).message,
            })
          }
        }
      } catch (err) {
        logger.warn('[ActiveShoppingPage] startSession failed', {
          error: (err as Error).message,
        })
        // Reset the guard so a manual page refresh can retry.
        startedRef.current = false
      }
    })()
  }, [ownerIdParam, dutyIdParam, pickerResolved, pickedStoreName])

  // Caregiver mode + picker hasn't resolved yet → render the modal
  // over a backdrop. We deliberately don't load ActiveShoppingMode in
  // this state so the items don't flash behind the modal.
  if (isCaregiverMode && !pickerResolved) {
    return (
      <ShoppingStorePicker
        householdId={ownerIdParam!}
        onPick={handlePickStore}
        onEmptyRoster={handleEmptyRoster}
      />
    )
  }

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
  //
  // Phase 0b — when ?store=<catalog-id> is set (either from the
  // picker pass-through or a deep-link), filter to items assigned
  // to that store PLUS unassigned ("any store") items. Unassigned
  // items show in every store's view since they're "buy wherever
  // convenient"; getting picked off at one store removes them from
  // the next store's needed list automatically (needed flips false).
  const activeStoreId = pickedStoreId || storeIdParam || null
  const neededItems = allItems.filter((item) => {
    if (!item.needed) return false
    if (!activeStoreId) return true // no filter — show everything
    const assigned = item.assignedStoreId
    if (!assigned || assigned.length === 0) return true // any-store
    return assigned === activeStoreId
  })

  return (
    <ActiveShoppingMode
      isOpen
      onClose={() => router.back()}
      items={neededItems}
      dutyId={dutyIdParam}
      sessionId={sessionId}
      ownerId={ownerIdParam}
      storeName={pickedStoreName ?? undefined}
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
