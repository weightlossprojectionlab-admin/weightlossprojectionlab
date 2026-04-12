/**
 * Shared data-loading for the franchise dashboard.
 *
 * Both the Overview page (/dashboard) and the Families tab
 * (/dashboard/families) need to load managed families and pending
 * requests. Extracted here so neither page duplicates the query logic.
 *
 * The `_lib/` prefix is a Next.js convention for private modules within
 * a route segment — Next.js will NOT treat this as a page route.
 */

import { getAdminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

// ─── Interfaces ──────────────────────────────────────────

export interface FamilyHealthSnapshot {
  lastMealAt: string | null
  lastMealName: string | null
  lastWeightValue: number | null
  lastWeightUnit: string | null
  lastWeightAt: string | null
  lastVitalType: string | null
  lastVitalAt: string | null
  activeMedicationsCount: number
}

export interface ManagedFamily {
  id: string
  name: string
  email: string
  joinedPlatformAt: string | null
  lastActiveAt: string | null
  health: FamilyHealthSnapshot
}

export interface PendingRequest {
  id: string
  familyName: string
  familyEmail: string
  message: string
  submittedAt: string | null
}

// ─── Utilities ───────────────────────────────────────────

/** Normalize a Firestore Timestamp / Date / ISO string to ISO string or null. */
function normalizeDate(raw: any): string | null {
  if (!raw) return null
  if (typeof raw === 'string') return raw
  if (raw.toDate && typeof raw.toDate === 'function') return raw.toDate().toISOString()
  if (raw instanceof Date) return raw.toISOString()
  return null
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

/** True if the ISO date is within the last 30 days. */
export function isActive(iso: string | null): boolean {
  if (!iso) return false
  try {
    return Date.now() - new Date(iso).getTime() < 30 * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

// ─── Loaders ─────────────────────────────────────────────

const EMPTY_HEALTH: FamilyHealthSnapshot = {
  lastMealAt: null,
  lastMealName: null,
  lastWeightValue: null,
  lastWeightUnit: null,
  lastWeightAt: null,
  lastVitalType: null,
  lastVitalAt: null,
  activeMedicationsCount: 0,
}

/**
 * Load the health snapshot for a single family from their patient
 * subcollections. Reads: latest meal-log, latest weight-log, latest vital,
 * active medications count. All reads use Admin SDK (server-side).
 *
 * Soft-fails to EMPTY_HEALTH on any error so one broken family doesn't
 * crash the entire dashboard.
 */
/**
 * Load the health snapshot for a single family. Checks TWO locations:
 *
 * 1. Consumer-level collections (camelCase, directly on the user doc):
 *    users/{userId}/mealLogs, users/{userId}/weightLogs
 *    This is where Single User and most consumer-mode users store data.
 *
 * 2. Patient-level subcollections (hyphenated, under a patient doc):
 *    users/{userId}/patients/{patientId}/meal-logs, weight-logs, vitals, medications
 *    This is where Household/Caregiver-mode users store data.
 *
 * The franchise dashboard needs to show data regardless of which path the
 * family used. We query both in parallel and pick whichever has the more
 * recent data.
 */
async function loadHealthSnapshot(
  db: FirebaseFirestore.Firestore,
  userId: string
): Promise<FamilyHealthSnapshot> {
  try {
    const userRef = db.collection('users').doc(userId)

    // ── Consumer-level queries (camelCase, no patient doc needed) ──
    const consumerMealP = userRef
      .collection('mealLogs')
      .orderBy('loggedAt', 'desc')
      .limit(1)
      .get()
      .catch(() => null)

    const consumerWeightP = userRef
      .collection('weightLogs')
      .orderBy('loggedAt', 'desc')
      .limit(1)
      .get()
      .catch(() => null)

    // ── Patient-level queries (hyphenated, under patients/{patientId}) ──
    // Find the primary human patient doc first.
    const patientsSnap = await userRef
      .collection('patients')
      .where('type', '==', 'human')
      .limit(1)
      .get()
      .catch(() => null)

    const patientRef = patientsSnap?.docs?.[0]?.ref ?? null

    const patientMealP = patientRef
      ? patientRef
          .collection('meal-logs')
          .orderBy('loggedAt', 'desc')
          .limit(1)
          .get()
          .catch(() => null)
      : Promise.resolve(null)

    const patientWeightP = patientRef
      ? patientRef
          .collection('weight-logs')
          .orderBy('loggedAt', 'desc')
          .limit(1)
          .get()
          .catch(() => null)
      : Promise.resolve(null)

    const vitalP = patientRef
      ? patientRef
          .collection('vitals')
          .orderBy('recordedAt', 'desc')
          .limit(1)
          .get()
          .catch(() => null)
      : Promise.resolve(null)

    const medsP = patientRef
      ? patientRef
          .collection('medications')
          .where('status', '==', 'active')
          .get()
          .catch(() => null)
      : Promise.resolve(null)

    // Run all queries in parallel.
    const [cMeal, cWeight, pMeal, pWeight, vitalSnap, medsSnap] = await Promise.all([
      consumerMealP,
      consumerWeightP,
      patientMealP,
      patientWeightP,
      vitalP,
      medsP,
    ])

    // Pick the most recent between consumer and patient paths.
    const cMealData = cMeal?.docs?.[0]?.data() as any
    const pMealData = pMeal?.docs?.[0]?.data() as any
    const meal = pickMostRecent(cMealData, pMealData, 'loggedAt')

    const cWeightData = cWeight?.docs?.[0]?.data() as any
    const pWeightData = pWeight?.docs?.[0]?.data() as any
    const weight = pickMostRecent(cWeightData, pWeightData, 'loggedAt')

    const vital = vitalSnap?.docs?.[0]?.data() as any

    return {
      lastMealAt: normalizeDate(meal?.loggedAt),
      lastMealName: meal?.description || meal?.name || meal?.mealType || null,
      lastWeightValue: typeof weight?.weight === 'number' ? weight.weight : null,
      lastWeightUnit: weight?.unit || 'lbs',
      lastWeightAt: normalizeDate(weight?.loggedAt),
      lastVitalType: vital?.type || null,
      lastVitalAt: normalizeDate(vital?.recordedAt),
      activeMedicationsCount: medsSnap?.size || 0,
    }
  } catch (err) {
    logger.error('[dashboard] failed to load health snapshot', err as Error, { userId })
    return EMPTY_HEALTH
  }
}

/** Given two docs from different collection paths, return the one with the
 *  more recent value for `dateField`. Handles null/undefined gracefully. */
function pickMostRecent(a: any, b: any, dateField: string): any {
  if (!a && !b) return null
  if (!a) return b
  if (!b) return a
  const aDate = normalizeDate(a[dateField])
  const bDate = normalizeDate(b[dateField])
  if (!aDate) return b
  if (!bDate) return a
  return aDate >= bDate ? a : b
}

export async function loadManagedFamilies(tenantId: string): Promise<ManagedFamily[]> {
  try {
    const db = getAdminDb()
    const snap = await db
      .collection('users')
      .where('managedBy', 'array-contains', tenantId)
      .limit(500)
      .get()

    // Load health snapshots in parallel for all families.
    const families = await Promise.all(
      snap.docs.map(async doc => {
        const data = doc.data() as any
        const health = await loadHealthSnapshot(db, doc.id)
        return {
          id: doc.id,
          name: data.name || data.displayName || data.email || 'Unnamed family',
          email: data.email || '',
          joinedPlatformAt: normalizeDate(data.createdAt),
          lastActiveAt: normalizeDate(data.lastActiveAt),
          health,
        }
      })
    )

    return families
  } catch (err) {
    logger.error('[dashboard] failed to load managed families', err as Error, { tenantId })
    return []
  }
}

export async function loadPendingRequests(tenantId: string): Promise<PendingRequest[]> {
  try {
    const db = getAdminDb()
    const snap = await db
      .collection('tenantManagementRequests')
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'pending')
      .limit(100)
      .get()
    const rows = snap.docs.map(doc => {
      const d = doc.data() as any
      return {
        id: doc.id,
        familyName: d.familyName || d.familyEmail || 'Unknown family',
        familyEmail: d.familyEmail || '',
        message: typeof d.message === 'string' ? d.message : '',
        submittedAt: typeof d.submittedAt === 'string' ? d.submittedAt : null,
      }
    })
    rows.sort((a, b) => {
      if (!a.submittedAt) return 1
      if (!b.submittedAt) return -1
      return b.submittedAt.localeCompare(a.submittedAt)
    })
    return rows
  } catch (err) {
    logger.error('[dashboard] failed to load pending requests', err as Error, { tenantId })
    return []
  }
}

// ─── Client Detail (patients under a managed user) ───────

export interface ClientPatient {
  id: string
  name: string
  type: 'human' | 'pet'
  relationship: string
  dateOfBirth: string | null
  gender: string | null
  health: FamilyHealthSnapshot
}

export interface ClientDetail {
  id: string
  name: string
  email: string
  phone: string
  lastActiveAt: string | null
  joinedPlatformAt: string | null
  practiceNotes: string
  patients: ClientPatient[]
  // Consumer-level health (for clients who track themselves without a patient profile)
  ownHealth: FamilyHealthSnapshot
}

/**
 * Load a single managed client's full detail — their user info plus all
 * their patients with per-patient health snapshots. Used by the client
 * detail page at /dashboard/families/[userId].
 *
 * Verifies the user is actually managed by the given tenant before
 * returning data (security: prevent franchise A from viewing franchise B's
 * clients by guessing user IDs).
 */
export async function loadClientDetail(
  tenantId: string,
  userId: string
): Promise<ClientDetail | null> {
  try {
    const db = getAdminDb()
    const userSnap = await db.collection('users').doc(userId).get()
    if (!userSnap.exists) return null

    const userData = userSnap.data() as any
    const managedBy: string[] = Array.isArray(userData?.managedBy) ? userData.managedBy : []
    if (!managedBy.includes(tenantId)) return null

    // Load patients under this user
    const patientsSnap = await db
      .collection('users')
      .doc(userId)
      .collection('patients')
      .where('status', '==', 'active')
      .limit(50)
      .get()
      .catch(() => null)

    const patients: ClientPatient[] = await Promise.all(
      (patientsSnap?.docs || []).map(async doc => {
        const d = doc.data() as any
        const ref = doc.ref

        const [mealSnap, weightSnap, vitalSnap, medsSnap] = await Promise.all([
          ref.collection('meal-logs').orderBy('loggedAt', 'desc').limit(1).get().catch(() => null),
          ref.collection('weight-logs').orderBy('loggedAt', 'desc').limit(1).get().catch(() => null),
          ref.collection('vitals').orderBy('recordedAt', 'desc').limit(1).get().catch(() => null),
          ref.collection('medications').where('status', '==', 'active').get().catch(() => null),
        ])

        const meal = mealSnap?.docs?.[0]?.data() as any
        const weight = weightSnap?.docs?.[0]?.data() as any
        const vital = vitalSnap?.docs?.[0]?.data() as any

        return {
          id: doc.id,
          name: d.name || 'Unnamed',
          type: (d.type || 'human') as 'human' | 'pet',
          relationship: d.relationship || '',
          dateOfBirth: normalizeDate(d.dateOfBirth),
          gender: d.gender || null,
          health: {
            lastMealAt: normalizeDate(meal?.loggedAt),
            lastMealName: meal?.description || meal?.name || meal?.mealType || null,
            lastWeightValue: typeof weight?.weight === 'number' ? weight.weight : null,
            lastWeightUnit: weight?.unit || 'lbs',
            lastWeightAt: normalizeDate(weight?.loggedAt),
            lastVitalType: vital?.type || null,
            lastVitalAt: normalizeDate(vital?.recordedAt),
            activeMedicationsCount: medsSnap?.size || 0,
          },
        }
      })
    )

    // Also load the user's own consumer-level health data
    const ownHealth = await loadHealthSnapshot(db, userId)

    // Find practice notes from the patient profile created during intake
    let practiceNotes = ''
    for (const p of patients) {
      const pDoc = patientsSnap?.docs.find(d => d.id === p.id)
      if (pDoc) {
        const pData = pDoc.data() as any
        if (pData.practiceNotes) { practiceNotes = pData.practiceNotes; break }
      }
    }

    return {
      id: userId,
      name: userData.name || userData.displayName || userData.email || 'Unknown',
      email: userData.email || '',
      phone: userData.phone || '',
      lastActiveAt: normalizeDate(userData.lastActiveAt),
      joinedPlatformAt: normalizeDate(userData.createdAt),
      practiceNotes,
      patients,
      ownHealth,
    }
  } catch (err) {
    logger.error('[dashboard] failed to load client detail', err as Error, { tenantId, userId })
    return null
  }
}
