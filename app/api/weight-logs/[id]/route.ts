import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { logger } from '@/lib/logger'
import { ErrorHandler } from '@/lib/utils/error-handler'
import { z } from 'zod'

// Validation schema for updating weight log
const UpdateWeightLogSchema = z.object({
  weight: z.number().min(20).max(1000).optional(),
  unit: z.enum(['kg', 'lbs']).optional(),
  notes: z.string().optional(),
  loggedAt: z.string().datetime().optional(),
})

// PATCH - Update weight log
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    const validatedData = UpdateWeightLogSchema.parse(body)

    // Build update object
    const updateData: any = {}
    if (validatedData.weight !== undefined) updateData.weight = validatedData.weight
    if (validatedData.unit !== undefined) updateData.unit = validatedData.unit
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes
    if (validatedData.loggedAt !== undefined) {
      updateData.loggedAt = Timestamp.fromDate(new Date(validatedData.loggedAt))
    }

    // Update in Firestore
    const weightLogRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('weightLogs')
      .doc(id)

    // Check if document exists and belongs to user
    const doc = await weightLogRef.get()
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Weight log not found' },
        { status: 404 }
      )
    }

    await weightLogRef.update(updateData)

    // Fetch updated document
    const updatedDoc = await weightLogRef.get()
    const updatedData = updatedDoc.data()

    return NextResponse.json({
      success: true,
      data: {
        id: updatedDoc.id,
        ...updatedData,
        loggedAt: updatedData?.loggedAt?.toDate().toISOString()
      },
      message: 'Weight log updated successfully'
    })

  } catch (error) {
    ErrorHandler.handle(error, {
      operation: 'update_weight_log',
      component: 'api/weight-logs/[id]',
      userId: 'unknown'
    })

    const userMessage = ErrorHandler.getUserMessage(error)
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    )
  }
}

// DELETE - Delete weight log
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Delete from Firestore
    const weightLogRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('weightLogs')
      .doc(id)

    // Check if document exists and belongs to user
    const doc = await weightLogRef.get()
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Weight log not found' },
        { status: 404 }
      )
    }

    await weightLogRef.delete()

    logger.info('Weight log deleted', { userId, weightLogId: id })

    return NextResponse.json({
      success: true,
      message: 'Weight log deleted successfully'
    })

  } catch (error) {
    ErrorHandler.handle(error, {
      operation: 'delete_weight_log',
      component: 'api/weight-logs/[id]',
      userId: 'unknown'
    })

    const userMessage = ErrorHandler.getUserMessage(error)
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    )
  }
}
