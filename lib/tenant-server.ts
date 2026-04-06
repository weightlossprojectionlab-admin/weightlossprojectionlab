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
    logger.error('[tenant-server] Failed to fetch tenant', err as Error, { slug })
    throw err
  }
})
