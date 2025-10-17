import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    try {
      // Parse the private key from environment variable
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

      if (!privateKey || !process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
        throw new Error('Missing Firebase Admin SDK environment variables')
      }

      const app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      })

      console.log('Firebase Admin SDK initialized successfully')
      return app
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error)
      throw error
    }
  }
  return getApps()[0]
}

// Initialize the admin app
const adminApp = initializeFirebaseAdmin()

// Export admin services
export const adminAuth = getAuth(adminApp)
export const adminDb = getFirestore(adminApp)

// Helper functions for common operations
export const verifyIdToken = async (idToken: string) => {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    return decodedToken
  } catch (error) {
    console.error('Error verifying ID token:', error)
    throw error
  }
}

export const createCustomToken = async (uid: string, additionalClaims?: object) => {
  try {
    const customToken = await adminAuth.createCustomToken(uid, additionalClaims)
    return customToken
  } catch (error) {
    console.error('Error creating custom token:', error)
    throw error
  }
}

export const getUserByEmail = async (email: string) => {
  try {
    const userRecord = await adminAuth.getUserByEmail(email)
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
    const userRecord = await adminAuth.createUser(userData)
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
    const userRecord = await adminAuth.updateUser(uid, userData)
    return userRecord
  } catch (error) {
    console.error('Error updating user:', error)
    throw error
  }
}

export const deleteUser = async (uid: string) => {
  try {
    await adminAuth.deleteUser(uid)
    console.log('Successfully deleted user:', uid)
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

// Firestore helper functions
export const createUserProfile = async (uid: string, profileData: any) => {
  try {
    await adminDb.collection('users').doc(uid).set({
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
    const doc = await adminDb.collection('users').doc(uid).get()
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
    await adminDb.collection('users').doc(uid).update({
      ...updateData,
      lastActiveAt: new Date(),
    })
    console.log('User profile updated:', uid)
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}

export default adminApp