/**
 * Individual Provider API
 *
 * GET /api/providers/[providerId] - Get provider details
 * PUT /api/providers/[providerId] - Update provider
 * DELETE /api/providers/[providerId] - Delete provider
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { providerFormSchema } from '@/lib/validations/medical'
import type { Provider } from '@/types/medical'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params

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

    const providerRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('providers')
      .doc(providerId)

    const providerDoc = await providerRef.get()

    if (!providerDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Provider not found' },
        { status: 404 }
      )
    }

    const provider: Provider = {
      id: providerDoc.id,
      ...providerDoc.data()
    } as Provider

    return NextResponse.json({
      success: true,
      data: provider
    })
  } catch (error: any) {
    console.error('Error fetching provider:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch provider' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params

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

    const providerRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('providers')
      .doc(providerId)

    const providerDoc = await providerRef.get()

    if (!providerDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Provider not found' },
        { status: 404 }
      )
    }

    // Parse and validate updates
    const body = await request.json()
    const validatedData = providerFormSchema.partial().parse(body)

    await providerRef.update(validatedData)

    const updatedDoc = await providerRef.get()
    const updatedProvider: Provider = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as Provider

    console.log(`Provider updated: ${providerId}`)

    return NextResponse.json({
      success: true,
      data: updatedProvider,
      message: 'Provider updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating provider:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid provider data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update provider' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params

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

    const providerRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('providers')
      .doc(providerId)

    const providerDoc = await providerRef.get()

    if (!providerDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Provider not found' },
        { status: 404 }
      )
    }

    await providerRef.delete()

    console.log(`Provider deleted: ${providerId}`)

    return NextResponse.json({
      success: true,
      message: 'Provider deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting provider:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete provider' },
      { status: 500 }
    )
  }
}
