import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

// Lazy initialization - only initialize when actually used
let adminApp: App | null = null
let adminAuthInstance: Auth | null = null
let adminDbInstance: Firestore | null = null

const initializeFirebaseAdmin = (): App => {
  if (adminApp) {
    return adminApp
  }

  if (getApps().length > 0) {
    adminApp = getApps()[0]
    return adminApp
  }

  try {
    // Parse the private key from environment variable
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (!privateKey || !process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
      throw new Error('Missing Firebase Admin SDK environment variables')
    }

    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    })

    console.log('Firebase Admin SDK initialized successfully')
    return adminApp
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error)
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

// Helper functions for common operations
export const verifyIdToken = async (idToken: string) => {
  try {
    const auth = getAdminAuth()
    const decodedToken = await auth.verifyIdToken(idToken)
    return decodedToken
  } catch (error) {
    console.error('Error verifying ID token:', error)
    throw error
  }
}

export const createCustomToken = async (uid: string, additionalClaims?: object) => {
  try {
    const auth = getAdminAuth()
    const customToken = await auth.createCustomToken(uid, additionalClaims)
    return customToken
  } catch (error) {
    console.error('Error creating custom token:', error)
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
    console.error('Error getting user by email:', error)
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
    console.error('Error creating user:', error)
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
    console.error('Error updating user:', error)
    throw error
  }
}

export const deleteUser = async (uid: string) => {
  try {
    const auth = getAdminAuth()
    await auth.deleteUser(uid)
    console.log('Successfully deleted user:', uid)
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

// Firestore helper functions
export const createUserProfile = async (uid: string, profileData: any) => {
  try {
    const db = getAdminDb()
    await db.collection('users').doc(uid).set({
      ...profileData,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    })
    console.log('User profile created:', uid)
  } catch (error) {
    console.error('Error creating user profile:', error)
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
    console.error('Error getting user profile:', error)
    throw error
  }
}

export const updateUserProfile = async (uid: string, updateData: any) => {
  try {
    const db = getAdminDb()
    await db.collection('users').doc(uid).update({
      ...updateData,
      lastActiveAt: new Date(),
    })
    console.log('User profile updated:', uid)
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}

// Export getter for admin app
export const getAdminApp = (): App => initializeFirebaseAdmin()

export default getAdminApp