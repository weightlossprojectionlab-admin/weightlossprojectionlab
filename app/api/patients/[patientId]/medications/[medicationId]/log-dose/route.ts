import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { assertPatientAccess } from '@/lib/rbac-middleware'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

/**
 * POST /api/patients/[patientId]/medications/[medicationId]/log-dose
 *
 * Log a medication dose as taken
 * Updates medication's lastTaken, quantityRemaining, and adherenceRate
 * Creates a log entry in adherenceLogs subcollection
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; medicationId: string }> }
) {
  try {
    const { patientId, medicationId } = await params

    // Check patient access with RBAC
    const authResult = await assertPatientAccess(request, patientId, 'editMedications')
    if (authResult instanceof Response) return authResult

    const { userId, ownerUserId } = authResult

    const body = await request.json()
    const { takenAt, notes } = body

    // Get the medication document
    const medicationRef = doc(db, `users/${ownerUserId}/patients/${patientId}/medications/${medicationId}`)
    const medicationSnap = await getDoc(medicationRef)

    if (!medicationSnap.exists()) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 })
    }

    const medication = medicationSnap.data()
    const now = takenAt ? new Date(takenAt) : new Date()

    // Calculate new quantity remaining (if quantity is tracked)
    let quantityRemaining = medication.quantityRemaining
    if (medication.quantity && quantityRemaining !== undefined) {
      quantityRemaining = Math.max(0, quantityRemaining - 1)
    } else if (medication.quantity) {
      // Initialize quantityRemaining if not set
      quantityRemaining = parseInt(medication.quantity) - 1
    }

    // Log the dose in adherenceLogs subcollection
    const adherenceLogsRef = collection(db, `users/${ownerUserId}/patients/${patientId}/medications/${medicationId}/adherenceLogs`)
    await addDoc(adherenceLogsRef, {
      takenAt: Timestamp.fromDate(now),
      loggedBy: userId,
      loggedAt: serverTimestamp(),
      notes: notes || null
    })

    // Calculate adherence rate (simplified: percentage of expected doses taken in last 30 days)
    // This is a simple implementation - can be enhanced later
    const adherenceRate = await calculateAdherenceRate(
      ownerUserId,
      patientId,
      medicationId,
      medication.frequency
    )

    // Update medication document
    const updates: any = {
      lastTaken: Timestamp.fromDate(now),
      lastModified: serverTimestamp()
    }

    if (quantityRemaining !== undefined) {
      updates.quantityRemaining = quantityRemaining
    }

    if (adherenceRate !== null) {
      updates.adherenceRate = adherenceRate
    }

    await updateDoc(medicationRef, updates)

    // Fetch updated medication
    const updatedSnap = await getDoc(medicationRef)
    const updatedMedication = {
      id: updatedSnap.id,
      ...updatedSnap.data(),
      lastTaken: updatedSnap.data()?.lastTaken?.toDate?.()?.toISOString() || updatedSnap.data()?.lastTaken,
      addedAt: updatedSnap.data()?.addedAt?.toDate?.()?.toISOString() || updatedSnap.data()?.addedAt,
      lastModified: updatedSnap.data()?.lastModified?.toDate?.()?.toISOString() || updatedSnap.data()?.lastModified,
      fillDate: updatedSnap.data()?.fillDate?.toDate?.()?.toISOString() || updatedSnap.data()?.fillDate,
      expirationDate: updatedSnap.data()?.expirationDate?.toDate?.()?.toISOString() || updatedSnap.data()?.expirationDate
    }

    logger.info('[LogDose] Dose logged successfully', {
      patientId,
      medicationId,
      quantityRemaining,
      adherenceRate
    })

    return NextResponse.json(updatedMedication)
  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/medications/[medicationId]/log-dose',
      operation: 'create'
    })
  }
}

/**
 * Calculate adherence rate based on expected doses vs actual doses in last 30 days
 */
async function calculateAdherenceRate(
  ownerUserId: string,
  patientId: string,
  medicationId: string,
  frequency?: string
): Promise<number | null> {
  try {
    // Parse frequency to determine expected doses per day
    const expectedDosesPerDay = parseFrequency(frequency)
    if (expectedDosesPerDay === null) {
      return null
    }

    // Get adherence logs from last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const adherenceLogsRef = collection(
      db,
      `users/${ownerUserId}/patients/${patientId}/medications/${medicationId}/adherenceLogs`
    )

    // For simplicity, we'll just count total logs
    // A more sophisticated implementation would query with date filters
    const { getDocs, query: firestoreQuery, where, orderBy } = await import('firebase/firestore')
    const q = firestoreQuery(
      adherenceLogsRef,
      where('takenAt', '>=', Timestamp.fromDate(thirtyDaysAgo)),
      orderBy('takenAt', 'desc')
    )

    const snapshot = await getDocs(q)
    const actualDoses = snapshot.size

    // Calculate expected doses (30 days * doses per day)
    const expectedDoses = 30 * expectedDosesPerDay

    // Calculate adherence percentage
    const adherenceRate = Math.min(100, (actualDoses / expectedDoses) * 100)

    return Math.round(adherenceRate * 10) / 10 // Round to 1 decimal place
  } catch (error) {
    logger.error('[LogDose] Error calculating adherence rate', error as Error)
    return null
  }
}

/**
 * Parse frequency string to determine expected doses per day
 * Examples:
 * - "once daily" -> 1
 * - "twice daily" -> 2
 * - "three times daily" -> 3
 * - "every 12 hours" -> 2
 * - "every 8 hours" -> 3
 */
function parseFrequency(frequency?: string): number | null {
  if (!frequency) return null

  const lower = frequency.toLowerCase()

  // Check for "once daily", "twice daily", etc.
  if (lower.includes('once') && lower.includes('daily')) return 1
  if (lower.includes('twice') && lower.includes('daily')) return 2
  if (lower.includes('three times') && lower.includes('daily')) return 3
  if (lower.includes('four times') && lower.includes('daily')) return 4

  // Check for "every X hours"
  const hoursMatch = lower.match(/every\s+(\d+)\s+hours?/)
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1])
    return Math.round(24 / hours)
  }

  // Check for "X times per day"
  const timesMatch = lower.match(/(\d+)\s+times?\s+(per|a)\s+day/)
  if (timesMatch) {
    return parseInt(timesMatch[1])
  }

  // Default to 1 if we can't parse
  return 1
}
