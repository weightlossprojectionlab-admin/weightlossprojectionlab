import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { UpdateUserProfileRequestSchema } from '@/lib/validations/user-profile'
// Error handling is done inline with logger and NextResponse
import { z } from 'zod'

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

    // DEBUG: Log medications and preferences to see what's in Firestore
    console.log('[GET Profile] Data in Firestore:', {
      'profile.medications': userData?.profile?.medications,
      'medications': userData?.medications,
      'preferences.vitalReminders': userData?.preferences?.vitalReminders,
      'hasProfile': !!userData?.profile,
      'profileKeys': userData?.profile ? Object.keys(userData.profile) : [],
      'preferencesKeys': userData?.preferences ? Object.keys(userData.preferences) : []
    })

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
    logger.error('[API /user-profile GET] Error fetching user profile', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch user profile' },
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

    // Basic validation for required fields (email and name)
    // Note: Full profile validation happens on update
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

    // Create trial subscription for new users (30-day free trial)
    const now = new Date()
    const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

    const trialSubscription = {
      plan: 'single',
      billingInterval: 'monthly',
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      status: 'trialing',
      trialEndsAt: trialEnd,

      // Seat limits (Single User plan)
      maxSeats: 1,
      currentSeats: 0,
      maxExternalCaregivers: 0,
      currentExternalCaregivers: 0,
      maxPatients: 1,

      // No grandfathering for new users
      isGrandfathered: false,

      // No payment info yet (will be added when trial converts)
    }

    // Add onboarding tracking fields to profile object
    const profileWithOnboarding = {
      ...userProfileData,
      profile: {
        onboardingCompleted: false,
        currentOnboardingStep: 1
      },
      subscription: trialSubscription  // Add trial subscription
    }

    // Save to Firestore with onboarding fields and trial subscription
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
    logger.error('[API /user-profile POST] Error creating user profile', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create user profile' },
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

    // Parse and validate request body
    const body = await request.json()

    // DEBUG: Log incoming data to see what's being sent
    console.log('[UserProfile API] Incoming body:', JSON.stringify(body, null, 2))

    // Validate with Zod
    const validatedData = UpdateUserProfileRequestSchema.parse(body)

    const updateData: any = { ...validatedData }

    // Convert date strings to Date objects
    // Handle nested structure from onboarding { profile: {...}, goals: {...}, preferences: {...} }
    if (updateData.goals?.targetDate) {
      updateData.goals.targetDate = new Date(updateData.goals.targetDate)
    }
    if (updateData.profile?.onboardingCompletedAt) {
      updateData.profile.onboardingCompletedAt = new Date(updateData.profile.onboardingCompletedAt)
    }
    if (updateData.profile?.birthDate) {
      updateData.profile.birthDate = new Date(updateData.profile.birthDate)
    }
    // Handle flat structure (legacy) - birthDate at top level
    if (updateData.birthDate && !updateData.profile) {
      updateData.birthDate = new Date(updateData.birthDate)
    }
    if (updateData.onboardingCompletedAt && !updateData.profile) {
      updateData.onboardingCompletedAt = new Date(updateData.onboardingCompletedAt)
    }

    // Always update lastActiveAt
    updateData.lastActiveAt = new Date()

    // Recursive function to flatten nested objects with dot notation
    // This ensures Firestore update() properly merges deeply nested objects
    // IMPORTANT: Arrays are NOT flattened - they are set as complete values
    function flattenObject(obj: any, prefix: string = ''): Record<string, any> {
      const flattened: Record<string, any> = {}

      Object.keys(obj).forEach(key => {
        const value = obj[key]
        const newKey = prefix ? `${prefix}.${key}` : key

        // DEBUG: Log each key being processed
        console.log(`[flattenObject] Processing key: ${newKey}, type: ${typeof value}, isArray: ${Array.isArray(value)}, isNull: ${value === null}, isDate: ${value instanceof Date}, prototype: ${value !== null && typeof value === 'object' ? Object.getPrototypeOf(value)?.constructor?.name : 'N/A'}`)

        // Arrays should be set as complete values, not flattened
        // This is critical for fields like medications, healthConditions, etc.
        if (Array.isArray(value)) {
          flattened[newKey] = value
          console.log(`[flattenObject] Set array: ${newKey}`)
        }
        // If value is a plain object (not Date, not Array, not null), recurse
        else if (
          value !== null &&
          typeof value === 'object' &&
          !(value instanceof Date) &&
          Object.getPrototypeOf(value) === Object.prototype
        ) {
          console.log(`[flattenObject] Recursing into object: ${newKey}`)
          Object.assign(flattened, flattenObject(value, newKey))
        }
        // Primitive values, Dates, null, etc.
        else {
          flattened[newKey] = value
          console.log(`[flattenObject] Set primitive/Date: ${newKey} = ${value}`)
        }
      })

      return flattened
    }

    // Convert nested objects to Firestore dot notation for deep merge
    // This prevents shallow merge from overwriting entire nested objects
    const flattenedUpdate: any = {}

    // Handle profile object with recursive flattening
    if (updateData.profile) {
      console.log('[PUT Profile] About to flatten profile:', JSON.stringify(updateData.profile, null, 2))
      const profileFlattened = flattenObject(updateData.profile, 'profile')
      console.log('[PUT Profile] Profile after flattening:', JSON.stringify(profileFlattened, null, 2))
      Object.assign(flattenedUpdate, profileFlattened)
    }

    // Handle goals object with recursive flattening
    if (updateData.goals) {
      Object.assign(flattenedUpdate, flattenObject(updateData.goals, 'goals'))
    }

    // Handle preferences object with recursive flattening
    if (updateData.preferences) {
      console.log('[PUT Profile] ========== About to flatten preferences ==========')
      console.log('[PUT Profile] Preferences object:', JSON.stringify(updateData.preferences, null, 2))
      const preferencesFlattened = flattenObject(updateData.preferences, 'preferences')
      console.log('[PUT Profile] ========== Preferences after flattening ==========')
      console.log('[PUT Profile] Flattened result:', JSON.stringify(preferencesFlattened, null, 2))
      Object.assign(flattenedUpdate, preferencesFlattened)
    }

    // Add top-level fields
    Object.keys(updateData).forEach(key => {
      if (!['profile', 'goals', 'preferences'].includes(key)) {
        flattenedUpdate[key] = updateData[key]
      }
    })

    // DEBUG: Log what we're about to save
    console.log('[PUT Profile] Flattened update to save:', JSON.stringify(flattenedUpdate, null, 2))

    // Update user profile in Firestore
    // Try update() first (for existing docs), fallback to set() with merge (for new docs or missing parent objects)
    try {
      await adminDb.collection('users').doc(userId).update(flattenedUpdate)
      console.log('[PUT Profile] update() succeeded')

      // Return success response
      return NextResponse.json({
        success: true,
        message: 'User profile updated successfully'
      })
    } catch (updateError: any) {
      logger.error('[API /user-profile PUT] Error updating user profile', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message || 'Failed to update user profile' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    logger.error('[API /user-profile PUT] Error in PUT handler', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user profile' },
      { status: 500 }
    )
  }
}