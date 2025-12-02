import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

interface StepLog {
  steps: number
  date: string // YYYY-MM-DD format
  source: 'device' | 'health-app' | 'manual' | 'apple-health' | 'google-fit'
  loggedAt: Timestamp
  goal?: number
  notes?: string
}

// GET - Retrieve step logs for authenticated user
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
    const source = searchParams.get('source')

    // Build Firestore query
    const stepLogsRef = adminDb.collection('users').doc(userId).collection('stepLogs')
    let queryRef = stepLogsRef.orderBy('date', 'desc')

    // Add filters if provided
    if (startDate) {
      queryRef = queryRef.where('date', '>=', startDate)
    }
    if (endDate) {
      queryRef = queryRef.where('date', '<=', endDate)
    }
    if (source) {
      queryRef = queryRef.where('source', '==', source)
    }

    // Limit results
    queryRef = queryRef.limit(limit)

    // Execute query
    const snapshot = await queryRef.get()
    const stepLogs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      loggedAt: doc.data().loggedAt.toDate().toISOString()
    }))

    return NextResponse.json({
      success: true,
      data: stepLogs,
      count: stepLogs.length
    })

  } catch (error) {
    return errorResponse(error, {
      route: '/api/step-logs',
      operation: 'fetch'
    })
  }
}

// POST - Create new step log
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
    const { steps, date, source, goal, notes, loggedAt } = body

    // Validate required fields
    if (steps === undefined || steps === null) {
      return NextResponse.json(
        { error: 'Steps count is required' },
        { status: 400 }
      )
    }

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required (YYYY-MM-DD format)' },
        { status: 400 }
      )
    }

    // Validate steps is a non-negative number
    if (typeof steps !== 'number' || steps < 0) {
      return NextResponse.json(
        { error: 'Steps must be a non-negative number' },
        { status: 400 }
      )
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Date must be in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    // Validate source
    const validSources = ['device', 'health-app', 'manual', 'apple-health', 'google-fit']
    const stepSource = source || 'manual'
    if (!validSources.includes(stepSource)) {
      return NextResponse.json(
        { error: 'Invalid source. Must be one of: ' + validSources.join(', ') },
        { status: 400 }
      )
    }

    // Get stepLogs collection reference
    const stepLogsRef = adminDb.collection('users').doc(userId).collection('stepLogs')

    // Check if step log already exists for this date
    const existingLogQuery = stepLogsRef
      .where('date', '==', date)
      .where('source', '==', stepSource)
      .limit(1)

    const existingSnapshot = await existingLogQuery.get()
    if (!existingSnapshot.empty) {
      // Update existing log instead of creating duplicate
      const existingDoc = existingSnapshot.docs[0]
      const updateData = {
        steps,
        goal: goal || undefined,
        notes: notes || undefined,
        loggedAt: loggedAt ? Timestamp.fromDate(new Date(loggedAt)) : Timestamp.now()
      }

      await existingDoc.ref.update(updateData)

      const updatedLog = {
        id: existingDoc.id,
        date,
        source: stepSource,
        ...updateData,
        loggedAt: updateData.loggedAt.toDate().toISOString()
      }

      return NextResponse.json({
        success: true,
        data: updatedLog,
        message: 'Step log updated successfully'
      })
    }

    // Create step log data
    const stepLogData: StepLog = {
      steps,
      date,
      source: stepSource,
      loggedAt: loggedAt ? Timestamp.fromDate(new Date(loggedAt)) : Timestamp.now(),
      goal: goal || undefined,
      notes: notes || undefined
    }

    // Add to Firestore
    const docRef = await stepLogsRef.add(stepLogData)

    // Return the created log with the ID
    const createdLog = {
      id: docRef.id,
      ...stepLogData,
      loggedAt: stepLogData.loggedAt.toDate().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: createdLog,
      message: 'Step log created successfully'
    }, { status: 201 })

  } catch (error) {
    return errorResponse(error, {
      route: '/api/step-logs',
      operation: 'create'
    })
  }
}