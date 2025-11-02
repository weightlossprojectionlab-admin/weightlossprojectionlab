import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { adminStorage } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { generateSearchKeywords } from '@/lib/meal-title-utils'
import { logger } from '@/lib/logger'

// PUT - Update a specific meal log
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15 requirement)
    const { id: mealLogId } = await params

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

    if (!mealLogId) {
      return NextResponse.json(
        { error: 'Meal log ID is required' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { mealType, notes, aiAnalysis, manualEntries, title } = body

    // Validate meal type if provided
    if (mealType && !['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
      return NextResponse.json(
        { error: 'Invalid meal type' },
        { status: 400 }
      )
    }

    // Get the meal log document
    const mealLogRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('mealLogs')
      .doc(mealLogId)

    const mealLogDoc = await mealLogRef.get()

    if (!mealLogDoc.exists) {
      return NextResponse.json(
        { error: 'Meal log not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: any = {
      updatedAt: Timestamp.now()
    }

    if (mealType) updateData.mealType = mealType
    if (notes !== undefined) updateData.notes = notes
    if (aiAnalysis) updateData.aiAnalysis = aiAnalysis
    if (manualEntries) updateData.manualEntries = manualEntries
    if (title !== undefined) updateData.title = title

    // Regenerate search keywords if title or notes changed
    if (title !== undefined || notes !== undefined) {
      const currentData = mealLogDoc.data()
      const foodItems = currentData?.aiAnalysis?.foodItems || []
      const finalTitle = title !== undefined ? title : currentData?.title
      const finalNotes = notes !== undefined ? notes : currentData?.notes

      updateData.searchKeywords = generateSearchKeywords(foodItems, finalTitle, finalNotes)
    }

    // Recalculate totals if AI analysis or manual entries changed
    if (aiAnalysis || manualEntries) {
      let totalCalories = 0
      let macros = { carbs: 0, protein: 0, fat: 0 }

      if (aiAnalysis) {
        totalCalories += aiAnalysis.totalCalories || aiAnalysis.estimatedCalories || 0

        // Handle both totalMacros (new Gemini format) and macros (legacy format)
        const aiMacros = aiAnalysis.totalMacros || aiAnalysis.macros || {}
        macros.carbs += aiMacros.carbs || 0
        macros.protein += aiMacros.protein || 0
        macros.fat += aiMacros.fat || 0
      }

      if (manualEntries && manualEntries.length > 0) {
        const manualCalories = manualEntries.reduce((sum: number, entry: any) =>
          sum + (entry.calories || 0), 0)
        totalCalories += manualCalories
      }

      updateData.totalCalories = totalCalories
      updateData.macros = macros
    }

    // Update the document
    await mealLogRef.update(updateData)

    // Get updated document
    const updatedDoc = await mealLogRef.get()
    const updatedData = updatedDoc.data()

    return NextResponse.json({
      success: true,
      data: {
        id: updatedDoc.id,
        ...updatedData,
        loggedAt: updatedData?.loggedAt?.toDate?.()?.toISOString() || updatedData?.loggedAt,
        updatedAt: updatedData?.updatedAt?.toDate?.()?.toISOString() || updatedData?.updatedAt
      },
      message: 'Meal log updated successfully'
    })

  } catch (error) {
    logger.error('Error updating meal log', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      {
        error: 'Failed to update meal log',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete a specific meal log
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15 requirement)
    const { id: mealLogId } = await params

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

    if (!mealLogId) {
      return NextResponse.json(
        { error: 'Meal log ID is required' },
        { status: 400 }
      )
    }

    // Get the meal log document
    const mealLogRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('mealLogs')
      .doc(mealLogId)

    const mealLogDoc = await mealLogRef.get()

    if (!mealLogDoc.exists) {
      return NextResponse.json(
        { error: 'Meal log not found' },
        { status: 404 }
      )
    }

    const mealLogData = mealLogDoc.data()

    // Delete associated photo from Storage if it exists
    if (mealLogData?.photoUrl) {
      try {
        // Extract the storage path from the URL
        // photoUrl format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
        const urlMatch = mealLogData.photoUrl.match(/\/o\/(.+?)\?/)
        if (urlMatch && urlMatch[1]) {
          const storagePath = decodeURIComponent(urlMatch[1])
          const bucket = adminStorage.bucket()
          await bucket.file(storagePath).delete()
          logger.info('Deleted photo from Storage', { storagePath })
        }
      } catch (storageError) {
        logger.warn('Failed to delete photo from Storage', { error: storageError })
        // Continue with document deletion even if photo deletion fails
      }
    }

    // Delete the meal log document
    await mealLogRef.delete()

    return NextResponse.json({
      success: true,
      message: 'Meal log deleted successfully'
    })

  } catch (error) {
    logger.error('Error deleting meal log', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      {
        error: 'Failed to delete meal log',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
