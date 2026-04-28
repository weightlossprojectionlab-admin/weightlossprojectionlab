'use client'

/**
 * Household Shopping List (read-only, cross-household view)
 *
 * Built for the caregiver workflow: a caregiver assigned a shopping duty
 * lands here from the duty notification CTA so they can see what to buy.
 *
 * Read-only on purpose for v1 — write operations require deeper Firestore
 * rule + RBAC work (see useShopping). Once that lands, this page can grow
 * into a full editable household view or merge with /shopping.
 *
 * Route: /households/[householdId]/shopping?dutyId=<id>
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { CheckCircleIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { getCSRFToken } from '@/lib/csrf'

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
  const router = useRouter()
  const householdId = params.householdId
  const dutyId = searchParams.get('dutyId')

  const [data, setData] = useState<ShoppingResponse | null>(null)
  const [householdName, setHouseholdName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const user = auth.currentUser
        if (!user) {
          // AuthGuard will redirect; just bail.
          return
        }
        const idToken = await user.getIdToken()
        const res = await fetch(`/api/households/${householdId}/shopping`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || `HTTP ${res.status}`)
        }
        const body = (await res.json()) as ShoppingResponse
        if (cancelled) return
        setData(body)
        setIsOwner(body.ownerUserId === user.uid)

        // Best-effort fetch of the household's display name so the header
        // doesn't read like a uuid. Failure here is non-fatal.
        try {
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
  }, [householdId])

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
            You're viewing this shared household list as a caregiver. Editing,
            scanning, and inventory management are available to the household
            owner on the main <Link href="/shopping" className="underline font-medium">/shopping</Link> page.
          </div>
        )}

        {needed.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <CheckCircleIcon className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <h2 className="text-lg font-semibold text-foreground">All caught up</h2>
            <p className="text-sm text-muted-foreground mt-1">
              No items currently flagged as needed.
            </p>
          </div>
        ) : (
          <ul className="bg-card border border-border rounded-lg divide-y divide-border">
            {needed.map((item) => (
              <li key={item.id} className="p-4 flex items-start gap-3">
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
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    {item.displayQuantity && <span>{item.displayQuantity}</span>}
                    {item.category && <span>· {item.category}</span>}
                    {item.priority === 'high' && (
                      <span className="text-red-600 font-medium">High priority</span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-sm text-foreground/80 mt-1">{item.notes}</p>
                  )}
                </div>
              </li>
            ))}
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
