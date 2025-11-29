/**
 * Offline Medical Data Cache
 *
 * Provides offline access to critical medical data for doctor visits:
 * - Medications (with images)
 * - Patient documents (insurance cards, IDs)
 * - Vital signs history
 * - Patient profiles & emergency contacts
 *
 * Patient-scoped for caregiver multi-patient support
 */

import { logger } from '@/lib/logger'
import type { PatientMedication, PatientDocument, VitalSign, PatientProfile } from '@/types/medical'

const DB_NAME = 'wlpl-medical-offline'
const DB_VERSION = 1

// Object store names
const MEDICATIONS_STORE = 'medications'
const DOCUMENTS_STORE = 'documents'
const VITALS_STORE = 'vitals'
const PROFILES_STORE = 'profiles'
const CACHED_PATIENTS_STORE = 'cached-patients'

// Cache metadata
interface CacheMetadata {
  patientId: string
  patientName: string
  cachedAt: number
  expiresAt: number
}

interface CachedMedication extends PatientMedication {
  cachedAt: number
}

interface CachedDocument extends PatientDocument {
  cachedAt: number
  availableOffline: boolean // User-selected
  imageBlob?: Blob // Full-resolution image for offline
}

interface CachedVital extends VitalSign {
  cachedAt: number
}

interface CachedProfile extends PatientProfile {
  cachedAt: number
}

/**
 * Initialize IndexedDB for medical data
 */
function openMedicalDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Failed to open medical offline database'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Cached patients list
      if (!db.objectStoreNames.contains(CACHED_PATIENTS_STORE)) {
        const patientsStore = db.createObjectStore(CACHED_PATIENTS_STORE, { keyPath: 'patientId' })
        patientsStore.createIndex('cachedAt', 'cachedAt', { unique: false })
      }

      // Medications - keyed by patient
      if (!db.objectStoreNames.contains(MEDICATIONS_STORE)) {
        const medsStore = db.createObjectStore(MEDICATIONS_STORE, { keyPath: ['patientId', 'id'] })
        medsStore.createIndex('patientId', 'patientId', { unique: false })
        medsStore.createIndex('cachedAt', 'cachedAt', { unique: false })
      }

      // Documents - keyed by patient
      if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
        const docsStore = db.createObjectStore(DOCUMENTS_STORE, { keyPath: ['patientId', 'id'] })
        docsStore.createIndex('patientId', 'patientId', { unique: false })
        docsStore.createIndex('availableOffline', 'availableOffline', { unique: false })
      }

      // Vitals - keyed by patient
      if (!db.objectStoreNames.contains(VITALS_STORE)) {
        const vitalsStore = db.createObjectStore(VITALS_STORE, { keyPath: ['patientId', 'id'] })
        vitalsStore.createIndex('patientId', 'patientId', { unique: false })
        vitalsStore.createIndex('recordedAt', 'recordedAt', { unique: false })
      }

      // Patient profiles
      if (!db.objectStoreNames.contains(PROFILES_STORE)) {
        const profilesStore = db.createObjectStore(PROFILES_STORE, { keyPath: 'id' })
        profilesStore.createIndex('cachedAt', 'cachedAt', { unique: false })
      }
    }
  })
}

// ==================== MEDICATIONS ====================

/**
 * Cache medications for a patient
 */
export async function cacheMedications(
  patientId: string,
  medications: PatientMedication[]
): Promise<void> {
  const db = await openMedicalDB()
  const transaction = db.transaction([MEDICATIONS_STORE], 'readwrite')
  const store = transaction.objectStore(MEDICATIONS_STORE)

  const cachedAt = Date.now()

  // Clear old medications for this patient
  const index = store.index('patientId')
  const oldMeds = await new Promise<IDBRequest<IDBCursorWithValue | null>>((resolve) => {
    const req = index.openCursor(IDBKeyRange.only(patientId))
    req.onsuccess = () => resolve(req)
  })

  // Delete old entries
  if (oldMeds.result) {
    let cursor = oldMeds.result
    while (cursor) {
      cursor.delete()
      cursor = await new Promise<IDBCursorWithValue | null>((resolve) => {
        cursor.continue()
        const req = cursor.source.index('patientId').openCursor(IDBKeyRange.only(patientId))
        req.onsuccess = () => resolve(req.result)
      })
    }
  }

  // Add new medications
  for (const med of medications) {
    const cachedMed: CachedMedication = {
      ...med,
      patientId,
      cachedAt
    }
    store.add(cachedMed)
  }

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })

  logger.info('[OfflineMedical] Cached medications', { patientId, count: medications.length })
}

/**
 * Get cached medications for a patient
 */
export async function getCachedMedications(patientId: string): Promise<PatientMedication[]> {
  const db = await openMedicalDB()
  const transaction = db.transaction([MEDICATIONS_STORE], 'readonly')
  const store = transaction.objectStore(MEDICATIONS_STORE)
  const index = store.index('patientId')

  return new Promise((resolve, reject) => {
    const request = index.getAll(IDBKeyRange.only(patientId))

    request.onsuccess = () => {
      const meds = request.result as CachedMedication[]
      logger.debug('[OfflineMedical] Retrieved cached medications', {
        patientId,
        count: meds.length
      })
      resolve(meds)
    }

    request.onerror = () => {
      logger.error('[OfflineMedical] Failed to get cached medications', request.error as Error)
      reject(request.error)
    }
  })
}

// ==================== DOCUMENTS ====================

/**
 * Cache document for offline access
 */
export async function cacheDocument(
  patientId: string,
  document: PatientDocument,
  imageBlob?: Blob
): Promise<void> {
  const db = await openMedicalDB()
  const transaction = db.transaction([DOCUMENTS_STORE], 'readwrite')
  const store = transaction.objectStore(DOCUMENTS_STORE)

  const cachedDoc: CachedDocument = {
    ...document,
    patientId,
    cachedAt: Date.now(),
    availableOffline: true,
    imageBlob
  }

  return new Promise((resolve, reject) => {
    const request = store.put(cachedDoc)

    request.onsuccess = () => {
      logger.info('[OfflineMedical] Cached document', {
        patientId,
        documentId: document.id,
        hasBlob: !!imageBlob
      })
      resolve()
    }

    request.onerror = () => {
      logger.error('[OfflineMedical] Failed to cache document', request.error as Error)
      reject(request.error)
    }
  })
}

/**
 * Get offline-available documents for a patient
 */
export async function getOfflineDocuments(patientId: string): Promise<CachedDocument[]> {
  const db = await openMedicalDB()
  const transaction = db.transaction([DOCUMENTS_STORE], 'readonly')
  const store = transaction.objectStore(DOCUMENTS_STORE)
  const index = store.index('patientId')

  return new Promise((resolve, reject) => {
    const request = index.getAll(IDBKeyRange.only(patientId))

    request.onsuccess = () => {
      const docs = (request.result as CachedDocument[]).filter(doc => doc.availableOffline)
      logger.debug('[OfflineMedical] Retrieved offline documents', {
        patientId,
        count: docs.length
      })
      resolve(docs)
    }

    request.onerror = () => {
      logger.error('[OfflineMedical] Failed to get offline documents', request.error as Error)
      reject(request.error)
    }
  })
}

/**
 * Remove document from offline cache
 */
export async function removeOfflineDocument(patientId: string, documentId: string): Promise<void> {
  const db = await openMedicalDB()
  const transaction = db.transaction([DOCUMENTS_STORE], 'readwrite')
  const store = transaction.objectStore(DOCUMENTS_STORE)

  return new Promise((resolve, reject) => {
    const request = store.delete([patientId, documentId])

    request.onsuccess = () => {
      logger.info('[OfflineMedical] Removed offline document', { patientId, documentId })
      resolve()
    }

    request.onerror = () => {
      logger.error('[OfflineMedical] Failed to remove offline document', request.error as Error)
      reject(request.error)
    }
  })
}

// ==================== VITALS ====================

/**
 * Cache vitals for a patient (last 30 days)
 */
export async function cacheVitals(
  patientId: string,
  vitals: VitalSign[]
): Promise<void> {
  const db = await openMedicalDB()
  const transaction = db.transaction([VITALS_STORE], 'readwrite')
  const store = transaction.objectStore(VITALS_STORE)

  const cachedAt = Date.now()
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)

  // Filter to last 30 days only
  const recentVitals = vitals.filter(v => {
    const recordedAt = new Date(v.recordedAt).getTime()
    return recordedAt >= thirtyDaysAgo
  })

  // Clear old vitals for this patient
  const index = store.index('patientId')
  const request = index.openCursor(IDBKeyRange.only(patientId))

  request.onsuccess = () => {
    const cursor = request.result
    if (cursor) {
      cursor.delete()
      cursor.continue()
    }
  }

  // Add new vitals
  for (const vital of recentVitals) {
    const cachedVital: CachedVital = {
      ...vital,
      patientId,
      cachedAt
    }
    store.add(cachedVital)
  }

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      logger.info('[OfflineMedical] Cached vitals', { patientId, count: recentVitals.length })
      resolve()
    }
    transaction.onerror = () => reject(transaction.error)
  })
}

/**
 * Get cached vitals for a patient
 */
export async function getCachedVitals(patientId: string): Promise<VitalSign[]> {
  const db = await openMedicalDB()
  const transaction = db.transaction([VITALS_STORE], 'readonly')
  const store = transaction.objectStore(VITALS_STORE)
  const index = store.index('patientId')

  return new Promise((resolve, reject) => {
    const request = index.getAll(IDBKeyRange.only(patientId))

    request.onsuccess = () => {
      const vitals = request.result as CachedVital[]
      logger.debug('[OfflineMedical] Retrieved cached vitals', {
        patientId,
        count: vitals.length
      })
      resolve(vitals)
    }

    request.onerror = () => {
      logger.error('[OfflineMedical] Failed to get cached vitals', request.error as Error)
      reject(request.error)
    }
  })
}

// ==================== PATIENT PROFILES ====================

/**
 * Cache patient profile (including emergency contacts)
 */
export async function cachePatientProfile(profile: PatientProfile): Promise<void> {
  const db = await openMedicalDB()
  const transaction = db.transaction([PROFILES_STORE, CACHED_PATIENTS_STORE], 'readwrite')
  const profilesStore = transaction.objectStore(PROFILES_STORE)
  const patientsStore = transaction.objectStore(CACHED_PATIENTS_STORE)

  const cachedProfile: CachedProfile = {
    ...profile,
    cachedAt: Date.now()
  }

  profilesStore.put(cachedProfile)

  // Update cached patients list
  const metadata: CacheMetadata = {
    patientId: profile.id,
    patientName: profile.name,
    cachedAt: Date.now(),
    expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
  }
  patientsStore.put(metadata)

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      logger.info('[OfflineMedical] Cached patient profile', { patientId: profile.id })
      resolve()
    }
    transaction.onerror = () => reject(transaction.error)
  })
}

/**
 * Get cached patient profile
 */
export async function getCachedPatientProfile(patientId: string): Promise<PatientProfile | null> {
  const db = await openMedicalDB()
  const transaction = db.transaction([PROFILES_STORE], 'readonly')
  const store = transaction.objectStore(PROFILES_STORE)

  return new Promise((resolve, reject) => {
    const request = store.get(patientId)

    request.onsuccess = () => {
      const profile = request.result as CachedProfile | undefined
      if (profile) {
        logger.debug('[OfflineMedical] Retrieved cached profile', { patientId })
        resolve(profile)
      } else {
        resolve(null)
      }
    }

    request.onerror = () => {
      logger.error('[OfflineMedical] Failed to get cached profile', request.error as Error)
      reject(request.error)
    }
  })
}

/**
 * Get list of all cached patients (for caregiver multi-patient view)
 */
export async function getCachedPatients(): Promise<CacheMetadata[]> {
  const db = await openMedicalDB()
  const transaction = db.transaction([CACHED_PATIENTS_STORE], 'readonly')
  const store = transaction.objectStore(CACHED_PATIENTS_STORE)

  return new Promise((resolve, reject) => {
    const request = store.getAll()

    request.onsuccess = () => {
      const patients = request.result as CacheMetadata[]
      logger.debug('[OfflineMedical] Retrieved cached patients list', { count: patients.length })
      resolve(patients)
    }

    request.onerror = () => {
      logger.error('[OfflineMedical] Failed to get cached patients', request.error as Error)
      reject(request.error)
    }
  })
}

/**
 * Remove patient from offline cache entirely
 */
export async function removeCachedPatient(patientId: string): Promise<void> {
  const db = await openMedicalDB()
  const transaction = db.transaction(
    [MEDICATIONS_STORE, DOCUMENTS_STORE, VITALS_STORE, PROFILES_STORE, CACHED_PATIENTS_STORE],
    'readwrite'
  )

  // Remove from all stores
  const stores = [
    transaction.objectStore(MEDICATIONS_STORE),
    transaction.objectStore(DOCUMENTS_STORE),
    transaction.objectStore(VITALS_STORE)
  ]

  for (const store of stores) {
    const index = store.index('patientId')
    const request = index.openCursor(IDBKeyRange.only(patientId))
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }
  }

  transaction.objectStore(PROFILES_STORE).delete(patientId)
  transaction.objectStore(CACHED_PATIENTS_STORE).delete(patientId)

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      logger.info('[OfflineMedical] Removed cached patient', { patientId })
      resolve()
    }
    transaction.onerror = () => reject(transaction.error)
  })
}

/**
 * Get storage usage estimate
 */
export async function getMedicalCacheSize(): Promise<number> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    return estimate.usage || 0
  }
  return 0
}

/**
 * Get quota estimate
 */
export async function getMedicalCacheQuota(): Promise<number> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    return estimate.quota || 0
  }
  return 0
}
