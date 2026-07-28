import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { assertPatientAccess } from '@/lib/rbac-middleware'
import { logger } from '@/lib/logger'
import { dosesPerDayFor, describeDosage, type DosageSource } from '@/lib/medication-dosage'
import { notifyCareTeamOfEvent } from '@/lib/notify-care-team'

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
    const medicationRef = adminDb.collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .collection('medications').doc(medicationId)
    const medicationSnap = await medicationRef.get()

    if (!medicationSnap.exists) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 })
    }

    const medication = medicationSnap.data()!
    const now = takenAt ? new Date(takenAt) : new Date()

    // Log the dose in adherenceLogs subcollection
    await medicationRef.collection('adherenceLogs').add({
      takenAt: Timestamp.fromDate(now),
      loggedBy: userId,
      loggedAt: FieldValue.serverTimestamp(),
      notes: notes || null
    })

    // Adherence = share of expected doses taken in the last 30 days. Pass the whole
    // medication (not just the prose) so the structured frequencyCode wins when present.
    // Null result => leave adherenceRate absent rather than write a guess.
    const adherenceRate = await calculateAdherenceRate(
      ownerUserId,
      patientId,
      medicationId,
      medication as DosageSource
    )

    // Update the medication. The quantityRemaining decrement runs inside a
    // TRANSACTION: multiple caregivers can log a dose on the same account at the
    // same instant, and a plain read-modify-write loses decrements (each reads N
    // and writes N-1, so only one of the concurrent doses sticks). The
    // transaction re-reads and retries under contention, so every dose counts.
    // adherenceLogs.add above is already an atomic append.
    let quantityRemaining: number | undefined
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(medicationRef)
      const m = snap.data()
      if (!m) return

      let qr: number | undefined = m.quantityRemaining
      if (m.quantity && qr !== undefined) {
        qr = Math.max(0, qr - 1)
      } else if (m.quantity) {
        qr = parseInt(m.quantity) - 1
      }
      quantityRemaining = qr

      const updates: any = {
        lastTaken: Timestamp.fromDate(now),
        lastModified: FieldValue.serverTimestamp(),
      }
      if (qr !== undefined) {
        updates.quantityRemaining = qr
      }
      if (adherenceRate !== null) {
        updates.adherenceRate = adherenceRate
      } else if (m.adherenceRate !== undefined) {
        // The dosage isn't determinable, but a value is stored — it was fabricated by
        // the old default-to-1 parser. Remove it rather than let a stale wrong number
        // keep rendering as fact.
        updates.adherenceRate = FieldValue.delete()
      }
      tx.update(medicationRef, updates)
    })

    // Fetch updated medication
    const updatedSnap = await medicationRef.get()
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

    // Notify the rest of the care team (owner + other caregivers) that a dose
    // was given — "who gave the 6pm dose" — so nobody double-doses.
    const medName = medication.name || 'a medication'
    await notifyCareTeamOfEvent({
      patientId,
      ownerUserId,
      actorUserId: userId,
      type: 'medication_dose_logged',
      title: 'Dose given',
      action: `gave a dose of ${medName}`,
      actionUrl: `/patients/${patientId}?tab=medications`,
      metadata: { medicationId, medicationName: medName },
    })

    return NextResponse.json(updatedMedication)
  } catch (error: any) {
    logger.error('[LogDose] Error logging dose', error as Error)
    return NextResponse.json(
      { error: error.message || 'Failed to log dose' },
      { status: 500 }
    )
  }
}

/**
 * Calculate adherence rate based on expected doses vs actual doses in last 30 days.
 *
 * Returns null whenever the doses-per-day denominator isn't trustworthy — the caller
 * then leaves adherenceRate ABSENT rather than writing a fabricated number. (This
 * previously defaulted to 1 dose/day on any unparseable sig, so a med recorded as
 * "2" reported someone taking half their doses as 100% adherent.)
 */
async function calculateAdherenceRate(
  ownerUserId: string,
  patientId: string,
  medicationId: string,
  med: DosageSource
): Promise<number | null> {
  try {
    // Single source of truth — prefers the structured frequencyCode, falls back to
    // parsing the prose sig, and yields null rather than guessing.
    const expectedDosesPerDay = dosesPerDayFor(med)
    if (expectedDosesPerDay === null || expectedDosesPerDay <= 0) {
      logger.info('[LogDose] Skipping adherence — dosage not determinable', {
        medicationId,
        confidence: describeDosage(med).confidence,
      })
      return null
    }

    // Get adherence logs from last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const adherenceLogsRef = adminDb.collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .collection('medications').doc(medicationId)
      .collection('adherenceLogs')

    // For simplicity, we'll just count total logs
    // A more sophisticated implementation would query with date filters
    const snapshot = await adherenceLogsRef
      .where('takenAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
      .orderBy('takenAt', 'desc')
      .get()

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
