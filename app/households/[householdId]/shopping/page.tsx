'use client'

/**
 * Household Shopping List (cross-household caregiver view)
 *
 * Built for the caregiver workflow: a caregiver assigned a shopping duty
 * lands here from the duty notification CTA so they can see and act on
 * what to buy.
 *
 * Reads + writes go through `/api/households/[id]/shopping/...` which
 * does the household-membership RBAC check on the server and uses the
 * admin SDK to mutate the household owner's `shopping_items` (Firestore
 * client rules block direct cross-user writes). The household admin's
 * own /shopping page still works the same as before — this is just a
 * caregiver-facing view of the same list.
 *
 * Route: /households/[householdId]/shopping?dutyId=<id>
 */

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import {
  CheckCircleIcon,
  ShoppingCartIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface HouseholdShoppingItem {
  id: string
  userId: string
  productName: string
  brand?: string
  imageUrl?: string
  category?: string
  quantity?: number
  unit?: string
  displayQuantity?: string
  priority?: 'low' | 'normal' | 'high'
  needed?: boolean
  notes?: string
}

interface ShoppingResponse {
  ownerUserId: string
  items: HouseholdShoppingItem[]
  neededItems: HouseholdShoppingItem[]
  count: number
  neededCount: number
}

function HouseholdShoppingContent() {
  const params = useParams<{ householdId: string }>()
  const searchParams = useSearchParams()
  const householdId = params.householdId
  const dutyId = searchParams.get('dutyId')

  const [data, setData] = useState<ShoppingResponse | null>(null)
  const [householdName, setHouseholdName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [purchasingIds, setPurchasingIds] = useState<Set<string>>(new Set())
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [recentlyPurchased, setRecentlyPurchased] = useState<Set<string>>(new Set())
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')

  async function authedFetch(url: string, init: RequestInit = {}) {
    const user = auth.currentUser
    if (!user) throw new Error('Not signed in')
    const idToken = await user.getIdToken()
    return fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    })
  }

  async function refresh() {
    const res = await authedFetch(`/api/households/${householdId}/shopping`)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error || `HTTP ${res.status}`)
    }
    const body = (await res.json()) as ShoppingResponse
    setData(body)
    setIsOwner(body.ownerUserId === auth.currentUser?.uid)
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const user = auth.currentUser
        if (!user) return // AuthGuard redirects
        await refresh()
        if (cancelled) return

        // Best-effort fetch of the household's display name so the header
        // doesn't read like a uuid. Failure here is non-fatal.
        try {
          const idToken = await user.getIdToken()
          const householdRes = await fetch(`/api/households/${householdId}`, {
            headers: { Authorization: `Bearer ${idToken}` },
          })
          if (householdRes.ok) {
            const body = await householdRes.json()
            const name = body?.household?.name ?? body?.name
            if (!cancelled && typeof name === 'string') setHouseholdName(name)
          }
        } catch {
          // ignore
        }
      } catch (err: any) {
        if (cancelled) return
        logger.error('[HouseholdShopping] load failed', err as Error, { householdId })
        setError(err?.message || 'Failed to load shopping list')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId])

  async function handleMarkPurchased(itemId: string, productName: string) {
    setPurchasingIds(prev => new Set(prev).add(itemId))
    try {
      const res = await authedFetch(
        `/api/households/${householdId}/shopping/items/${itemId}/purchase`,
        { method: 'POST', body: JSON.stringify({}) }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      // Optimistically drop the item from the visible list. The server
      // mutated the owner's record; we don't need to re-fetch immediately.
      setData(prev => {
        if (!prev) return prev
        const remaining = prev.neededItems.filter(i => i.id !== itemId)
        return { ...prev, neededItems: remaining, neededCount: remaining.length }
      })
      setRecentlyPurchased(prev => new Set(prev).add(itemId))
      toast.success(`Marked "${productName}" as purchased`)
    } catch (err: any) {
      logger.error('[HouseholdShopping] mark purchased failed', err as Error, { itemId })
      toast.error(err?.message || 'Failed to mark item as purchased')
    } finally {
      setPurchasingIds(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  function withBusy(itemId: string, on: boolean) {
    setBusyIds(prev => {
      const next = new Set(prev)
      if (on) next.add(itemId)
      else next.delete(itemId)
      return next
    })
  }

  async function patchItem(itemId: string, body: Record<string, unknown>) {
    const res = await authedFetch(
      `/api/households/${householdId}/shopping/items/${itemId}`,
      { method: 'PATCH', body: JSON.stringify(body) }
    )
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody?.error || `HTTP ${res.status}`)
    }
  }

  async function handleQtyDelta(itemId: string, delta: number, currentQty: number) {
    if (currentQty + delta < 1) {
      toast('Use Remove to drop the item from the list', { icon: 'ℹ️' })
      return
    }
    withBusy(itemId, true)
    // Optimistic update
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        neededItems: prev.neededItems.map(i =>
          i.id === itemId ? { ...i, quantity: (i.quantity ?? 0) + delta } : i
        ),
      }
    })
    try {
      await patchItem(itemId, { delta })
    } catch (err: any) {
      // Roll back optimistic update
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          neededItems: prev.neededItems.map(i =>
            i.id === itemId ? { ...i, quantity: (i.quantity ?? 0) - delta } : i
          ),
        }
      })
      logger.error('[HouseholdShopping] qty update failed', err as Error, { itemId, delta })
      toast.error(err?.message || 'Failed to update quantity')
    } finally {
      withBusy(itemId, false)
    }
  }

  async function handleRemove(itemId: string, productName: string) {
    if (!confirm(`Remove "${productName}" from the shopping list?`)) return
    withBusy(itemId, true)
    try {
      await patchItem(itemId, { needed: false })
      setData(prev => {
        if (!prev) return prev
        const remaining = prev.neededItems.filter(i => i.id !== itemId)
        return { ...prev, neededItems: remaining, neededCount: remaining.length }
      })
      toast.success(`Removed "${productName}"`)
    } catch (err: any) {
      logger.error('[HouseholdShopping] remove failed', err as Error, { itemId })
      toast.error(err?.message || 'Failed to remove item')
    } finally {
      withBusy(itemId, false)
    }
  }

  function startEditingNotes(item: HouseholdShoppingItem) {
    setEditingNotesId(item.id)
    setNotesDraft(item.notes ?? '')
  }

  async function saveNotes(itemId: string) {
    const trimmed = notesDraft.trim()
    withBusy(itemId, true)
    try {
      await patchItem(itemId, { notes: trimmed })
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          neededItems: prev.neededItems.map(i =>
            i.id === itemId ? { ...i, notes: trimmed || undefined } : i
          ),
        }
      })
      setEditingNotesId(null)
      setNotesDraft('')
    } catch (err: any) {
      logger.error('[HouseholdShopping] notes update failed', err as Error, { itemId })
      toast.error(err?.message || 'Failed to save note')
    } finally {
      withBusy(itemId, false)
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    const name = newItemName.trim()
    if (!name) return
    setAdding(true)
    try {
      const res = await authedFetch(
        `/api/households/${householdId}/shopping/items`,
        { method: 'POST', body: JSON.stringify({ productName: name }) }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      setNewItemName('')
      setShowAddForm(false)
      await refresh()
      toast.success(`Added "${name}"`)
    } catch (err: any) {
      logger.error('[HouseholdShopping] add item failed', err as Error)
      toast.error(err?.message || 'Failed to add item')
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Shopping List" backButton showMenu />
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Shopping List" backButton showMenu />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        </div>
      </div>
    )
  }

  const needed = data?.neededItems ?? []

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        title={householdName ? `${householdName} — Shopping` : 'Household Shopping'}
        subtitle={`${needed.length} item${needed.length === 1 ? '' : 's'} to buy`}
        backButton
        showMenu
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {dutyId && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 flex items-center gap-2">
            <ShoppingCartIcon className="w-5 h-5 flex-shrink-0" />
            <span>
              You arrived from a shopping duty.{' '}
              <Link href={`/households/duties?householdId=${householdId}&dutyId=${dutyId}`} className="underline font-medium">
                View the duty
              </Link>
              {' '}to mark it complete after shopping.
            </span>
          </div>
        )}

        {!isOwner && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
            You're shopping on behalf of this household. Tap{' '}
            <span className="font-semibold">Mark Purchased</span> as you put each
            item in your cart — the household admin sees the list update live.
            Need full inventory + barcode scanning? Use the
            household admin's <Link href="/shopping" className="underline font-medium">/shopping</Link> page.
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Needed ({needed.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowAddForm(prev => !prev)}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-primary rounded-lg hover:bg-primary/10 min-h-[44px]"
          >
            <PlusIcon className="w-4 h-4" />
            Add item
          </button>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleAddItem}
            className="bg-card border border-border rounded-lg p-3 space-y-3"
          >
            <input
              type="text"
              autoFocus
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              placeholder="e.g. Whole milk, 1 gallon"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={adding}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setNewItemName('') }}
                className="px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-muted min-h-[44px]"
                disabled={adding}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding || !newItemName.trim()}
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 min-h-[44px]"
              >
                {adding ? 'Adding…' : 'Add to list'}
              </button>
            </div>
          </form>
        )}

        {needed.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <CheckCircleIcon className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <h2 className="text-lg font-semibold text-foreground">All caught up</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {recentlyPurchased.size > 0
                ? `Nice work — ${recentlyPurchased.size} item${recentlyPurchased.size === 1 ? '' : 's'} purchased.`
                : 'No items currently flagged as needed.'}
            </p>
          </div>
        ) : (
          <ul className="bg-card border border-border rounded-lg divide-y divide-border">
            {needed.map((item) => {
              const purchasing = purchasingIds.has(item.id)
              const busy = busyIds.has(item.id)
              const qty = typeof item.quantity === 'number' ? item.quantity : 1
              const editingNotes = editingNotesId === item.id
              return (
                <li key={item.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-12 h-12 rounded object-cover flex-shrink-0 bg-muted"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                        🛒
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{item.productName}</div>
                      {item.brand && (
                        <div className="text-xs text-muted-foreground">{item.brand}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                        {item.category && <span>{item.category}</span>}
                        {item.priority === 'high' && (
                          <span className="text-red-600 font-medium">· High priority</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {editingNotes ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={notesDraft}
                        onChange={e => setNotesDraft(e.target.value)}
                        placeholder="e.g. Get the unsweetened version"
                        rows={2}
                        autoFocus
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={busy}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => { setEditingNotesId(null); setNotesDraft('') }}
                          disabled={busy}
                          className="px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-muted min-h-[44px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveNotes(item.id)}
                          disabled={busy}
                          className="px-3 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 min-h-[44px]"
                        >
                          Save note
                        </button>
                      </div>
                    </div>
                  ) : item.notes ? (
                    <button
                      type="button"
                      onClick={() => startEditingNotes(item)}
                      className="text-left text-sm text-foreground/80 bg-muted/40 rounded-md px-3 py-2 hover:bg-muted/70"
                    >
                      <span className="text-muted-foreground text-xs uppercase tracking-wide block">
                        Note (tap to edit)
                      </span>
                      {item.notes}
                    </button>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center border border-border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleQtyDelta(item.id, -1, qty)}
                        disabled={busy || qty <= 1}
                        className="px-3 min-h-[44px] hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label={`Decrease quantity for ${item.productName}`}
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      <span className="px-3 text-sm font-medium tabular-nums min-w-[3ch] text-center">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQtyDelta(item.id, +1, qty)}
                        disabled={busy}
                        className="px-3 min-h-[44px] hover:bg-muted disabled:opacity-40"
                        aria-label={`Increase quantity for ${item.productName}`}
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>
                    {item.unit && (
                      <span className="text-xs text-muted-foreground">{item.unit}</span>
                    )}

                    {!editingNotes && (
                      <button
                        type="button"
                        onClick={() => startEditingNotes(item)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 px-2 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md min-h-[44px]"
                        aria-label={`Edit note for ${item.productName}`}
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                        {item.notes ? 'Edit note' : 'Add note'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemove(item.id, item.productName)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-2 py-2 text-xs text-red-600 hover:bg-red-50 rounded-md min-h-[44px] ml-auto"
                      aria-label={`Remove ${item.productName} from list`}
                    >
                      <TrashIcon className="w-4 h-4" />
                      Remove
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMarkPurchased(item.id, item.productName)}
                      disabled={purchasing || busy}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-60 min-h-[44px] w-full sm:w-auto"
                      aria-label={`Mark ${item.productName} as purchased`}
                    >
                      {purchasing ? (
                        <>Marking…</>
                      ) : (
                        <>
                          <CheckCircleIcon className="w-5 h-5" />
                          Mark Purchased
                        </>
                      )}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {isOwner && (
          <div className="text-center">
            <Link
              href="/shopping"
              className="inline-block px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover"
            >
              Open full shopping page
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function HouseholdShoppingPage() {
  return (
    <AuthGuard>
      <HouseholdShoppingContent />
    </AuthGuard>
  )
}
