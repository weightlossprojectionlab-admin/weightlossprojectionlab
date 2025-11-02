import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { logger } from '@/lib/logger'
import { ErrorHandler } from '@/lib/utils/error-handler'
import {
  CreateWeightLogRequestSchema,
  GetWeightLogsQuerySchema,
} from '@/lib/validations/weight-logs'
import { z } from 'zod'

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

    // Get and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      limit: searchParams.get('limit'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    }

    // Validate with Zod
    const validatedQuery = GetWeightLogsQuerySchema.parse(queryParams)

    // Build Firestore query
    const weightLogsRef = adminDb.collection('users').doc(userId).collection('weightLogs')
    let queryRef = weightLogsRef.orderBy('loggedAt', 'desc')

    // Add date filters if provided
    if (validatedQuery.startDate) {
      queryRef = queryRef.where('loggedAt', '>=', new Date(validatedQuery.startDate))
    }
    if (validatedQuery.endDate) {
      queryRef = queryRef.where('loggedAt', '<=', new Date(validatedQuery.endDate))
    }

    // Limit results
    queryRef = queryRef.limit(validatedQuery.limit)

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
    ErrorHandler.handle(error, {
      operation: 'fetch_weight_logs',
      component: 'api/weight-logs',
      userId: 'unknown'
    })

    const userMessage = ErrorHandler.getUserMessage(error)
    return NextResponse.json(
      { error: userMessage },
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

    // Parse and validate request body
    const body = await request.json()

    // Validate with Zod
    const validatedData = CreateWeightLogRequestSchema.parse(body)

    const { weight, unit, notes, loggedAt, dataSource, photoUrl, scaleDeviceId } = validatedData

    // Create weight log data
    const weightLogData: any = {
      weight,
      unit,
      loggedAt: loggedAt ? Timestamp.fromDate(new Date(loggedAt)) : Timestamp.now(),
      dataSource,
    }

    // Add optional fields
    if (notes) weightLogData.notes = notes
    if (photoUrl) weightLogData.photoUrl = photoUrl
    if (scaleDeviceId) weightLogData.scaleDeviceId = scaleDeviceId

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
    ErrorHandler.handle(error, {
      operation: 'create_weight_log',
      component: 'api/weight-logs',
      userId: 'unknown'
    })

    const userMessage = ErrorHandler.getUserMessage(error)
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    )
  }
}