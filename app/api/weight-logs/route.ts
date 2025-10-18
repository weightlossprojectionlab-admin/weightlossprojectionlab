import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

interface WeightLog {
  weight: number
  unit: 'kg' | 'lbs'
  loggedAt: Timestamp
  notes?: string
  source: 'manual' | 'scale' | 'import'
}

// GET - Retrieve weight logs for authenticated user
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build Firestore query
    const weightLogsRef = adminDb.collection('users').doc(userId).collection('weightLogs')
    let queryRef = weightLogsRef.orderBy('loggedAt', 'desc')

    // Add date filters if provided
    if (startDate) {
      queryRef = queryRef.where('loggedAt', '>=', new Date(startDate))
    }
    if (endDate) {
      queryRef = queryRef.where('loggedAt', '<=', new Date(endDate))
    }

    // Limit results
    queryRef = queryRef.limit(limit)

    // Execute query
    const snapshot = await queryRef.get()
    const weightLogs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      loggedAt: doc.data().loggedAt.toDate().toISOString()
    }))

    return NextResponse.json({
      success: true,
      data: weightLogs,
      count: weightLogs.length
    })

  } catch (error) {
    console.error('Error fetching weight logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weight logs' },
      { status: 500 }
    )
  }
}

// POST - Create new weight log
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
    const { weight, unit, notes, loggedAt } = body

    // Validate required fields
    if (!weight || !unit) {
      return NextResponse.json(
        { error: 'Weight and unit are required' },
        { status: 400 }
      )
    }

    // Validate unit
    if (!['kg', 'lbs'].includes(unit)) {
      return NextResponse.json(
        { error: 'Unit must be either kg or lbs' },
        { status: 400 }
      )
    }

    // Validate weight is a positive number
    if (typeof weight !== 'number' || weight <= 0) {
      return NextResponse.json(
        { error: 'Weight must be a positive number' },
        { status: 400 }
      )
    }

    // Create weight log data
    const weightLogData: WeightLog = {
      weight,
      unit,
      loggedAt: loggedAt ? Timestamp.fromDate(new Date(loggedAt)) : Timestamp.now(),
      notes: notes || undefined,
      source: 'manual'
    }

    // Add to Firestore
    const weightLogsRef = adminDb.collection('users').doc(userId).collection('weightLogs')
    const docRef = await weightLogsRef.add(weightLogData)

    // Return the created log with the ID
    const createdLog = {
      id: docRef.id,
      ...weightLogData,
      loggedAt: weightLogData.loggedAt.toDate().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: createdLog,
      message: 'Weight log created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating weight log:', error)
    return NextResponse.json(
      { error: 'Failed to create weight log' },
      { status: 500 }
    )
  }
}