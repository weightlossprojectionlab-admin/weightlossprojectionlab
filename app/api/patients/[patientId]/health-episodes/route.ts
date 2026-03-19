/**
 * API Route: /api/patients/[patientId]/health-episodes
 *
 * GET  - List all health episodes for a patient
 * POST - Create a new health episode
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { assertPatientAccess } from '@/lib/rbac-middleware'
import type { HealthEpisode, EpisodeType, EpisodeSensitivity } from '@/types/health-episodes'
import { v4 as uuidv4 } from 'uuid'

const SENSITIVE_TYPES: EpisodeType[] = ['abuse_concern', 'end_of_life']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    const authResult = await assertPatientAccess(request, patientId, 'viewMedicalRecords')
    if (authResult instanceof Response) return authResult

    const { ownerUserId, role } = authResult
    const isOwner = role === 'owner'

    const { searchParams } = new URL(request.url)
    const sensitivityFilter = searchParams.get('sensitivity') // 'sensitive' | 'standard' | null (all)

    let query = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('health-episodes')
      .orderBy('startDate', 'desc')

    const snapshot = await query.get()

    const episodes = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as HealthEpisode))
      // Non-owners cannot see sensitive episodes
      .filter(ep => isOwner || ep.sensitivity !== 'sensitive')
      // Optional sensitivity filter
      .filter(ep => !sensitivityFilter || ep.sensitivity === sensitivityFilter)

    return NextResponse.json({ success: true, episodes })

  } catch (error: any) {
    logger.error('[API health-episodes GET]', error as Error)
    return NextResponse.json({ error: error.message || 'Failed to fetch episodes' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    const authResult = await assertPatientAccess(request, patientId, 'editMedications')
    if (authResult instanceof Response) return authResult

    const { userId, ownerUserId } = authResult

    const body = await request.json()
    const {
      type,
      title,
      description,
      startDate,
      startTime,
      approximateStartTime,
      initialPhotos,
      providerId,
      providerName,
      diagnosis,
      reportableType,
      sensitivity: explicitSensitivity,
    } = body

    if (!type || !title || !startDate) {
      return NextResponse.json({ error: 'type, title, and startDate are required' }, { status: 400 })
    }

    // Auto-mark sensitive types
    const sensitivity: EpisodeSensitivity =
      explicitSensitivity ?? (SENSITIVE_TYPES.includes(type) ? 'sensitive' : 'standard')

    const now = new Date().toISOString()
    const episodeId = uuidv4()

    const episode: Omit<HealthEpisode, 'id'> = {
      patientId,
      patientType: body.patientType || 'human',
      type,
      title: title.trim(),
      description: description?.trim(),
      status: 'onset',
      sensitivity,
      startDate,
      startTime,
      approximateStartTime,
      initialPhotos: initialPhotos || [],
      providerId,
      providerName,
      diagnosis,
      reportableType,
      createdBy: userId,
      createdAt: now,
      lastUpdatedBy: userId,
      lastUpdatedAt: now,
      activeSymptomCount: 0,
      totalMilestones: 0,
      photoCount: initialPhotos?.length || 0,
    }

    await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('health-episodes')
      .doc(episodeId)
      .set(episode)

    return NextResponse.json({ success: true, episode: { id: episodeId, ...episode } }, { status: 201 })

  } catch (error: any) {
    logger.error('[API health-episodes POST]', error as Error)
    return NextResponse.json({ error: error.message || 'Failed to create episode' }, { status: 500 })
  }
}
