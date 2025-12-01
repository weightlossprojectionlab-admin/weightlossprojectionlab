/**
 * Providers API
 *
 * GET /api/providers - List all providers (optionally filter by patient)
 * POST /api/providers - Create a new provider
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { providerFormSchema } from '@/lib/validations/medical'
import type { Provider } from '@/types/medical'
import { errorResponse } from '@/lib/api-response'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    const providersRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('providers')

    const snapshot = await providersRef.get()
    let providers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Provider[]

    // Filter by patient if specified
    if (patientId) {
      providers = providers.filter(p => p.patientsServed.includes(patientId))
    }

    return NextResponse.json({
      success: true,
      data: providers
    })
  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/providers',
      operation: 'fetch'
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse and validate request body
    const body = await request.json()
    console.log('[API Providers POST] Raw body:', body)

    // Transform empty strings and clean data - omit undefined values entirely
    const cleanedBody = Object.entries(body).reduce((acc, [key, value]) => {
      // Skip empty strings entirely (don't include in object)
      if (value === '' || value === null || value === undefined) {
        return acc
      }

      // Normalize phone/fax numbers - strip formatting, keep digits only
      if ((key === 'phone' || key === 'fax') && typeof value === 'string') {
        const digitsOnly = value.replace(/\D/g, '') // Remove all non-digits
        if (digitsOnly.length > 0) {
          acc[key] = digitsOnly
        }
        // If no digits, don't include the field at all
        return acc
      }

      acc[key] = value
      return acc
    }, {} as any)

    console.log('[API Providers POST] Cleaned body:', cleanedBody)

    const validatedData = providerFormSchema.parse(cleanedBody)
    console.log('[API Providers POST] Validated data:', validatedData)

    // Create provider
    const providerId = uuidv4()
    const now = new Date().toISOString()

    const provider = {
      id: providerId,
      userId,
      ...validatedData,
      patientsServed: [],
      addedAt: now
    } as Provider

    const providerRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('providers')
      .doc(providerId)

    await providerRef.set(provider)

    console.log(`Provider created: ${providerId} for user ${userId}`)

    return NextResponse.json({
      success: true,
      data: provider,
      message: 'Provider created successfully'
    })
  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/providers',
      operation: 'create'
    })
  }
}
