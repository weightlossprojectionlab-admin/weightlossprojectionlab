'use client'

/**
 * Managed-By Consent Banner
 *
 * Shown on the consumer dashboard when the user's `managedBy` array has
 * entries and they haven't consented yet. The franchise owner added them
 * as a client via the intake wizard — now the client needs to accept or
 * decline the management relationship.
 *
 * Accept: sets `managedByConsented: true` on the user doc. The franchise
 * keeps access to the client's health data.
 *
 * Decline: removes the tenantId from `managedBy` and the client returns
 * to being a regular unmanaged consumer.
 */

import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { doc, updateDoc, arrayRemove } from 'firebase/firestore'
import { logger } from '@/lib/logger'

interface Props {
  userId: string
  managedBy: string[]
  managedByConsented?: boolean
}

interface TenantInfo {
  id: string
  name: string
  slug: string
}

export default function ManagedByBanner({ userId, managedBy, managedByConsented }: Props) {
  const [tenants, setTenants] = useState<TenantInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const shouldHide = managedByConsented || !managedBy?.length || dismissed

  // Load tenant names via API (can't read tenants collection directly —
  // Firestore rules restrict it to admins/tenant admins only)
  useEffect(() => {
    const loadTenants = async () => {
      if (!managedBy?.length) { setLoading(false); return }
      try {
        const token = await auth?.currentUser?.getIdToken()
        if (!token) { setLoading(false); return }
        const res = await fetch('/api/tenant/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tenantIds: managedBy }),
        })
        if (res.ok) {
          const data = await res.json()
          setTenants(data.tenants || [])
        } else {
          // Fallback: show generic names
          setTenants(managedBy.map(id => ({ id, name: 'A care provider', slug: '' })))
        }
      } catch (err) {
        logger.error('[ManagedByBanner] failed to load tenant info', err as Error)
        setTenants(managedBy.map(id => ({ id, name: 'A care provider', slug: '' })))
      } finally {
        setLoading(false)
      }
    }
    loadTenants()
  }, [managedBy])

  const handleAccept = async (tenantId: string) => {
    if (!db || !userId) return
    setActing(tenantId)
    try {
      await updateDoc(doc(db, 'users', userId), {
        managedByConsented: true,
      })
      setDismissed(true)
    } catch (err) {
      logger.error('[ManagedByBanner] accept failed', err as Error)
      setActing(null)
    }
  }

  const handleDecline = async (tenantId: string) => {
    if (!db || !userId) return
    setActing(tenantId)
    try {
      await updateDoc(doc(db, 'users', userId), {
        managedBy: arrayRemove(tenantId),
      })
      setDismissed(true)
    } catch (err) {
      logger.error('[ManagedByBanner] decline failed', err as Error)
      setActing(null)
    }
  }

  if (shouldHide || loading || tenants.length === 0) return null

  return (
    <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-6">
      {tenants.map(tenant => (
        <div key={tenant.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🏥</span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {tenant.name} wants to manage your care
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              By accepting, {tenant.name} will be able to view your health data
              (meals, vitals, weight, medications) to provide better care.
              You can change this anytime from your settings.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => handleAccept(tenant.id)}
              disabled={acting !== null}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition"
            >
              {acting === tenant.id ? '...' : 'Accept'}
            </button>
            <button
              onClick={() => handleDecline(tenant.id)}
              disabled={acting !== null}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 disabled:opacity-50 transition"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
