/**
 * Single Journal Entry API
 * GET    — Fetch one entry
 * PUT    — Update entry
 * DELETE — Delete entry
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { errorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const idToken = authHeader?.replace('Bearer ', '')
  if (!idToken) return null
  const decoded = await adminAuth.verifyIdToken(idToken)
  return decoded.uid
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUser(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const doc = await adminDb
      .collection('users').doc(userId)
      .collection('journal').doc(id).get()

    if (!doc.exists) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate?.()?.toISOString(),
      updatedAt: doc.data()?.updatedAt?.toDate?.()?.toISOString(),
    })
  } catch (error) {
    logger.error('[API] GET /api/journal/[id] error', error as Error)
    return errorResponse(error as Error, { route: '/api/journal/[id]', operation: 'GET' })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUser(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    const ref = adminDb.collection('users').doc(userId).collection('journal').doc(id)
    const doc = await ref.get()
    if (!doc.exists) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
    if (body.mood !== undefined) updates.mood = Math.min(5, Math.max(1, Number(body.mood)))
    if (body.stress !== undefined) updates.stress = Math.min(5, Math.max(1, Number(body.stress)))
    if (body.energy !== undefined) updates.energy = Math.min(5, Math.max(1, Number(body.energy)))
    if (body.sleepQuality !== undefined) updates.sleepQuality = Math.min(5, Math.max(1, Number(body.sleepQuality)))
    if (body.selfCare !== undefined) updates.selfCare = body.selfCare
    if (body.journalText !== undefined) updates.journalText = body.journalText
    if (body.prompt !== undefined) updates.prompt = body.prompt
    if (body.tags !== undefined) updates.tags = body.tags

    await ref.update(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[API] PUT /api/journal/[id] error', error as Error)
    return errorResponse(error as Error, { route: '/api/journal/[id]', operation: 'PUT' })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUser(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const ref = adminDb.collection('users').doc(userId).collection('journal').doc(id)
    const doc = await ref.get()
    if (!doc.exists) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    await ref.delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[API] DELETE /api/journal/[id] error', error as Error)
    return errorResponse(error as Error, { route: '/api/journal/[id]', operation: 'DELETE' })
  }
}
