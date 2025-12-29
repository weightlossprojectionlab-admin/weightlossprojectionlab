/**
 * Auth Helper Functions
 *
 * Server-side authentication utilities for API routes
 */

import { NextRequest } from 'next/server'
import { auth as firebaseAdmin } from 'firebase-admin'
import { initializeApp, getApps, cert } from 'firebase-admin/app'

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
  }
}

/**
 * Verify admin access from request
 * Checks Firebase Auth token and custom claims
 */
export async function verifyAdmin(request: NextRequest): Promise<{
  isAdmin: boolean
  uid?: string
  email?: string
}> {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isAdmin: false }
    }

    const token = authHeader.split('Bearer ')[1]
    if (!token) {
      return { isAdmin: false }
    }

    // Verify the token
    const decodedToken = await firebaseAdmin().verifyIdToken(token)

    // Check for admin custom claim or super admin email
    const isAdmin =
      decodedToken.admin === true ||
      decodedToken.email === 'perriceconsulting@gmail.com' ||
      decodedToken.email === 'weightlossprojectionlab@gmail.com' ||
      decodedToken.uid === 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'

    return {
      isAdmin,
      uid: decodedToken.uid,
      email: decodedToken.email
    }
  } catch (error) {
    console.error('Error verifying admin:', error)
    return { isAdmin: false }
  }
}

/**
 * Verify authenticated user (not necessarily admin)
 */
export async function verifyAuth(request: NextRequest): Promise<{
  isAuthenticated: boolean
  uid?: string
  email?: string
}> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isAuthenticated: false }
    }

    const token = authHeader.split('Bearer ')[1]
    if (!token) {
      return { isAuthenticated: false }
    }

    const decodedToken = await firebaseAdmin().verifyIdToken(token)

    return {
      isAuthenticated: true,
      uid: decodedToken.uid,
      email: decodedToken.email
    }
  } catch (error) {
    console.error('Error verifying auth:', error)
    return { isAuthenticated: false }
  }
}
