/**
 * API Route: /api/patients/[patientId]/health-episodes/[episodeId]/photos
 *
 * GET  - List photos for an episode
 * POST - Add a photo record (upload happens client-side via Firebase Storage)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { assertPatientAccess } from '@/lib/rbac-middleware'
import type { ProgressPhoto } from '@/types/health-episodes'
import { v4 as uuidv4 } from 'uuid'
import { differenceInDays, parseISO } from 'date-fns'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; episodeId: string }> }
) {
  try {
    const { patientId, episodeId } = await params

    const authResult = await assertPatientAccess(request, patientId, 'viewMedicalRecords')
    if (authResult instanceof Response) return authResult

    const { ownerUserId, role } = authResult
    const isOwner = role === 'owner'

    const episodeRef = adminDb
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .collection('health-episodes').doc(episodeId)

    const episodeDoc = await episodeRef.get()
    if (!episodeDoc.exists) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    const episode = episodeDoc.data()
    if (episode?.sensitivity === 'sensitive' && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const photosSnap = await episodeRef.collection('photos').orderBy('capturedAt', 'asc').get()
    const photos = photosSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    return NextResponse.json({ success: true, photos })

  } catch (error: any) {
    logger.error('[API health-episodes photos GET]', error as Error)
    return NextResponse.json({ error: error.message || 'Failed to fetch photos' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; episodeId: string }> }
) {
  try {
    const { patientId, episodeId } = await params

    const authResult = await assertPatientAccess(request, patientId, 'editMedications')
    if (authResult instanceof Response) return authResult

    const { userId, ownerUserId } = authResult

    const episodeRef = adminDb
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .collection('health-episodes').doc(episodeId)

    const episodeDoc = await episodeRef.get()
    if (!episodeDoc.exists) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    const episode = episodeDoc.data()
    const body = await request.json()
    const { photoUrl, thumbnailUrl, capturedAt, caption, tags, relatedSymptomId, fileSize, mimeType } = body

    if (!photoUrl || !capturedAt) {
      return NextResponse.json({ error: 'photoUrl and capturedAt are required' }, { status: 400 })
    }

    // Calculate day number from episode start date
    const dayNumber = episode?.startDate
      ? differenceInDays(parseISO(capturedAt), parseISO(episode.startDate)) + 1
      : 1

    const now = new Date().toISOString()
    const photoId = uuidv4()

    const photo: Omit<ProgressPhoto, 'id'> = {
      episodeId,
      patientId,
      photoUrl,
      thumbnailUrl,
      capturedAt,
      dayNumber: Math.max(1, dayNumber),
      caption: caption?.trim(),
      tags: tags || [],
      relatedSymptomId,
      uploadedBy: userId,
      uploadedAt: now,
      fileSize,
      mimeType,
    }

    await episodeRef.collection('photos').doc(photoId).set(photo)

    // Update photo count on episode
    const currentCount = episode?.photoCount || 0
    await episodeRef.update({ photoCount: currentCount + 1, lastUpdatedAt: now, lastUpdatedBy: userId })

    return NextResponse.json({ success: true, photo: { id: photoId, ...photo } }, { status: 201 })

  } catch (error: any) {
    logger.error('[API health-episodes photos POST]', error as Error)
    return NextResponse.json({ error: error.message || 'Failed to add photo' }, { status: 500 })
  }
}
