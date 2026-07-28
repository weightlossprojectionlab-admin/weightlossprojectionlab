import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { notifyCareTeam } from '@/lib/notify-care-team'
import { detectVitalTrendGrouped, type TrendPoint, type GroupedTrendFinding } from '@/lib/health-trend-detection'
import { HUMAN_VITAL_BANDS, BP_BANDS, getHumanVitalBand, vitalLabel } from '@/lib/vital-thresholds'
import { timeOfDayBucket } from '@/lib/time-of-day'
import type { PatientProfile, VitalType } from '@/types/medical'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Health Trend Alerts Cron
 *
 * Proactive, INFORMATIONAL early-warning: for each patient with recent vitals,
 * fit a trend line per vital and, when a reading is drifting toward a concerning
 * threshold with enough data + fit, fan a heads-up out to the caregivers.
 *
 * Deliberately conservative — this is NOT a diagnosis. It surfaces a direction
 * to watch and suggests checking in with a provider. Low-confidence trends are
 * suppressed; per-day dedupe stops repeats.
 *
 * GET /api/cron/health-trend-alerts   (Bearer ${CRON_SECRET})
 *
 * Scope v1: humans only (pet ranges differ widely by species). Iterates users
 * with a registered push token — same scoping as the vital-reminders cron.
 */

const SCALAR_TYPES: VitalType[] = ['blood_sugar', 'pulse_oximeter', 'temperature']
const RECENT_LIMIT = 30 // most-recent readings per vital type to fit against

// Vitals whose meaning depends on WHEN in the day they were taken (fasting vs
// post-meal glucose, morning vs evening BP). For these we segment the series by
// time-of-day before fitting, so clinically distinct readings aren't pooled
// into one misleading trend. Others (SpO2, temperature) stay pooled to preserve
// sample size. NOTE: bucketing uses UTC hour (no per-patient timezone here yet),
// which still separates a given patient's morning/evening clusters; timezone-
// accurate bucket LABELS are a deferred refinement, so copy stays generic.
const TIME_SENSITIVE = new Set<string>(['blood_sugar', 'blood_pressure'])

/** Time-of-day group for a reading, only for time-sensitive vital types. */
function groupFor(vitalType: string, at: Date): string | undefined {
  return TIME_SENSITIVE.has(vitalType) ? timeOfDayBucket(at) : undefined
}

function toDate(recordedAt: any): Date | null {
  if (!recordedAt) return null
  if (typeof recordedAt === 'string') {
    const d = new Date(recordedAt)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof recordedAt?.toDate === 'function') return recordedAt.toDate()
  if (typeof recordedAt?.seconds === 'number') return new Date(recordedAt.seconds * 1000)
  if (typeof recordedAt?._seconds === 'number') return new Date(recordedAt._seconds * 1000)
  return null
}

function scalarValue(v: any): number | null {
  const n = Number(typeof v?.value === 'object' ? NaN : v?.value)
  return Number.isFinite(n) ? n : null
}

function bpValue(v: any, comp: 'systolic' | 'diastolic'): number | null {
  const n = Number(v?.value?.[comp] ?? v?.[comp])
  return Number.isFinite(n) ? n : null
}

/** Fetch the most-recent readings of one vital type for a patient. */
async function fetchRecent(ownerUserId: string, patientId: string, vitalType: VitalType) {
  const snap = await adminDb
    .collection('users').doc(ownerUserId)
    .collection('patients').doc(patientId)
    .collection('vitals')
    .where('type', '==', vitalType)
    .orderBy('recordedAt', 'desc')
    .limit(RECENT_LIMIT)
    .get()
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

/** Build a caregiver-facing, non-diagnostic message for a finding. */
function buildAlert(patientName: string, label: string, unit: string, f: GroupedTrendFinding) {
  const dir = f.direction === 'rising' ? 'rising' : 'falling'
  const window = f.spanDays >= 1 ? `the last ${f.spanDays} days` : 'recent readings'
  const near =
    f.daysToThreshold <= 0
      ? 'and is at a level worth a closer look'
      : `and, if it keeps up, could reach a level worth watching in about ${f.daysToThreshold} day${f.daysToThreshold === 1 ? '' : 's'}`
  // When the finding came from a time-of-day-segmented series, say so — it tells
  // the caregiver the trend is real (like-with-like readings), not an artifact of
  // mixing fasting and post-meal values. Bucket name is omitted deliberately
  // until timezone-accurate labels land.
  const timeNote = f.group
    ? ' This pattern holds within readings taken around the same time of day, so it is not just fasting-vs-after-meal variation.'
    : ''
  return {
    title: `Heads up: ${patientName}'s ${label} is trending ${dir}`,
    message:
      `Over ${window}, ${patientName}'s ${label} has been ${dir} (now ~${f.currentValue}${unit ? ' ' + unit : ''}) ${near}.` +
      `${timeNote} ` +
      `This is an informational heads-up based on the trend — not a diagnosis. Consider checking in with their healthcare provider.`,
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stats = {
    usersChecked: 0,
    patientsChecked: 0,
    alertsFired: 0,
    skippedRecentlyFired: 0,
    skippedLowConfidence: 0,
    errors: 0,
  }

  try {
    const tokensSnap = await adminDb.collection('notification_tokens').where('token', '!=', null).get()
    if (tokensSnap.empty) {
      return NextResponse.json({ success: true, message: 'No users with push tokens', ...stats })
    }

    const todayKey = new Date().toISOString().slice(0, 10)

    for (const tokenDoc of tokensSnap.docs) {
      const { userId } = tokenDoc.data()
      if (!userId) continue
      stats.usersChecked++

      try {
        const patientsSnap = await adminDb.collection('users').doc(userId).collection('patients').get()

        for (const patientDoc of patientsSnap.docs) {
          const patient = patientDoc.data() as PatientProfile & { type?: string; species?: string }
          const patientId = patientDoc.id
          // Humans only in v1.
          if (patient?.type === 'pet' || patient?.species) continue
          const patientName = (patient as any)?.name || (patient as any)?.firstName || 'your family member'
          stats.patientsChecked++

          // Assemble (vitalType, finding) candidates.
          const findings: Array<{ vitalType: string; label: string; unit: string; finding: GroupedTrendFinding }> = []

          // Scalar vitals. Time-sensitive types (glucose) are segmented by
          // time-of-day inside detectVitalTrendGrouped; others fall into one
          // group (group === undefined) and behave as a pooled fit.
          for (const vt of SCALAR_TYPES) {
            const band = getHumanVitalBand(vt)
            if (!band) continue
            const docs = await fetchRecent(userId, patientId, vt)
            const points: Array<TrendPoint & { group?: string }> = docs.flatMap(v => {
              const value = scalarValue(v)
              const at = toDate(v.recordedAt)
              return value != null && at ? [{ value, at, group: groupFor(vt, at) }] : []
            })
            const finding = detectVitalTrendGrouped(points, band)
            if (finding) findings.push({ vitalType: vt, label: vitalLabel(vt), unit: band.unit || '', finding })
          }

          // Blood pressure — systolic + diastolic series separately, each
          // segmented by time-of-day (morning vs evening BP differ).
          {
            const docs = await fetchRecent(userId, patientId, 'blood_pressure' as VitalType)
            for (const comp of ['systolic', 'diastolic'] as const) {
              const points: Array<TrendPoint & { group?: string }> = docs.flatMap(v => {
                const value = bpValue(v, comp)
                const at = toDate(v.recordedAt)
                return value != null && at ? [{ value, at, group: groupFor('blood_pressure', at) }] : []
              })
              const finding = detectVitalTrendGrouped(points, BP_BANDS[comp])
              if (finding) {
                findings.push({ vitalType: 'blood_pressure', label: `blood pressure (${comp})`, unit: 'mmHg', finding })
              }
            }
          }

          for (const { vitalType, label, unit, finding } of findings) {
            // Suppress low-confidence noise.
            if (finding.confidence === 'low') {
              stats.skippedLowConfidence++
              continue
            }

            // Per-day dedupe per (user, patient, vitalType).
            const dedupeId = `trend-${userId}-${patientId}-${vitalType}-${todayKey}`
            const dedupeRef = adminDb.collection('scheduled_nudges').doc(dedupeId)
            if ((await dedupeRef.get()).exists) {
              stats.skippedRecentlyFired++
              continue
            }

            const { title, message } = buildAlert(patientName, label, unit, finding)
            try {
              // System alert — fan out to the whole care team (no actor to exclude).
              await notifyCareTeam({
                patientId,
                ownerUserId: userId,
                type: 'health_trend_alert',
                priority: finding.severity === 'concern' ? 'high' : 'normal',
                title,
                message,
                actionUrl: `/patients/${patientId}`,
                metadata: {
                  vitalId: '',
                  vitalType: (vitalType as VitalType),
                  value: `${finding.currentValue}${unit ? ' ' + unit : ''} (${finding.direction})`,
                  unit,
                  patientName,
                  isAbnormal: true,
                  abnormalReason: `Trend ${finding.direction} toward ${finding.thresholdKind} (${finding.confidence} confidence)`,
                  actionBy: 'WPL',
                  actionByUserId: 'system',
                },
              })
              stats.alertsFired++
              await dedupeRef.set({
                id: dedupeId,
                userId,
                patientId,
                vitalType,
                category: 'health_trend_alert',
                sent: true,
                sentAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                data: { date: todayKey, severity: finding.severity, confidence: finding.confidence },
              }).catch(writeError => logger.warn('[TrendCron] dedupe write failed', { dedupeId, writeError }))
            } catch (dispatchError) {
              logger.error('[TrendCron] dispatch failed', dispatchError as Error, { userId, patientId, vitalType })
              stats.errors++
            }
          }
        }
      } catch (userError) {
        logger.error('[TrendCron] Error processing user', userError as Error, { userId })
        stats.errors++
      }
    }

    logger.info('[TrendCron] Job completed', stats)
    return NextResponse.json({ success: true, ...stats })
  } catch (error) {
    logger.error('[TrendCron] Fatal error', error as Error)
    return NextResponse.json(
      { success: false, error: 'Job failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
