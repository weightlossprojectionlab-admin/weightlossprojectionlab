/**
 * POST /api/users/names
 *
 * Batch uid → display name resolver for client-side rendering. Used by
 * the shopping page (and future audit views) to show "Added by [name]"
 * / "Purchased by [name]" without each component making N Firestore
 * reads against `users/{uid}`.
 *
 * Auth: any signed-in user. Display names are not sensitive (they're
 * already shown in family/member contexts). The endpoint never returns
 * email or other PII.
 *
 * Body:  { uids: string[] }            (max 100 per call)
 * Reply: { names: { [uid]: string } }  (uids that don't resolve get
 *        a friendly fallback like "Member")
 *
 * Resolution order per uid:
 *   1. Firebase Auth displayName (primary source — set on signup)
 *   2. Firestore users/{uid}.displayName
 *   3. Firestore users/{uid}.firstName + lastName
 *   4. Firestore users/{uid}.email local-part
 *   5. Fallback string
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import { logger } from '@/lib/logger'
import { errorResponse, unauthorizedResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const MAX_UIDS = 100
const FALLBACK_NAME = 'Member'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult) return unauthorizedResponse()

    const body = await request.json().catch(() => ({} as any))
    const rawUids = Array.isArray(body?.uids) ? body.uids : []
    const uids: string[] = Array.from(
      new Set(
        rawUids.filter(
          (u: unknown): u is string => typeof u === 'string' && u.length > 0
        )
      )
    )
    if (uids.length === 0) {
      return NextResponse.json({ names: {} })
    }
    if (uids.length > MAX_UIDS) {
      return NextResponse.json(
        { error: `Too many uids (max ${MAX_UIDS})` },
        { status: 400 }
      )
    }

    const auth = getAdminAuth()
    const db = getAdminDb()
    const names: Record<string, string> = {}

    // Auth lookup is the fastest path and works for users who haven't
    // had a Firestore profile doc written yet. We tolerate missing
    // users (deleted accounts) by falling through to the fallback.
    const authResults = await Promise.allSettled(
      uids.map(uid => auth.getUser(uid))
    )

    const needFirestore: string[] = []
    authResults.forEach((r, idx) => {
      const uid = uids[idx]
      if (r.status === 'fulfilled') {
        const dn = r.value.displayName
        if (dn && dn.trim()) {
          names[uid] = dn.trim()
          return
        }
      }
      needFirestore.push(uid)
    })

    if (needFirestore.length > 0) {
      const fsResults = await Promise.allSettled(
        needFirestore.map(uid => db.collection('users').doc(uid).get())
      )
      fsResults.forEach((r, idx) => {
        const uid = needFirestore[idx]
        if (r.status === 'fulfilled' && r.value.exists) {
          const data = r.value.data() ?? {}
          if (typeof data.displayName === 'string' && data.displayName.trim()) {
            names[uid] = data.displayName.trim()
            return
          }
          const first = typeof data.firstName === 'string' ? data.firstName.trim() : ''
          const last = typeof data.lastName === 'string' ? data.lastName.trim() : ''
          if (first || last) {
            names[uid] = [first, last].filter(Boolean).join(' ')
            return
          }
          if (typeof data.email === 'string' && data.email.includes('@')) {
            names[uid] = data.email.split('@')[0]
            return
          }
        }
        names[uid] = FALLBACK_NAME
      })
    }

    return NextResponse.json({ names })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/users/names',
      operation: 'post',
    })
  }
}
