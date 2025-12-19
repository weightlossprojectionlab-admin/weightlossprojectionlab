/**
 * Admin Documents API
 *
 * Centralized document management across all family members
 * GET: Fetch all documents with optional filters
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import type { PatientDocument } from '@/types/medical'

export async function GET(request: NextRequest) {
  try {
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get all patients for this user (fetch all first, filter deleted later)
    const patientsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .get()

    const patients = patientsSnapshot.docs
      .map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          type: data.type,
          photo: data.photo,
          deletedAt: data.deletedAt
        }
      })
      .filter(p => p.name && !p.deletedAt) // Ensure patient has a name and is not deleted

    // Filter patients if patientId provided
    const targetPatients = patientId
      ? patients.filter(p => p.id === patientId)
      : patients

    // Fetch documents for each patient
    const allDocuments: (PatientDocument & {
      patientName: string
      patientId: string
      patientPhoto?: string
      patientType: string
    })[] = []

    // Use a Set to track unique document IDs
    const seenDocIds = new Set<string>()

    for (const patient of targetPatients) {
      let query: any = adminDb
        .collection('users')
        .doc(userId)
        .collection('patients')
        .doc(patient.id)
        .collection('documents')
        .orderBy('uploadedAt', 'desc')

      // Apply filters
      if (category) {
        query = query.where('category', '==', category)
      }
      if (startDate) {
        query = query.where('uploadedAt', '>=', startDate)
      }
      if (endDate) {
        query = query.where('uploadedAt', '<=', endDate)
      }

      const docsSnapshot = await query.limit(limit).get()

      docsSnapshot.docs.forEach((doc: any) => {
        const docData = doc.data()

        // Skip deleted documents
        if (docData.deletedAt) {
          return
        }

        // Create unique key combining patientId and docId to prevent duplicates
        const uniqueKey = `${patient.id}_${doc.id}`
        if (seenDocIds.has(uniqueKey)) {
          return
        }
        seenDocIds.add(uniqueKey)

        allDocuments.push({
          id: doc.id,
          patientId: patient.id,
          patientName: patient.name,
          patientPhoto: patient.photo,
          patientType: patient.type,
          ...docData
        } as any)
      })
    }

    // Sort by uploadedAt across all patients
    allDocuments.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )

    // Apply limit across all documents
    const limitedDocs = allDocuments.slice(0, limit)

    // Calculate stats
    const stats = {
      totalDocuments: allDocuments.length,
      byCategory: {} as Record<string, number>,
      byPatient: {} as Record<string, { count: number; name: string }>,
      totalStorageUsed: 0
    }

    allDocuments.forEach(doc => {
      // Category stats
      stats.byCategory[doc.category] = (stats.byCategory[doc.category] || 0) + 1

      // Patient stats
      if (!stats.byPatient[doc.patientId]) {
        stats.byPatient[doc.patientId] = { count: 0, name: doc.patientName }
      }
      stats.byPatient[doc.patientId].count++

      // Storage stats
      stats.totalStorageUsed += doc.fileSize || 0
    })

    return NextResponse.json({
      success: true,
      data: {
        documents: limitedDocs,
        patients,
        stats,
        total: allDocuments.length
      }
    })
  } catch (error: any) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}
