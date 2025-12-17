/**
 * Fix Stuck Documents API
 *
 * Admin endpoint to find and fix documents stuck in "processing" status
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Verify admin (check email or role)
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()

    // Simple admin check - you can enhance this
    if (!userData?.email?.includes('weightlossprojectionlab@gmail.com')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - admin only' },
        { status: 403 }
      )
    }

    console.log('[FIX-STUCK-DOCS] Starting cleanup...')

    // Get all users
    const usersSnapshot = await adminDb.collection('users').get()
    let totalFixed = 0
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const stuckDocuments: any[] = []

    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id

      // Get all patients
      const patientsSnapshot = await adminDb
        .collection('users')
        .doc(uid)
        .collection('patients')
        .get()

      for (const patientDoc of patientsSnapshot.docs) {
        const patientId = patientDoc.id

        // Get stuck documents
        const documentsSnapshot = await adminDb
          .collection('users')
          .doc(uid)
          .collection('patients')
          .doc(patientId)
          .collection('documents')
          .where('ocrStatus', '==', 'processing')
          .get()

        for (const doc of documentsSnapshot.docs) {
          const data = doc.data()
          const updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date(0)

          if (updatedAt < fiveMinutesAgo) {
            await doc.ref.update({
              ocrStatus: 'failed',
              ocrError: 'Processing timeout - please retry',
              updatedAt: new Date().toISOString()
            })

            totalFixed++
            stuckDocuments.push({
              documentId: doc.id,
              patientId,
              userId: uid,
              name: data.name || 'unnamed',
              stuckSince: updatedAt.toISOString()
            })

            console.log(`[FIX-STUCK-DOCS] Fixed: ${doc.id}`)
          }
        }
      }
    }

    console.log(`[FIX-STUCK-DOCS] Fixed ${totalFixed} document(s)`)

    return NextResponse.json({
      success: true,
      fixed: totalFixed,
      documents: stuckDocuments
    })
  } catch (error: any) {
    console.error('[FIX-STUCK-DOCS] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fix documents' },
      { status: 500 }
    )
  }
}
