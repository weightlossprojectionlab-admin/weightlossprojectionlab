/**
 * Family-simulation seed helpers.
 *
 * Primitives for building a semantically-coherent synthetic household
 * via the Admin SDK. Every write mirrors the shape its canonical API
 * writer produces, so the data reads back on every surface (each of
 * which queries a different path/field). Where a reader uses
 * `orderBy(field)`, that field is MANDATORY — Firestore silently
 * excludes docs missing it (the bug class that hid seeded meds /
 * appointments earlier in this work).
 *
 * Paths (verified against the API routes):
 *   households                                  root collection, primaryCaregiverId
 *   users/{owner}/patients/{pid}                profile (healthConditions, foodAllergies,
 *                                               preparationNeeds, householdId, goals, …)
 *   users/{owner}/patients/{pid}/vitals         recordedAt
 *   users/{owner}/patients/{pid}/medications    orderBy addedAt
 *   users/{owner}/patients/{pid}/equipment      orderBy addedAt
 *   users/{owner}/patients/{pid}/family-history orderBy addedAt
 *   users/{owner}/patients/{pid}/immunizations  orderBy administeredAt
 *   users/{owner}/patients/{pid}/meal-logs      orderBy loggedAt   (patient-detail meals)
 *   users/{owner}/mealLogs                      orderBy loggedAt   (/progress calorie chart)
 *   users/{owner}/weightLogs                    patientId field    (/progress + weight chart)
 *   users/{owner}/appointments                  USER-level, dateTime, patientId filter
 *   users/{caregiver}                           data-only caregiver user doc + caregiverOf[]
 *   users/{owner}/familyMembers/{cgId}          owner's roster entry
 *   users/{owner}/patients/{pid}/familyMembers  per-patient access entry
 */

import type { Firestore } from 'firebase-admin/firestore'
import { Timestamp } from 'firebase-admin/firestore'

export type Gender = 'male' | 'female'

/** Canonical caregiver permission object (lib/family-permissions shape). */
export interface SimPermissions {
  viewPatientProfile: boolean
  viewMedicalRecords: boolean
  editMedications: boolean
  scheduleAppointments: boolean
  editAppointments: boolean
  deleteAppointments: boolean
  uploadDocuments: boolean
  deleteDocuments: boolean
  logVitals: boolean
  viewVitals: boolean
  chatAccess: boolean
  inviteOthers: boolean
  viewSensitiveInfo: boolean
  editPatientProfile: boolean
  deletePatient: boolean
  importPatients: boolean
}

export const VIEW_AND_LOG: SimPermissions = {
  viewPatientProfile: true,
  viewMedicalRecords: true,
  editMedications: false,
  scheduleAppointments: true,
  editAppointments: true,
  deleteAppointments: false,
  uploadDocuments: true,
  deleteDocuments: false,
  logVitals: true,
  viewVitals: true,
  chatAccess: true,
  inviteOthers: false,
  viewSensitiveInfo: false,
  editPatientProfile: false,
  deletePatient: false,
  importPatients: false,
}

/** Small seeded LCG so runs are deterministic-but-varied per member. */
export function mkRng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export interface MemberProfile {
  /** Stable key for logs/titles (must be static — no timestamps). */
  key: string
  name: string
  dob: string
  gender: Gender
  heightInches: number
  /** Where the 35-day weight series ends. */
  currentWeightLbs: number
  /** Where the 35-day weight series starts. */
  startWeight: number
  /** Goal weight; omitted = no target (no ETA chip on /progress). */
  targetWeight?: number
  relationship: string
  /** Values from HEALTH_CONDITION_OPTIONS (Diabetes, Hypertension, …). */
  healthConditions?: string[]
  /** Values from FOOD_ALLERGEN_OPTIONS (Milk, Eggs, Shellfish, …). */
  foodAllergies?: string[]
  preferredFoods?: string[]
  aversions?: string[]
  dietaryRestrictions?: string[]
  preparationNeeds?: {
    texture?: 'pureed' | 'soft' | 'whole'
    cutSize?: 'minced' | 'small-cubes' | 'standard' | 'whole'
    temperature?: 'cold' | 'room' | 'warm' | 'hot'
    separated?: boolean
    notes?: string
  }
  practiceNotes?: string
  medications?: Array<{ name: string; strength: string; dosageForm: string; frequency: string; prescribedFor: string }>
  equipment?: Array<{ name: string; type: string; prescribedBy?: string; notes?: string }>
  familyHistory?: Array<{ relativeRelationship: string; condition: string; ageOfOnset?: number; isLiving?: boolean }>
  immunizations?: Array<{ vaccineName: string; doseNumber?: number; daysAgo: number; nextDueInDays?: number }>
  /** Captured doc id once created. */
  patientId?: string
}

/** Create the patient profile doc with full medical complexity. */
export async function seedMemberProfile(
  firestore: Firestore,
  owner: string,
  member: MemberProfile,
  householdId: string,
): Promise<string> {
  const patientRef = firestore.collection('users').doc(owner).collection('patients').doc()
  const now = new Date().toISOString()
  const profile: Record<string, unknown> = {
    id: patientRef.id,
    userId: owner,
    type: 'human',
    name: member.name,
    dateOfBirth: member.dob,
    gender: member.gender,
    relationship: member.relationship,
    householdId,
    height: member.heightInches,
    heightUnit: 'imperial',
    currentWeight: member.currentWeightLbs,
    goals: {
      startWeight: member.startWeight,
      weeklyWeightLossGoal: 1,
      ...(member.targetWeight ? { targetWeight: member.targetWeight } : {}),
    },
    healthConditions: member.healthConditions ?? [],
    foodAllergies: member.foodAllergies ?? [],
    ...(member.preferredFoods ? { preferredFoods: member.preferredFoods } : {}),
    ...(member.aversions ? { aversions: member.aversions } : {}),
    ...(member.dietaryRestrictions ? { dietaryRestrictions: member.dietaryRestrictions } : {}),
    ...(member.preparationNeeds ? { preparationNeeds: member.preparationNeeds } : {}),
    ...(member.practiceNotes ? { practiceNotes: member.practiceNotes } : {}),
    addedBy: owner,
    addedAt: now,
    createdAt: now,
    lastModified: now,
    dataSource: 'family-sim',
  }
  await patientRef.set(profile)
  member.patientId = patientRef.id

  // Medications (orderBy addedAt).
  for (const med of member.medications ?? []) {
    await patientRef.collection('medications').add({
      patientId: patientRef.id,
      userId: owner,
      ...med,
      active: true,
      startDate: new Date(Date.now() - 90 * 864e5).toISOString(),
      addedAt: now,
      addedBy: owner,
      lastModified: now,
      dataSource: 'family-sim',
    })
  }
  // Equipment (orderBy addedAt).
  for (const eq of member.equipment ?? []) {
    await patientRef.collection('equipment').add({
      patientId: patientRef.id,
      userId: owner,
      ...eq,
      acquiredAt: new Date(Date.now() - 200 * 864e5).toISOString(),
      addedAt: now,
      addedBy: owner,
      source: 'manual',
      dataSource: 'family-sim',
    })
  }
  // Family history (orderBy addedAt).
  for (const fh of member.familyHistory ?? []) {
    await patientRef.collection('family-history').add({
      patientId: patientRef.id,
      userId: owner,
      ...fh,
      addedAt: now,
      addedBy: owner,
      source: 'manual',
      dataSource: 'family-sim',
    })
  }
  // Immunizations (orderBy administeredAt).
  for (const im of member.immunizations ?? []) {
    await patientRef.collection('immunizations').add({
      patientId: patientRef.id,
      userId: owner,
      vaccineName: im.vaccineName,
      doseNumber: im.doseNumber,
      administeredAt: new Date(Date.now() - im.daysAgo * 864e5).toISOString(),
      ...(im.nextDueInDays != null ? { nextDueAt: new Date(Date.now() + im.nextDueInDays * 864e5).toISOString() } : {}),
      addedAt: now,
      addedBy: owner,
      source: 'manual',
      dataSource: 'family-sim',
    })
  }
  return patientRef.id
}

/** 35 days of weight + meals + vitals + appointments for a member. */
export async function seedTimeSeries(
  firestore: Firestore,
  owner: string,
  member: MemberProfile,
): Promise<void> {
  const patientId = member.patientId!
  const userRef = firestore.collection('users').doc(owner)
  const patientRef = userRef.collection('patients').doc(patientId)
  const random = mkRng(1337 + member.key.length * 101 + member.currentWeightLbs)
  const today = new Date()
  const slope = (member.currentWeightLbs - member.startWeight) / 35

  const mealVariants = [
    { type: 'breakfast', hour: 7, items: ['Oatmeal', 'Banana'], cal: 380, p: 12, c: 70, f: 6 },
    { type: 'lunch', hour: 12, items: ['Chicken salad'], cal: 480, p: 38, c: 22, f: 22 },
    { type: 'dinner', hour: 19, items: ['Salmon', 'Sweet potato'], cal: 620, p: 42, c: 50, f: 20 },
  ] as const

  for (let i = 0; i < 35; i++) {
    const daysAgo = 34 - i
    const date = new Date(today)
    date.setDate(date.getDate() - daysAgo)
    date.setHours(8, 0, 0, 0)

    const w = Math.round((member.startWeight + slope * i + (random() - 0.5) * 1.4) * 10) / 10
    await userRef.collection('weightLogs').add({
      patientId, userId: owner, loggedBy: owner, weight: w, unit: 'lbs',
      loggedAt: Timestamp.fromDate(date), dataSource: 'family-sim',
    })

    for (const m of mealVariants) {
      const md = new Date(date)
      md.setHours(m.hour, Math.floor(random() * 30), 0, 0)
      await userRef.collection('mealLogs').add({
        patientId, userId: owner, loggedBy: owner, mealType: m.type, foodItems: m.items,
        totalCalories: m.cal, totalProtein: m.p, totalCarbs: m.c, totalFat: m.f,
        loggedAt: Timestamp.fromDate(md), dataSource: 'family-sim',
      })
      await patientRef.collection('meal-logs').add({
        patientId, userId: owner, loggedBy: owner, mealType: m.type, foodItems: m.items,
        calories: m.cal, protein: m.p, carbs: m.c, fat: m.f,
        loggedAt: md.toISOString(), tags: [], aiAnalyzed: false, dataSource: 'family-sim',
      })
    }

    if (daysAgo % 2 === 0) {
      const elevated = daysAgo % 7 === 0
      await patientRef.collection('vitals').add({
        type: 'blood_pressure',
        value: {
          systolic: elevated ? 134 + Math.floor(random() * 6) : 116 + Math.floor(random() * 10),
          diastolic: elevated ? 86 + Math.floor(random() * 4) : 75 + Math.floor(random() * 8),
        },
        unit: 'mmHg', recordedAt: date.toISOString(), loggedAt: date.toISOString(),
        loggedBy: owner, takenBy: owner, method: 'manual', approvalStatus: 'approved', dataSource: 'family-sim',
      })
    }
    if (daysAgo % 3 === 0) {
      await patientRef.collection('vitals').add({
        type: 'temperature', value: Math.round((97.6 + random() * 1.4) * 10) / 10, unit: '°F',
        recordedAt: date.toISOString(), loggedAt: date.toISOString(),
        loggedBy: owner, takenBy: owner, method: 'manual', approvalStatus: 'approved', dataSource: 'family-sim',
      })
    }
    if (daysAgo % 4 === 0) {
      await patientRef.collection('vitals').add({
        type: 'blood_sugar', value: 95 + Math.floor(random() * 30), unit: 'mg/dL',
        recordedAt: date.toISOString(), loggedAt: date.toISOString(),
        loggedBy: owner, takenBy: owner, method: 'manual', approvalStatus: 'approved', dataSource: 'family-sim',
      })
    }
    if (daysAgo % 5 === 0) {
      await patientRef.collection('vitals').add({
        type: 'pulse_oximeter', value: { spo2: 96 + Math.floor(random() * 3), pulseRate: 65 + Math.floor(random() * 20) },
        unit: 'SpO₂% / bpm', recordedAt: date.toISOString(), loggedAt: date.toISOString(),
        loggedBy: owner, takenBy: owner, method: 'manual', approvalStatus: 'approved', dataSource: 'family-sim',
      })
    }
  }

  // Past + future appointments (USER-level, dateTime, patientId filter).
  const apptNow = new Date().toISOString()
  for (const a of [
    { daysOffset: -21, providerName: 'Dr. Chen', specialty: 'Primary Care', reason: 'Check-up', type: 'check-up' },
    { daysOffset: -7, providerName: 'Dr. Patel', specialty: 'Specialist', reason: 'Follow-up', type: 'follow-up' },
    { daysOffset: 14, providerName: 'Dr. Chen', specialty: 'Primary Care', reason: 'Quarterly review', type: 'follow-up' },
  ]) {
    const dt = new Date(); dt.setDate(dt.getDate() + a.daysOffset); dt.setHours(10, 0, 0, 0)
    await userRef.collection('appointments').add({
      userId: owner, patientId, patientName: member.name, dateTime: dt.toISOString(),
      type: a.type, status: a.daysOffset < 0 ? 'completed' : 'scheduled',
      providerName: a.providerName, specialty: a.specialty, reason: a.reason,
      requiresDriver: false, driverStatus: 'not-needed',
      createdAt: apptNow, createdBy: owner, updatedAt: apptNow, updatedBy: owner, dataSource: 'family-sim',
    })
  }

  // Keep currentWeight in sync with the latest log.
  const latestSnap = await userRef.collection('weightLogs').where('patientId', '==', patientId).get()
  const latest = latestSnap.docs
    .map(d => ({ w: d.data().weight, t: d.data().loggedAt?.toDate?.()?.getTime?.() ?? 0 }))
    .sort((a, b) => b.t - a.t)[0]
  if (latest) await patientRef.set({ currentWeight: latest.w }, { merge: true })
}

/** Create a household owned by `owner` and assign the given members to it. */
export async function createHousehold(
  firestore: Firestore,
  owner: string,
  name: string,
  patientIds: string[],
): Promise<string> {
  const ref = firestore.collection('households').doc()
  const now = new Date().toISOString()
  await ref.set({
    id: ref.id,
    name,
    primaryCaregiverId: owner,
    kitchenConfig: { hasSharedInventory: true, separateShoppingLists: false },
    createdBy: owner,
    createdAt: now,
    updatedAt: now,
    isActive: true,
    dataSource: 'family-sim',
  })
  const userRef = firestore.collection('users').doc(owner)
  for (const pid of patientIds) {
    await userRef.collection('patients').doc(pid).set({ householdId: ref.id, lastModified: now }, { merge: true })
  }
  return ref.id
}

/**
 * Create a DATA-ONLY caregiver: a user doc with a caregiverOf[] entry,
 * an owner-side familyMembers roster entry, and per-patient access
 * entries. No real Firebase Auth login — this models the relationship
 * + permission grant so the owner-facing surfaces render it.
 */
export async function seedDataOnlyCaregiver(
  firestore: Firestore,
  owner: string,
  caregiver: { uid: string; name: string; email: string; relationship: string; familyRole?: string },
  ownerName: string,
  patientIds: string[],
  permissions: SimPermissions = VIEW_AND_LOG,
): Promise<void> {
  const now = new Date().toISOString()
  const role = caregiver.familyRole ?? 'caregiver'

  // 1. Caregiver's own user doc + caregiverOf back-link.
  await firestore.collection('users').doc(caregiver.uid).set({
    id: caregiver.uid,
    name: caregiver.name,
    email: caregiver.email,
    caregiverOf: [{
      accountOwnerId: owner,
      accountOwnerName: ownerName,
      role,
      patientsAccess: patientIds,
      permissions,
      addedAt: now,
      addedByAdmin: true,
      familyPlan: true,
    }],
    dataSource: 'family-sim',
  }, { merge: true })

  const userRef = firestore.collection('users').doc(owner)
  const notificationPreferences = {
    appointmentReminders: true, appointmentUpdates: true, vitalAlerts: true,
    medicationReminders: true, documentUploads: true, aiRecommendations: true,
    chatMessages: true, urgentAlerts: true, driverAssignmentNotifications: true,
    driverReminderDaysBefore: [7, 3, 1],
  }

  // 2. Owner's familyMembers roster entry (doc id == caregiver uid).
  await userRef.collection('familyMembers').doc(caregiver.uid).set({
    userId: caregiver.uid,
    email: caregiver.email,
    name: caregiver.name,
    relationship: caregiver.relationship,
    invitedBy: owner,
    invitedAt: now,
    acceptedAt: now,
    status: 'accepted',
    permissions,
    notificationPreferences,
    patientsAccess: patientIds,
    familyRole: role,
    managedBy: owner,
    canBeEditedBy: [owner],
    roleAssignedAt: now,
    roleAssignedBy: owner,
    dataSource: 'family-sim',
  })

  // 3. Per-patient access entries.
  for (const pid of patientIds) {
    await userRef.collection('patients').doc(pid).collection('familyMembers').doc(caregiver.uid).set({
      userId: caregiver.uid,
      email: caregiver.email,
      name: caregiver.name,
      relationship: caregiver.relationship,
      permissions,
      status: 'accepted',
      addedAt: now,
      addedBy: owner,
      lastModified: now,
      dataSource: 'family-sim',
    })
  }
}

/** Delete a member + all their data (subcollections + user-level rows). */
export async function deleteMember(firestore: Firestore, owner: string, patientId: string): Promise<void> {
  const userRef = firestore.collection('users').doc(owner)
  const patientRef = userRef.collection('patients').doc(patientId)
  for (const sub of ['vitals', 'medications', 'meal-logs', 'equipment', 'family-history', 'immunizations', 'familyMembers']) {
    const snap = await patientRef.collection(sub).get()
    for (const d of snap.docs) await d.ref.delete()
  }
  for (const col of ['weightLogs', 'mealLogs', 'appointments']) {
    const snap = await userRef.collection(col).where('patientId', '==', patientId).get()
    for (const d of snap.docs) await d.ref.delete()
  }
  await patientRef.delete()
}
