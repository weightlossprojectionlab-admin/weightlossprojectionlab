import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

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
    return errorResponse(error, {
      route: '/api/meal-templates',
      operation: 'fetch'
    })
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

    // Don't include `notes` at all when it's empty — Firestore Admin
    // SDK rejects literal `undefined` in document data (without
    // ignoreUndefinedProperties). The previous `notes: notes || undefined`
    // was self-defeating: it set the key to undefined, which is exactly
    // what Firestore rejects. Conditional assignment keeps the document
    // shape clean when notes weren't provided.
    const templateData: Record<string, unknown> = {
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
      usageCount: 0,
      createdAt: Timestamp.now()
    }
    if (notes) templateData.notes = notes

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
    return errorResponse(error, {
      route: '/api/meal-templates',
      operation: 'create'
    })
  }
}
