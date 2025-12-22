import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getStorage, type Storage } from 'firebase-admin/storage'
import { logger } from '@/lib/logger'

// Lazy initialization - only initialize when actually used
let adminApp: App | null = null
let adminAuthInstance: Auth | null = null
let adminDbInstance: Firestore | null = null
let adminStorageInstance: Storage | null = null

const initializeFirebaseAdmin = (): App => {
  if (adminApp) {
    return adminApp
  }

  if (getApps().length > 0) {
    adminApp = getApps()[0]
    return adminApp
  }

  try {
    logger.info('Initializing Firebase Admin SDK')

    if (!process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      throw new Error('Missing Firebase Admin SDK environment variables: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, or FIREBASE_ADMIN_PRIVATE_KEY')
    }

    // Handle private key with proper formatting
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

    // Remove quotes if present
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1)
    }

    if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
      privateKey = privateKey.slice(1, -1)
    }

    // Replace escaped newlines with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n')

    // Validate that we have the required markers
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
      const error = new Error('Invalid private key format: Missing BEGIN or END markers')
      logger.error('Invalid private key format: Missing BEGIN or END marker', error, {
        keyLength: privateKey.length,
        preview: privateKey.substring(0, 100)
      })
      throw error
    }

    // Ensure proper PEM format with trailing newline
    if (!privateKey.endsWith('\n')) {
      privateKey += '\n'
    }

    logger.debug('Private key parsed successfully', { keyLength: privateKey.length })

    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_ADMIN_PROJECT_ID}.appspot.com`,
    })

    logger.info('Firebase Admin SDK initialized successfully')
    return adminApp
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', error as Error)
    throw error
  }
}

// Lazy getters for admin services
export const getAdminAuth = (): Auth => {
  if (!adminAuthInstance) {
    const app = initializeFirebaseAdmin()
    adminAuthInstance = getAuth(app)
  }
  return adminAuthInstance
}

export const getAdminDb = (): Firestore => {
  if (!adminDbInstance) {
    const app = initializeFirebaseAdmin()
    adminDbInstance = getFirestore(app)
  }
  return adminDbInstance
}

export const getAdminStorage = (): Storage => {
  if (!adminStorageInstance) {
    const app = initializeFirebaseAdmin()
    adminStorageInstance = getStorage(app)
  }
  return adminStorageInstance
}

// Export lazy getters with backwards compatibility
export const adminAuth = new Proxy({} as Auth, {
  get: (target, prop) => {
    const auth = getAdminAuth()
    return (auth as any)[prop]
  }
})

export const adminDb = new Proxy({} as Firestore, {
  get: (target, prop) => {
    const db = getAdminDb()
    return (db as any)[prop]
  }
})

export const adminStorage = new Proxy({} as Storage, {
  get: (target, prop) => {
    const storage = getAdminStorage()
    return (storage as any)[prop]
  }
})

// Helper functions for common operations
export const verifyIdToken = async (idToken: string) => {
  try {
    const auth = getAdminAuth()
    const decodedToken = await auth.verifyIdToken(idToken)
    return decodedToken
  } catch (error) {
    logger.error('Error verifying ID token', error as Error)
    throw error
  }
}

export const createCustomToken = async (uid: string, additionalClaims?: object) => {
  try {
    const auth = getAdminAuth()
    const customToken = await auth.createCustomToken(uid, additionalClaims)
    return customToken
  } catch (error) {
    logger.error('Error creating custom token', error as Error)
    throw error
  }
}

export const getUserByEmail = async (email: string) => {
  try {
    const auth = getAdminAuth()
    const userRecord = await auth.getUserByEmail(email)
    return userRecord
  } catch (error) {
    if ((error as any).code === 'auth/user-not-found') {
      return null
    }
    logger.error('Error getting user by email', error as Error)
    throw error
  }
}

export const createUser = async (userData: {
  email: string
  password?: string
  displayName?: string
  emailVerified?: boolean
}) => {
  try {
    const auth = getAdminAuth()
    const userRecord = await auth.createUser(userData)
    return userRecord
  } catch (error) {
    logger.error('Error creating user', error as Error)
    throw error
  }
}

export const updateUser = async (uid: string, userData: {
  email?: string
  displayName?: string
  emailVerified?: boolean
}) => {
  try {
    const auth = getAdminAuth()
    const userRecord = await auth.updateUser(uid, userData)
    return userRecord
  } catch (error) {
    logger.error('Error updating user', error as Error)
    throw error
  }
}

export const deleteUser = async (uid: string) => {
  try {
    const auth = getAdminAuth()
    await auth.deleteUser(uid)
    logger.info('Successfully deleted user', { uid })
  } catch (error) {
    logger.error('Error deleting user', error as Error)
    throw error
  }
}

// Firestore helper functions
export const createUserProfile = async (uid: string, profileData: {
  email: string
  name?: string
  preferences?: Record<string, unknown>
  goals?: Record<string, unknown>
}) => {
  try {
    const db = getAdminDb()
    await db.collection('users').doc(uid).set({
      ...profileData,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    })
    logger.info('User profile created', { uid })
  } catch (error) {
    logger.error('Error creating user profile', error as Error)
    throw error
  }
}

export const getUserProfile = async (uid: string) => {
  try {
    const db = getAdminDb()
    const doc = await db.collection('users').doc(uid).get()
    if (doc.exists) {
      return { id: doc.id, ...doc.data() }
    }
    return null
  } catch (error) {
    logger.error('Error getting user profile', error as Error)
    throw error
  }
}

export const updateUserProfile = async (uid: string, updateData: Record<string, unknown>) => {
  try {
    const db = getAdminDb()
    await db.collection('users').doc(uid).update({
      ...updateData,
      lastActiveAt: new Date(),
    })
    logger.info('User profile updated', { uid })
  } catch (error) {
    logger.error('Error updating user profile', error as Error)
    throw error
  }
}

// Export getter for admin app
export const getAdminApp = (): App => initializeFirebaseAdmin()

// Alias for backward compatibility
export const initAdmin = () => initializeFirebaseAdmin()

export default getAdminApp