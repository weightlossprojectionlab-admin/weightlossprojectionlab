/**
 * Journal API
 * GET  — List entries (paginated, newest first)
 * POST — Create new journal entry
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { errorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '')
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(idToken)
    const userId = decoded.uid

    const { searchParams } = request.nextUrl
    const limitCount = parseInt(searchParams.get('limit') || '30', 10)
    const startAfter = searchParams.get('startAfter') // entry ID for pagination

    let query = adminDb
      .collection('users').doc(userId)
      .collection('journal')
      .orderBy('createdAt', 'desc')
      .limit(limitCount)

    if (startAfter) {
      const startDoc = await adminDb
        .collection('users').doc(userId)
        .collection('journal').doc(startAfter).get()
      if (startDoc.exists) {
        query = query.startAfter(startDoc) as any
      }
    }

    const snap = await query.get()
    const entries = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString(),
    }))

    return NextResponse.json({ entries })
  } catch (error) {
    logger.error('[API] GET /api/journal error', error as Error)
    return errorResponse(error as Error, { route: '/api/journal', operation: 'GET' })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '')
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(idToken)
    const userId = decoded.uid

    const body = await request.json()
    const { mood, stress, energy, sleepQuality, selfCare, journalText, prompt, tags } = body

    // Validate required check-in fields
    if (!mood || !stress || !energy || !sleepQuality) {
      return NextResponse.json({ error: 'Check-in fields (mood, stress, energy, sleepQuality) are required' }, { status: 400 })
    }

    const entry = {
      mood: Math.min(5, Math.max(1, Number(mood))),
      stress: Math.min(5, Math.max(1, Number(stress))),
      energy: Math.min(5, Math.max(1, Number(energy))),
      sleepQuality: Math.min(5, Math.max(1, Number(sleepQuality))),
      selfCare: {
        did: selfCare?.did ?? false,
        activities: selfCare?.activities || [],
      },
      ...(journalText ? { journalText } : {}),
      ...(prompt ? { prompt } : {}),
      ...(tags?.length ? { tags } : {}),
      createdAt: FieldValue.serverTimestamp(),
    }

    const docRef = await adminDb
      .collection('users').doc(userId)
      .collection('journal')
      .add(entry)

    return NextResponse.json({
      id: docRef.id,
      ...entry,
      createdAt: new Date().toISOString(),
    }, { status: 201 })
  } catch (error) {
    logger.error('[API] POST /api/journal error', error as Error)
    return errorResponse(error as Error, { route: '/api/journal', operation: 'POST' })
  }
}
