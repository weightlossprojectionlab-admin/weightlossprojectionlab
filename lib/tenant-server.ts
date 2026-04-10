/**
 * Server-side tenant lookup, cached per-request via React cache().
 * Used by app/tenant-shell/* to avoid double-fetching the tenant doc.
 */

import { cache } from 'react'
import { getAdminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import type { Tenant } from '@/types/tenant'

export const getTenantBySlug = cache(async (slug: string): Promise<Tenant | null> => {
  try {
    const db = getAdminDb()
    const snap = await db.collection('tenants').where('slug', '==', slug).limit(1).get()
    if (snap.empty) return null
    const doc = snap.docs[0]
    return { ...(doc.data() as Omit<Tenant, 'id'>), id: doc.id }
  } catch (err) {
    logger.error('[tenant-server] Failed to fetch tenant by slug', err as Error, { slug })
    throw err
  }
})

/**
 * Look up a tenant by Firestore document id. Used by post-checkout
 * landing pages (success/cancelled) which receive the tenantId in a
 * query string from Stripe redirects.
 *
 * Soft-fails by returning null on lookup error so the landing pages
 * can degrade gracefully to generic copy without showing an error to
 * a customer who just paid.
 */
export const getTenantById = cache(async (tenantId: string): Promise<Tenant | null> => {
  try {
    const db = getAdminDb()
    const snap = await db.collection('tenants').doc(tenantId).get()
    if (!snap.exists) return null
    return { ...(snap.data() as Omit<Tenant, 'id'>), id: snap.id }
  } catch (err) {
    logger.error('[tenant-server] Failed to fetch tenant by id', err as Error, { tenantId })
    return null
  }
})

/**
 * Phase B slice 6: list every tenant that's eligible for the public
 * /find-a-provider directory. "Eligible" means status is one of the
 * post-payment states (active, paid). Pending and suspended tenants
 * are filtered out.
 *
 * Capped at 200 to keep the directory page bounded; pagination is a
 * Phase C concern. Soft-fails to an empty list on lookup error so the
 * directory page renders an empty state instead of a 500.
 */
export const listPublicTenants = cache(async (): Promise<Tenant[]> => {
  try {
    const db = getAdminDb()
    const snap = await db
      .collection('tenants')
      .where('status', 'in', ['active', 'paid'])
      .limit(200)
      .get()
    return snap.docs.map(doc => ({
      ...(doc.data() as Omit<Tenant, 'id'>),
      id: doc.id,
    }))
  } catch (err) {
    logger.error('[tenant-server] Failed to list public tenants', err as Error)
    return []
  }
})
