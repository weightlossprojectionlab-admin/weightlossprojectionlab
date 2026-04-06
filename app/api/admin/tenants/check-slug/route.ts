/**
 * GET /api/admin/tenants/check-slug?slug=gentletouch
 * Check if a subdomain slug is available (public — no auth needed)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ available: false, error: 'slug is required' }, { status: 400 })
  }

  const existing = await adminDb.collection('tenants').where('slug', '==', slug).limit(1).get()
  return NextResponse.json({ available: existing.empty, slug })
}
