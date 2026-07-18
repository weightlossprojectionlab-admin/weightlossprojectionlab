/**
 * User Data Export — single source of truth for "download all my data".
 *
 * Shared by the user-facing export (`/api/user/export`) and the admin GDPR
 * export (`/api/admin/users/export`) so both dump the exact same shape.
 * Extends the original admin dump to include the clinical collections it
 * omitted (patients + their vitals/medications/documents/immunizations/
 * equipment/familyHistory, appointments, and health reports).
 */

import { adminDb } from '@/lib/firebase-admin'

/** Per-patient clinical subcollections nested under users/{uid}/patients/{pid}. */
const PATIENT_SUBCOLLECTIONS = [
  'vitals',
  'medications',
  'documents',
  'immunizations',
  'equipment',
  'familyHistory',
] as const

type DocList = Array<Record<string, unknown>>

const mapDocs = (snap: FirebaseFirestore.QuerySnapshot): DocList =>
  snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

export interface UserExport {
  exportedAt: string
  profile: Record<string, unknown>
  appointments: DocList
  mealLogs: DocList
  weightLogs: DocList
  stepLogs: DocList
  biometricCredentials: DocList
  cookingSessions: DocList
  recipeQueue: DocList
  patients: DocList
}

/**
 * Gather every Firestore record we hold for a single user (by uid), including
 * each of their patients' clinical subcollections and health reports.
 */
export async function collectUserExport(uid: string): Promise<UserExport> {
  const userRef = adminDb.collection('users').doc(uid)

  const [
    userDoc,
    appointments,
    mealLogs,
    weightLogs,
    stepLogs,
    biometricCredentials,
    cookingSessions,
    recipeQueue,
    patientsSnap,
  ] = await Promise.all([
    userRef.get(),
    userRef.collection('appointments').get(),
    userRef.collection('mealLogs').get(),
    userRef.collection('weightLogs').get(),
    userRef.collection('stepLogs').get(),
    userRef.collection('biometricCredentials').get(),
    adminDb.collection('cooking-sessions').where('userId', '==', uid).get(),
    adminDb.collection('recipe-queue').where('userId', '==', uid).get(),
    userRef.collection('patients').get(),
  ])

  // For each patient, pull the clinical subcollections + their health reports.
  const patients = await Promise.all(
    patientsSnap.docs.map(async patientDoc => {
      const patientRef = patientDoc.ref
      const [subSnaps, reportsSnap] = await Promise.all([
        Promise.all(PATIENT_SUBCOLLECTIONS.map(name => patientRef.collection(name).get())),
        adminDb.collection('healthReports').where('patientId', '==', patientDoc.id).get(),
      ])

      const subcollections: Record<string, DocList> = {}
      PATIENT_SUBCOLLECTIONS.forEach((name, i) => {
        subcollections[name] = mapDocs(subSnaps[i])
      })

      return {
        id: patientDoc.id,
        ...patientDoc.data(),
        ...subcollections,
        healthReports: mapDocs(reportsSnap),
      }
    })
  )

  return {
    exportedAt: new Date().toISOString(),
    profile: userDoc.data() ?? {},
    appointments: mapDocs(appointments),
    mealLogs: mapDocs(mealLogs),
    weightLogs: mapDocs(weightLogs),
    stepLogs: mapDocs(stepLogs),
    biometricCredentials: mapDocs(biometricCredentials),
    cookingSessions: mapDocs(cookingSessions),
    recipeQueue: mapDocs(recipeQueue),
    patients,
  }
}
