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
import type { VitalSign } from '@/types/medical'
import type { WeightDataPoint } from '@/lib/chart-data-aggregator'

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

// ─── Tenant appointments (split by careContext) ─────────────────────

/** A caregiver-visit the practice delivers — lands on the practitioner's
 *  OWN schedule. The forward-looking spine of their day. */
export interface ScheduledVisit {
  id: string
  clientId: string        // owning family/user — for the drill-in link
  clientName: string
  patientId: string | null
  patientName: string
  // Assignment: which staff member covers this visit. null = unassigned
  // (a coverage gap the owner must fill). staffId matches the staff
  // member's Firebase uid so a staff viewer can filter to their own.
  staffId: string | null
  staffName: string | null
  reason: string
  appointmentType: string // clinical type (orthogonal to careContext)
  dateTime: string
  location: string | null
  status: string
}

/** A member-medical appointment — a family member's OWN external visit.
 *  The practice watches it to coordinate (transport, follow-up), but does
 *  not attend. Not the practitioner's personal calendar. */
export interface CoordinationAppointment {
  id: string
  clientId: string
  clientName: string
  patientId: string | null
  patientName: string
  providerName: string
  specialty: string | null
  appointmentType: string
  dateTime: string
  requiresDriver: boolean
  driverStatus: string | null
  status: string
}

export interface TenantAppointments {
  myVisits: ScheduledVisit[]
  familyAppointments: CoordinationAppointment[]
}

/**
 * Load all upcoming appointments across a tenant's managed families and
 * split them by careContext — the one fact that decides whose calendar an
 * appointment belongs to (see the CareContext doc in types/medical.ts):
 *
 *   - caregiver-visit  → myVisits          (the practitioner attends)
 *   - member-medical   → familyAppointments (external visit, coordinate only)
 *
 * One sweep, one query per family, split in a single pass — so the
 * "Today's Schedule" and "Family Appointments" views share the same read.
 *
 * Uses the sweep pattern (iterate managed families) rather than a
 * collectionGroup query so it needs NO composite index — the per-family
 * range+orderBy on `dateTime` auto-indexes. If this gets slow at scale,
 * denormalize `tenantId` onto caregiver-visits and switch myVisits to a
 * single collectionGroup query (the field is already on the schema).
 *
 * Soft-fails to empty so one broken family can't crash the dashboard.
 */
export async function loadTenantAppointments(tenantId: string): Promise<TenantAppointments> {
  const myVisits: ScheduledVisit[] = []
  const familyAppointments: CoordinationAppointment[] = []
  try {
    const db = getAdminDb()
    const usersSnap = await db
      .collection('users')
      .where('managedBy', 'array-contains', tenantId)
      .limit(500)
      .get()

    // From the start of today onward (so this morning's visits still show).
    const midnight = new Date()
    midnight.setHours(0, 0, 0, 0)
    const startOfToday = midnight.toISOString()

    await Promise.all(
      usersSnap.docs.map(async userDoc => {
        const u = userDoc.data() as any
        const clientName = u.name || u.displayName || u.email || 'Unknown'
        const apptSnap = await userDoc.ref
          .collection('appointments')
          .where('dateTime', '>=', startOfToday)
          .orderBy('dateTime', 'asc')
          .limit(50)
          .get()
          .catch(() => null)

        for (const doc of apptSnap?.docs || []) {
          const a = doc.data() as any
          if (a.status === 'cancelled') continue
          const ctx = (a.careContext || 'member-medical') as string
          const dateTime = normalizeDate(a.dateTime)
          if (dateTime === null) continue

          if (ctx === 'caregiver-visit') {
            myVisits.push({
              id: doc.id,
              clientId: userDoc.id,
              clientName,
              patientId: a.patientId || null,
              patientName: a.patientName || clientName,
              staffId: a.practiceStaffId || null,
              staffName: a.practiceStaffName || a.providerName || null,
              reason: a.reason || '',
              appointmentType: a.type || 'other',
              dateTime,
              location: a.location || null,
              status: a.status || 'scheduled',
            })
          } else {
            familyAppointments.push({
              id: doc.id,
              clientId: userDoc.id,
              clientName,
              patientId: a.patientId || null,
              patientName: a.patientName || clientName,
              providerName: a.providerName || 'Provider',
              specialty: a.specialty || null,
              appointmentType: a.type || 'other',
              dateTime,
              requiresDriver: a.requiresDriver === true,
              driverStatus: a.driverStatus || null,
              status: a.status || 'scheduled',
            })
          }
        }
      })
    )

    myVisits.sort((a, b) => a.dateTime.localeCompare(b.dateTime))
    familyAppointments.sort((a, b) => a.dateTime.localeCompare(b.dateTime))
    return { myVisits, familyAppointments }
  } catch (err) {
    logger.error('[dashboard] failed to load tenant appointments', err as Error, { tenantId })
    return { myVisits, familyAppointments }
  }
}

// ─── Patient Detail (deep per-person view with trend series) ─────────

export interface PatientMedication {
  id: string
  name: string
  dosage: string
  frequency: string
}

export interface PatientDetail {
  id: string
  name: string
  type: 'human' | 'pet'
  relationship: string
  dateOfBirth: string | null
  gender: string | null
  // Trend series for charts. Ordered oldest → newest.
  weightSeries: WeightDataPoint[]
  vitals: VitalSign[]
  medications: PatientMedication[]
  // Owning client (for the breadcrumb / header link back).
  clientName: string
}

/** Series read cap — enough history for a meaningful trend without
 *  pulling an unbounded log. ~6 months of daily readings. */
const SERIES_LIMIT = 180

/**
 * Load a single patient's deep detail — trend series for the charts
 * (weight, vitals) plus active medications. Used by the per-patient
 * view at /dashboard/families/[userId]/patients/[patientId].
 *
 * Security: verifies the owning user is managed by this tenant AND that
 * the patient lives under that user before returning anything. Prevents
 * franchise A from reading franchise B's patients by guessing IDs.
 *
 * Soft-fails any individual series to empty so one broken subcollection
 * doesn't 404 the whole page.
 */
export async function loadPatientDetail(
  tenantId: string,
  userId: string,
  patientId: string
): Promise<PatientDetail | null> {
  try {
    const db = getAdminDb()

    // Ownership gate: user must be managed by this tenant.
    const userSnap = await db.collection('users').doc(userId).get()
    if (!userSnap.exists) return null
    const userData = userSnap.data() as any
    const managedBy: string[] = Array.isArray(userData?.managedBy) ? userData.managedBy : []
    if (!managedBy.includes(tenantId)) return null

    // Patient must live under that user.
    const patientRef = db
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
    const patientSnap = await patientRef.get()
    if (!patientSnap.exists) return null
    const p = patientSnap.data() as any

    // Trend series + meds, in parallel.
    const [weightSnap, vitalsSnap, medsSnap] = await Promise.all([
      patientRef
        .collection('weight-logs')
        .orderBy('loggedAt', 'desc')
        .limit(SERIES_LIMIT)
        .get()
        .catch(() => null),
      patientRef
        .collection('vitals')
        .orderBy('recordedAt', 'desc')
        .limit(SERIES_LIMIT)
        .get()
        .catch(() => null),
      patientRef
        .collection('medications')
        .where('status', '==', 'active')
        .get()
        .catch(() => null),
    ])

    // Weight series → WeightDataPoint[] (oldest first for the chart).
    const weightSeries: WeightDataPoint[] = (weightSnap?.docs || [])
      .map(doc => {
        const d = doc.data() as any
        const iso = normalizeDate(d.loggedAt)
        if (iso === null || typeof d.weight !== 'number') return null
        return {
          date: iso.slice(0, 10), // YYYY-MM-DD
          weight: d.weight,
          timestamp: new Date(iso),
        }
      })
      .filter((x): x is WeightDataPoint => x !== null)
      .reverse()

    // Vitals → VitalSign[] (VitalTrendChart reverses to chronological
    // itself, so leave newest-first as the query returned them).
    const vitals: VitalSign[] = (vitalsSnap?.docs || []).map(doc => {
      const d = doc.data() as any
      return { id: doc.id, ...d } as VitalSign
    })

    const medications: PatientMedication[] = (medsSnap?.docs || []).map(doc => {
      const d = doc.data() as any
      return {
        id: doc.id,
        name: d.name || d.medicationName || 'Unnamed medication',
        dosage: d.dosage || d.dose || '',
        frequency: d.frequency || d.schedule || '',
      }
    })

    return {
      id: patientId,
      name: p.name || 'Unnamed',
      type: (p.type || 'human') as 'human' | 'pet',
      relationship: p.relationship || '',
      dateOfBirth: normalizeDate(p.dateOfBirth),
      gender: p.gender || null,
      weightSeries,
      vitals,
      medications,
      clientName: userData.name || userData.displayName || userData.email || 'Unknown',
    }
  } catch (err) {
    logger.error('[dashboard] failed to load patient detail', err as Error, { tenantId, userId, patientId })
    return null
  }
}
