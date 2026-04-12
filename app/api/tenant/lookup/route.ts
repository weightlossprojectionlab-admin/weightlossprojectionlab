/**
 * POST /api/tenant/lookup
 *
 * Lightweight endpoint that returns tenant names for given IDs.
 * Used by the ManagedByBanner on the consumer dashboard to display
 * "Little Care Bears wants to manage your care" without needing
 * client-side Firestore access to the tenants collection (which is
 * restricted to admins/tenant admins by firestore.rules).
 *
 * Auth: any authenticated user (they're looking up tenants that
 * manage THEM, not accessing tenant admin data).
 *
 * Only returns public-safe fields: id, name, slug.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }
    try {
      await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1])
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const tenantIds: string[] = Array.isArray(body.tenantIds) ? body.tenantIds.slice(0, 10) : []
    if (!tenantIds.length) {
      return NextResponse.json({ tenants: [] })
    }

    const tenants = []
    for (const id of tenantIds) {
      const snap = await adminDb.collection('tenants').doc(id).get()
      if (snap.exists) {
        const d = snap.data() as any
        tenants.push({
          id: snap.id,
          name: d.branding?.companyName || d.name || 'A care provider',
          slug: d.slug || '',
        })
      }
    }

    return NextResponse.json({ tenants })
  } catch {
    return NextResponse.json({ tenants: [] })
  }
}
