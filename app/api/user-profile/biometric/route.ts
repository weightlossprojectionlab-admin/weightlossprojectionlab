import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import type { BiometricCredential } from '@/types'

// Helper to get device info from user agent
function getDeviceInfo(userAgent: string): string {
  const ua = userAgent.toLowerCase()

  if (ua.includes('iphone')) return 'iPhone - Safari'
  if (ua.includes('ipad')) return 'iPad - Safari'
  if (ua.includes('android')) return 'Android - Chrome'
  if (ua.includes('macintosh')) return 'Mac - Safari'
  if (ua.includes('windows')) return 'Windows - Chrome'

  return 'Unknown Device'
}

// POST: Add new biometric credential
export async function POST(request: NextRequest) {
  try {
    // Verify Firebase Auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse request body
    const body = await request.json()
    const { credentialId } = body

    if (!credentialId || typeof credentialId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid credential ID' },
        { status: 400 }
      )
    }

    // Get device info from user agent
    const userAgent = request.headers.get('user-agent') || ''
    const deviceInfo = getDeviceInfo(userAgent)

    // Create new credential object
    const newCredential = {
      id: credentialId,
      deviceInfo,
      createdAt: new Date(),
    }

    // Get current user profile
    const userRef = adminDb.collection('users').doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    const existingCredentials: BiometricCredential[] = userData?.biometricCredentials || []

    // Check for duplicate credential ID
    if (existingCredentials.some(cred => cred.id === credentialId)) {
      return NextResponse.json(
        { error: 'This credential is already registered' },
        { status: 409 }
      )
    }

    // Add new credential to array
    const updatedCredentials = [...existingCredentials, newCredential]

    // Update Firestore
    await userRef.update({
      biometricCredentials: updatedCredentials,
      primaryAuthMethod: 'biometric', // Set biometric as primary auth method
      'preferences.biometricEnabled': true,
      lastActiveAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      credential: newCredential,
      message: 'Biometric credential registered successfully',
    })

  } catch (error: any) {
    console.error('Error registering biometric credential:', error)

    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'Authentication token expired' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to register biometric credential' },
      { status: 500 }
    )
  }
}

// GET: Retrieve user's biometric credentials
export async function GET(request: NextRequest) {
  try {
    // Verify Firebase Auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Get user profile
    const userRef = adminDb.collection('users').doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    const credentials: BiometricCredential[] = userData?.biometricCredentials || []

    return NextResponse.json({
      success: true,
      credentials,
      count: credentials.length,
    })

  } catch (error: any) {
    console.error('Error fetching biometric credentials:', error)

    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'Authentication token expired' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch biometric credentials' },
      { status: 500 }
    )
  }
}

// DELETE: Remove a biometric credential
export async function DELETE(request: NextRequest) {
  try {
    // Verify Firebase Auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse request body
    const body = await request.json()
    const { credentialId } = body

    if (!credentialId || typeof credentialId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid credential ID' },
        { status: 400 }
      )
    }

    // Get current user profile
    const userRef = adminDb.collection('users').doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    const existingCredentials: BiometricCredential[] = userData?.biometricCredentials || []

    // Remove the credential
    const updatedCredentials = existingCredentials.filter(cred => cred.id !== credentialId)

    // Check if credential was found
    if (updatedCredentials.length === existingCredentials.length) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      )
    }

    // Update Firestore
    const updateData: any = {
      biometricCredentials: updatedCredentials,
      lastActiveAt: new Date(),
    }

    // If no credentials left, disable biometric auth
    if (updatedCredentials.length === 0) {
      updateData.primaryAuthMethod = 'email'
      updateData['preferences.biometricEnabled'] = false
    }

    await userRef.update(updateData)

    return NextResponse.json({
      success: true,
      message: 'Biometric credential removed successfully',
      remainingCredentials: updatedCredentials.length,
    })

  } catch (error: any) {
    console.error('Error removing biometric credential:', error)

    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'Authentication token expired' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to remove biometric credential' },
      { status: 500 }
    )
  }
}

// PATCH: Update last used timestamp for a credential
export async function PATCH(request: NextRequest) {
  try {
    // Verify Firebase Auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse request body
    const body = await request.json()
    const { credentialId } = body

    if (!credentialId || typeof credentialId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid credential ID' },
        { status: 400 }
      )
    }

    // Get current user profile
    const userRef = adminDb.collection('users').doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    const existingCredentials: BiometricCredential[] = userData?.biometricCredentials || []

    // Find and update the credential
    const updatedCredentials = existingCredentials.map(cred => {
      if (cred.id === credentialId) {
        return { ...cred, lastUsed: new Date() }
      }
      return cred
    })

    // Check if credential was found
    const wasUpdated = updatedCredentials.some(cred =>
      cred.id === credentialId && cred.lastUsed
    )

    if (!wasUpdated) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      )
    }

    // Update Firestore
    await userRef.update({
      biometricCredentials: updatedCredentials,
      lastActiveAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: 'Credential last used timestamp updated',
    })

  } catch (error: any) {
    console.error('Error updating biometric credential:', error)

    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'Authentication token expired' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update biometric credential' },
      { status: 500 }
    )
  }
}
