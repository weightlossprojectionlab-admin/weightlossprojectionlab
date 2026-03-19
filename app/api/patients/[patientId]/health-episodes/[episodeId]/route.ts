/**
 * API Route: /api/patients/[patientId]/health-episodes/[episodeId]
 *
 * GET    - Get single episode with all subcollection data
 * PATCH  - Update episode status, diagnosis, sensitivity, export tracking
 * DELETE - Soft-delete episode (status: 'archived')
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { assertPatientAccess } from '@/lib/rbac-middleware'
import type { HealthEpisode } from '@/types/health-episodes'

async function getEpisodeRef(ownerUserId: string, patientId: string, episodeId: string) {
  return adminDb
    .collection('users')
    .doc(ownerUserId)
    .collection('patients')
    .doc(patientId)
    .collection('health-episodes')
    .doc(episodeId)
}

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

    const episodeRef = await getEpisodeRef(ownerUserId, patientId, episodeId)
    const episodeDoc = await episodeRef.get()

    if (!episodeDoc.exists) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    const episode = { id: episodeDoc.id, ...episodeDoc.data() } as HealthEpisode

    // Sensitive episodes: owner only
    if (episode.sensitivity === 'sensitive' && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all subcollections in parallel
    const [symptomsSnap, treatmentsSnap, milestonesSnap, photosSnap] = await Promise.all([
      episodeRef.collection('symptoms').orderBy('firstObserved', 'asc').get(),
      episodeRef.collection('treatments').orderBy('startDate', 'asc').get(),
      episodeRef.collection('milestones').orderBy('achievedDate', 'asc').get(),
      episodeRef.collection('photos').orderBy('capturedAt', 'asc').get(),
    ])

    return NextResponse.json({
      success: true,
      episode,
      symptoms: symptomsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      treatments: treatmentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      milestones: milestonesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      photos: photosSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    })

  } catch (error: any) {
    logger.error('[API health-episodes/:id GET]', error as Error)
    return NextResponse.json({ error: error.message || 'Failed to fetch episode' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; episodeId: string }> }
) {
  try {
    const { patientId, episodeId } = await params

    const authResult = await assertPatientAccess(request, patientId, 'editMedications')
    if (authResult instanceof Response) return authResult

    const { userId, ownerUserId, role } = authResult
    const isOwner = role === 'owner'

    const episodeRef = await getEpisodeRef(ownerUserId, patientId, episodeId)
    const episodeDoc = await episodeRef.get()
    if (!episodeDoc.exists) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    const current = episodeDoc.data() as HealthEpisode
    if (current.sensitivity === 'sensitive' && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const allowedFields = [
      'status', 'endDate', 'diagnosis', 'providerName', 'providerId',
      'sensitivity', 'reportableType', 'exportedAt', 'exportedBy',
      'title', 'description', 'activeSymptomCount', 'totalMilestones', 'photoCount',
    ]

    const updates: Record<string, any> = { lastUpdatedBy: userId, lastUpdatedAt: new Date().toISOString() }
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field]
    }

    await episodeRef.update(updates)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    logger.error('[API health-episodes/:id PATCH]', error as Error)
    return NextResponse.json({ error: error.message || 'Failed to update episode' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; episodeId: string }> }
) {
  try {
    const { patientId, episodeId } = await params

    const authResult = await assertPatientAccess(request, patientId, 'editMedications')
    if (authResult instanceof Response) return authResult

    const { userId, ownerUserId } = authResult

    const episodeRef = await getEpisodeRef(ownerUserId, patientId, episodeId)
    await episodeRef.update({
      status: 'archived',
      lastUpdatedBy: userId,
      lastUpdatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    logger.error('[API health-episodes/:id DELETE]', error as Error)
    return NextResponse.json({ error: error.message || 'Failed to delete episode' }, { status: 500 })
  }
}
