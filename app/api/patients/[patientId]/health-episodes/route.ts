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
import { errorResponse } from '@/lib/api-response'
import { notifyCareTeamOfEvent } from '@/lib/notify-care-team'
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

  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/health-episodes',
      operation: 'list'
    })
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
      timingMode,
      initialPhotos,
      providerId,
      providerName,
      diagnosis,
      reportableType,
      sensitivity: explicitSensitivity,
      emergencyDetails,
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

    // Auto-create emergency visit treatment if ER details provided
    if (emergencyDetails) {
      try {
        const treatmentId = uuidv4()
        await adminDb
          .collection('users')
          .doc(ownerUserId)
          .collection('patients')
          .doc(patientId)
          .collection('health-episodes')
          .doc(episodeId)
          .collection('treatments')
          .doc(treatmentId)
          .set({
            episodeId,
            patientId,
            type: 'emergency_visit',
            description: `ER/Urgent Care visit${emergencyDetails.facilityName ? ` at ${emergencyDetails.facilityName}` : ''}`,
            startDate: emergencyDetails.visitDate || startDate,
            notes: [
              emergencyDetails.medicationsGiven && `Medications: ${emergencyDetails.medicationsGiven}`,
              emergencyDetails.dischargeInstructions && `Discharge instructions: ${emergencyDetails.dischargeInstructions}`,
              emergencyDetails.followUpNeeded && `Follow-up: ${emergencyDetails.followUpDate || 'Date TBD'}`,
            ].filter(Boolean).join('\n'),
            loggedBy: userId,
            createdAt: now,
            lastUpdatedAt: now,
          })

        logger.info('[API health-episodes POST] Emergency visit treatment created', {
          episodeId,
          treatmentId,
          facility: emergencyDetails.facilityName
        })
      } catch (treatmentError) {
        logger.error('[API health-episodes POST] Failed to create treatment (non-blocking)', treatmentError as Error)
      }
    }

    // Notify the care team about the new health event. Higher priority for
    // injuries and abuse concerns; sensitive events omit the description.
    const episodePriority = (['injury', 'abuse_concern'] as EpisodeType[]).includes(type)
      ? 'high' as const
      : 'normal' as const
    await notifyCareTeamOfEvent({
      patientId,
      ownerUserId,
      actorUserId: userId,
      type: 'episode_created',
      priority: episodePriority,
      title: sensitivity === 'sensitive' ? 'Sensitive health event' : 'Health event created',
      action: sensitivity === 'sensitive' ? 'logged a sensitive health event' : `logged a health event: ${title}`,
      actionUrl: `/patients/${patientId}`,
      metadata: {
        episodeId,
        episodeType: type,
        title: sensitivity === 'sensitive' ? 'Sensitive Event' : title,
        status: 'onset',
        sensitivity,
        startDate,
        ...(sensitivity === 'sensitive' ? {} : { description }),
      },
    })

    return NextResponse.json({ success: true, episode: { id: episodeId, ...episode } }, { status: 201 })

  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/health-episodes',
      operation: 'create'
    })
  }
}
