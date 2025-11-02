import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

interface UserProfile {
  email: string
  name: string
  primaryAuthMethod: 'biometric' | 'email' | 'google'
  biometricFingerprints: string[]
  devices: Array<{
    id: string
    name: string
    type: string
    registeredAt: Date
  }>
  authProviders: ('email' | 'google.com')[]
  preferences: {
    units: {
      weight: 'kg' | 'lbs'
      height: 'cm' | 'in'
    }
    notifications: {
      dailyReminders: boolean
      weeklyReports: boolean
      achievements: boolean
    }
    privacy: {
      dataSharing: boolean
      analytics: boolean
    }
  }
  goals: {
    targetWeight?: number
    targetWeightUnit?: 'kg' | 'lbs'
    targetDate?: Date
    dailySteps?: number
    weeklyWeightLoss?: number
  }
  createdAt: Date
  lastActiveAt: Date
}

// GET - Get user profile
export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]

    // Verify the token and get user info
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get user profile from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    const userProfile = {
      id: userDoc.id,
      ...userData,
      createdAt: userData?.createdAt?.toDate?.()?.toISOString() || null,
      lastActiveAt: userData?.lastActiveAt?.toDate?.()?.toISOString() || null,
      goals: {
        ...userData?.goals,
        targetDate: userData?.goals?.targetDate?.toDate?.()?.toISOString() || null
      }
    }

    return NextResponse.json({
      success: true,
      data: userProfile
    })

  } catch (error: any) {
    logger.error('Error fetching user profile', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      {
        error: 'Failed to fetch user profile',
        details: error?.message || 'Unknown error',
        code: error?.code || 'UNKNOWN_ERROR'
      },
      { status: 500 }
    )
  }
}

// POST - Create user profile
export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]

    // Verify the token and get user info
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Parse request body
    const body = await request.json()
    const { email, name, preferences, goals } = body

    // Validate required fields
    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    // Check if user profile already exists
    const existingDoc = await adminDb.collection('users').doc(userId).get()
    if (existingDoc.exists) {
      return NextResponse.json(
        { error: 'User profile already exists' },
        { status: 409 }
      )
    }

    // Create default preferences if not provided
    const defaultPreferences = {
      units: {
        weight: 'lbs',
        height: 'in'
      },
      notifications: {
        dailyReminders: true,
        weeklyReports: true,
        achievements: true
      },
      privacy: {
        dataSharing: false,
        analytics: true
      }
    }

    // Determine auth provider from token
    const authProviders: ('email' | 'google.com')[] = []
    if (decodedToken.firebase?.sign_in_provider === 'google.com') {
      authProviders.push('google.com')
    } else {
      authProviders.push('email')
    }

    // Create user profile data with onboarding defaults
    const userProfileData: Partial<UserProfile> = {
      email,
      name,
      primaryAuthMethod: 'email', // Default, will be updated when biometrics are set up
      biometricFingerprints: [],
      devices: [],
      authProviders,
      preferences: { ...defaultPreferences, ...preferences },
      goals: goals || {},
      createdAt: new Date(),
      lastActiveAt: new Date()
    }

    // Add onboarding tracking fields to profile object
    const profileWithOnboarding = {
      ...userProfileData,
      profile: {
        onboardingCompleted: false,
        currentOnboardingStep: 1
      }
    }

    // Save to Firestore with onboarding fields
    await adminDb.collection('users').doc(userId).set(profileWithOnboarding)

    // Return the created profile
    const createdProfile = {
      id: userId,
      ...profileWithOnboarding,
      createdAt: profileWithOnboarding.createdAt?.toISOString(),
      lastActiveAt: profileWithOnboarding.lastActiveAt?.toISOString()
    }

    return NextResponse.json({
      success: true,
      data: createdProfile,
      message: 'User profile created successfully'
    }, { status: 201 })

  } catch (error: any) {
    logger.error('Error creating user profile', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      {
        error: 'Failed to create user profile',
        details: error?.message || 'Unknown error',
        code: error?.code || 'UNKNOWN_ERROR'
      },
      { status: 500 }
    )
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]

    // Verify the token and get user info
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Parse request body
    const body = await request.json()
    const updateData = { ...body }

    // Convert date strings to Date objects for goals
    if (updateData.goals?.targetDate) {
      updateData.goals.targetDate = new Date(updateData.goals.targetDate)
    }

    // Always update lastActiveAt
    updateData.lastActiveAt = new Date()

    // Update user profile in Firestore (use set with merge to create if doesn't exist)
    await adminDb.collection('users').doc(userId).set(updateData, { merge: true })

    // Get updated profile
    const updatedDoc = await adminDb.collection('users').doc(userId).get()
    const updatedData = updatedDoc.data()

    const updatedProfile = {
      id: userId,
      ...updatedData,
      createdAt: updatedData?.createdAt?.toDate?.()?.toISOString() || null,
      lastActiveAt: updatedData?.lastActiveAt?.toDate?.()?.toISOString() || null,
      goals: {
        ...updatedData?.goals,
        targetDate: updatedData?.goals?.targetDate?.toDate?.()?.toISOString() || null
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'User profile updated successfully'
    })

  } catch (error: any) {
    logger.error('Error updating user profile', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      {
        error: 'Failed to update user profile',
        details: error?.message || 'Unknown error',
        code: error?.code || 'UNKNOWN_ERROR'
      },
      { status: 500 }
    )
  }
}