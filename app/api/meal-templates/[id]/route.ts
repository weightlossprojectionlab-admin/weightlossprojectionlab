import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

// DELETE - Delete a meal template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15 requirement)
    const { id: templateId } = await params

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    const templateRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('mealTemplates')
      .doc(templateId)

    const templateDoc = await templateRef.get()

    if (!templateDoc.exists) {
      return NextResponse.json(
        { error: 'Meal template not found' },
        { status: 404 }
      )
    }

    await templateRef.delete()

    return NextResponse.json({
      success: true,
      message: 'Meal template deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting meal template:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete meal template',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// PUT - Increment usage count when template is used
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15 requirement)
    const { id: templateId } = await params

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    const templateRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('mealTemplates')
      .doc(templateId)

    const templateDoc = await templateRef.get()

    if (!templateDoc.exists) {
      return NextResponse.json(
        { error: 'Meal template not found' },
        { status: 404 }
      )
    }

    // Increment usage count and update lastUsed
    await templateRef.update({
      usageCount: (templateDoc.data()?.usageCount || 0) + 1,
      lastUsed: Timestamp.now()
    })

    const updatedDoc = await templateRef.get()
    const updatedData = updatedDoc.data()

    return NextResponse.json({
      success: true,
      data: {
        id: updatedDoc.id,
        ...updatedData,
        createdAt: updatedData?.createdAt?.toDate?.()?.toISOString() || updatedData?.createdAt,
        lastUsed: updatedData?.lastUsed?.toDate?.()?.toISOString() || updatedData?.lastUsed
      },
      message: 'Template usage recorded'
    })

  } catch (error) {
    console.error('Error updating meal template:', error)
    return NextResponse.json(
      {
        error: 'Failed to update meal template',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
