import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

// GET - Get all meal templates for the user
export async function GET(request: NextRequest) {
  try {
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

    const templatesRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('mealTemplates')
      .orderBy('usageCount', 'desc')
      .limit(50)

    const snapshot = await templatesRef.get()
    const templates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      lastUsed: doc.data().lastUsed?.toDate?.()?.toISOString() || doc.data().lastUsed
    }))

    return NextResponse.json({
      success: true,
      data: templates
    })

  } catch (error) {
    console.error('Error fetching meal templates:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch meal templates',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// POST - Create a new meal template
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { name, mealType, foodItems, calories, macros, notes } = body

    if (!name || !mealType || !foodItems || !calories || !macros) {
      return NextResponse.json(
        { error: 'Missing required fields: name, mealType, foodItems, calories, macros' },
        { status: 400 }
      )
    }

    const templateData = {
      name,
      mealType,
      foodItems,
      calories,
      macros: {
        protein: macros.protein || 0,
        carbs: macros.carbs || 0,
        fat: macros.fat || 0,
        fiber: macros.fiber || 0
      },
      notes: notes || undefined,
      usageCount: 0,
      createdAt: Timestamp.now()
    }

    const templateRef = await adminDb
      .collection('users')
      .doc(userId)
      .collection('mealTemplates')
      .add(templateData)

    const createdTemplate = await templateRef.get()
    const createdData = createdTemplate.data()

    return NextResponse.json({
      success: true,
      data: {
        id: createdTemplate.id,
        ...createdData,
        createdAt: createdData?.createdAt?.toDate?.()?.toISOString() || createdData?.createdAt
      },
      message: 'Meal template created successfully'
    })

  } catch (error) {
    console.error('Error creating meal template:', error)
    return NextResponse.json(
      {
        error: 'Failed to create meal template',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
