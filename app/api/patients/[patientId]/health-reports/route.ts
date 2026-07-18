import { NextRequest, NextResponse } from 'next/server'
import { assertPatientAccess } from '@/lib/rbac-middleware'
import { healthReportOperations } from '@/lib/provider-operations'
import { logger } from '@/lib/logger'
import { adminDb } from '@/lib/firebase-admin'
import { errorResponse, notFoundResponse } from '@/lib/api-response'
import { Timestamp } from 'firebase-admin/firestore'
import { sendNotificationToFamilyMembers } from '@/lib/notification-service'
import { generateHealthSummary, type HealthSummaryInput } from '@/lib/health-summary-generator'
import { generateHealthReport } from '@/lib/health-report-generator'

/**
 * GET /api/patients/[patientId]/health-reports
 * Fetch health reports for a patient
 * Supports ?date=YYYY-MM-DD query param for specific date, or returns recent reports
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    // Check patient access
    const accessInfo = await assertPatientAccess(request, patientId, 'viewMedicalRecords')
    if (accessInfo instanceof Response) {
      return accessInfo
    }

    const { ownerUserId } = accessInfo

    logger.info('[Health Reports] Fetching reports', { patientId, date, ownerUserId })

    if (date) {
      // Fetch report for specific date
      const reportsRef = adminDb
        .collection('healthReports')

      const snapshot = await reportsRef
        .where('patientId', '==', patientId)
        .where('reportDate', '==', date)
        .limit(1)
        .get()

      if (snapshot.empty) {
        return NextResponse.json({
          success: true,
          report: null,
          message: `No report found for date ${date}`
        })
      }

      const reportDoc = snapshot.docs[0]
      const report = {
        id: reportDoc.id,
        ...reportDoc.data(),
        // Convert Firestore timestamps to ISO strings
        generatedAt: reportDoc.data().generatedAt?.toDate?.()?.toISOString() || reportDoc.data().generatedAt,
        lastViewedAt: reportDoc.data().lastViewedAt?.toDate?.()?.toISOString() || reportDoc.data().lastViewedAt
      }

      return NextResponse.json({
        success: true,
        report
      })
    } else {
      // Fetch recent reports (limit to 10 most recent)
      const reportsRef = adminDb
        .collection('healthReports')

      const snapshot = await reportsRef
        .where('patientId', '==', patientId)
        .orderBy('reportDate', 'desc')
        .limit(10)
        .get()

      const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamps to ISO strings
        generatedAt: doc.data().generatedAt?.toDate?.()?.toISOString() || doc.data().generatedAt,
        lastViewedAt: doc.data().lastViewedAt?.toDate?.()?.toISOString() || doc.data().lastViewedAt
      }))

      return NextResponse.json({
        success: true,
        reports,
        count: reports.length
      })
    }

  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/health-reports',
      operation: 'fetch',
      patientId: (await params).patientId
    })
  }
}

/**
 * POST /api/patients/[patientId]/health-reports
 * Generate a new health report or regenerate existing one
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    // Check patient access
    const accessInfo = await assertPatientAccess(request, patientId, 'viewMedicalRecords')
    if (accessInfo instanceof Response) {
      return accessInfo
    }

    const { userId, ownerUserId } = accessInfo

    // Parse request body
    const body = await request.json()
    const { reportDate, regenerate = false } = body

    // Use provided date or today's date in YYYY-MM-DD format
    const dateToUse = reportDate || new Date().toISOString().split('T')[0]

    logger.info('[Health Reports] Generating report', {
      patientId,
      reportDate: dateToUse,
      regenerate,
      userId,
      ownerUserId
    })

    // Fetch patient data
    const patientRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)

    const patientDoc = await patientRef.get()

    if (!patientDoc.exists) {
      return notFoundResponse('Patient')
    }

    const patientData = patientDoc.data()
    const patient = {
      id: patientDoc.id,
      ...patientData
    } as { id: string; name: string; [key: string]: any }

    // Fetch all patient data needed for the report
    const [vitalsSnap, mealsSnap, weightSnap, stepsSnap, medicationsSnap, documentsSnap] = await Promise.all([
      // Vitals
      adminDb
        .collection('users')
        .doc(ownerUserId)
        .collection('patients')
        .doc(patientId)
        .collection('vitals')
        .orderBy('recordedAt', 'desc')
        .limit(50)
        .get(),
      // Meals (today's meals)
      adminDb
        .collection('users')
        .doc(ownerUserId)
        .collection('patients')
        .doc(patientId)
        .collection('mealLogs')
        .where('date', '==', dateToUse)
        .get(),
      // Weight logs
      adminDb
        .collection('users')
        .doc(ownerUserId)
        .collection('patients')
        .doc(patientId)
        .collection('weightLogs')
        .orderBy('date', 'desc')
        .limit(30)
        .get(),
      // Steps logs
      adminDb
        .collection('users')
        .doc(ownerUserId)
        .collection('patients')
        .doc(patientId)
        .collection('stepLogs')
        .orderBy('date', 'desc')
        .limit(30)
        .get(),
      // Medications
      adminDb
        .collection('users')
        .doc(ownerUserId)
        .collection('patients')
        .doc(patientId)
        .collection('medications')
        .where('status', '==', 'active')
        .get(),
      // Documents
      adminDb
        .collection('users')
        .doc(ownerUserId)
        .collection('patients')
        .doc(patientId)
        .collection('documents')
        .orderBy('uploadedAt', 'desc')
        .limit(20)
        .get()
    ])

    const vitals = vitalsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      recordedAt: doc.data().recordedAt?.toDate?.()?.toISOString() || doc.data().recordedAt
    }))

    const todayMeals = mealsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    const weightData = weightSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    const stepsData = stepsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    const medications = medicationsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    const documents = documentsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Generate analysis + report via the shared generator (identical path to
    // /ai-health-report — one source of truth, no divergence).
    // Firestore reads are loosely typed; cast at the boundary (same as the
    // /ai-health-report path, which feeds untyped request JSON).
    const summaryInput: HealthSummaryInput = {
      patient: patient as HealthSummaryInput['patient'],
      medications: medications as HealthSummaryInput['medications'],
      vitals: vitals as HealthSummaryInput['vitals'],
      documents: documents as HealthSummaryInput['documents'],
      weightData: weightData as HealthSummaryInput['weightData'],
      stepsData: stepsData as HealthSummaryInput['stepsData'],
      todayMeals: todayMeals as HealthSummaryInput['todayMeals'],
    }
    const analyses = generateHealthSummary(summaryInput)
    const reportText = generateHealthReport({
      patient,
      age: analyses.age,
      isPet: analyses.isPet,
      species: analyses.species,
      weightAnalysis: analyses.weightAnalysis,
      activityAnalysis: analyses.activityAnalysis,
      nutritionAnalysis: analyses.nutritionAnalysis,
      vitalsAnalysis: analyses.vitalsAnalysis,
      medicationAnalysis: analyses.medicationAnalysis,
      documentAnalysis: analyses.documentAnalysis,
      petFeedingAnalysis: analyses.petFeedingAnalysis,
      petVaccinationAnalysis: analyses.petVaccinationAnalysis,
      documentsCount: documents?.length || 0,
      analyses,
    })

    // Get user name for attribution
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userName = userDoc.exists ? userDoc.data()?.name || userDoc.data()?.email : 'Unknown User'

    // Check if report already exists for this date
    const existingReportsSnap = await adminDb
      .collection('healthReports')
      .where('patientId', '==', patientId)
      .where('reportDate', '==', dateToUse)
      .limit(1)
      .get()

    let savedReport

    if (!existingReportsSnap.empty && regenerate) {
      // Update existing report
      const existingReportDoc = existingReportsSnap.docs[0]
      await existingReportDoc.ref.update({
        report: reportText,
        generatedBy: userId,
        generatedByName: userName,
        generatedAt: Timestamp.now(),
        includedData: {
          vitalsCount: vitals.length,
          mealsCount: todayMeals.length,
          weightLogsCount: weightData.length,
          stepsLogsCount: stepsData.length,
          medicationsCount: medications.length,
          documentsCount: documents.length
        }
      })

      savedReport = {
        id: existingReportDoc.id,
        patientId,
        patientName: patient.name,
        reportDate: dateToUse,
        report: reportText,
        generatedAt: new Date().toISOString(),
        generatedBy: userId,
        generatedByName: userName,
        includedData: {
          vitalsCount: vitals.length,
          mealsCount: todayMeals.length,
          weightLogsCount: weightData.length,
          stepsLogsCount: stepsData.length,
          medicationsCount: medications.length,
          documentsCount: documents.length
        }
      }

      logger.info('[Health Reports] Report regenerated', {
        reportId: existingReportDoc.id,
        patientId,
        reportDate: dateToUse
      })

      // Trigger notification to family members for regenerated report
      try {
        await sendNotificationToFamilyMembers({
          userId: '', // Will be overridden for each recipient
          patientId,
          type: 'health_report_generated',
          priority: 'normal',
          title: 'Health Report Regenerated',
          message: `${userName} regenerated a health report`,
          excludeUserId: userId,
          metadata: {
            reportId: existingReportDoc.id,
            generatedBy: userName,
            generatedByUserId: userId,
            patientName: patient.name,
            reportType: 'custom',
            dateRange: {
              start: dateToUse,
              end: dateToUse
            },
            includesVitals: true,
            includesMeals: true,
            includesWeight: true,
            includesMedications: true
          }
        })
      } catch (notificationError) {
        // Log error but don't fail the main operation
        logger.error('[Health Reports] Error sending notification for regenerated report', notificationError as Error, {
          patientId,
          reportId: existingReportDoc.id
        })
      }
    } else if (existingReportsSnap.empty) {
      // Create new report
      const reportRef = await adminDb.collection('healthReports').add({
        patientId,
        patientName: patient.name,
        reportDate: dateToUse,
        report: reportText,
        generatedAt: Timestamp.now(),
        generatedBy: userId,
        generatedByName: userName,
        includedData: {
          vitalsCount: vitals.length,
          mealsCount: todayMeals.length,
          weightLogsCount: weightData.length,
          stepsLogsCount: stepsData.length,
          medicationsCount: medications.length,
          documentsCount: documents.length
        },
        viewCount: 0,
        exportedCount: 0,
        emailedCount: 0
      })

      savedReport = {
        id: reportRef.id,
        patientId,
        patientName: patient.name,
        reportDate: dateToUse,
        report: reportText,
        generatedAt: new Date().toISOString(),
        generatedBy: userId,
        generatedByName: userName,
        includedData: {
          vitalsCount: vitals.length,
          mealsCount: todayMeals.length,
          weightLogsCount: weightData.length,
          stepsLogsCount: stepsData.length,
          medicationsCount: medications.length,
          documentsCount: documents.length
        },
        viewCount: 0,
        exportedCount: 0,
        emailedCount: 0
      }

      logger.info('[Health Reports] Report created', {
        reportId: reportRef.id,
        patientId,
        reportDate: dateToUse
      })

      // Trigger notification to family members for new report
      try {
        await sendNotificationToFamilyMembers({
          userId: '', // Will be overridden for each recipient
          patientId,
          type: 'health_report_generated',
          priority: 'normal',
          title: 'Health Report Generated',
          message: `${userName} generated a new health report`,
          excludeUserId: userId,
          metadata: {
            reportId: reportRef.id,
            generatedBy: userName,
            generatedByUserId: userId,
            patientName: patient.name,
            reportType: 'custom',
            dateRange: {
              start: dateToUse,
              end: dateToUse
            },
            includesVitals: true,
            includesMeals: true,
            includesWeight: true,
            includesMedications: true
          }
        })
      } catch (notificationError) {
        // Log error but don't fail the main operation
        logger.error('[Health Reports] Error sending notification for new report', notificationError as Error, {
          patientId,
          reportId: reportRef.id
        })
      }
    } else {
      // Report exists but regenerate is false
      const existingReportDoc = existingReportsSnap.docs[0]
      return NextResponse.json({
        success: false,
        error: 'Report already exists for this date',
        message: 'Set regenerate: true to update the existing report',
        existingReport: {
          id: existingReportDoc.id,
          reportDate: dateToUse,
          generatedAt: existingReportDoc.data().generatedAt?.toDate?.()?.toISOString() || existingReportDoc.data().generatedAt
        }
      }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      report: savedReport,
      message: regenerate ? 'Report regenerated successfully' : 'Report generated successfully'
    })

  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/health-reports',
      operation: 'create',
      patientId: (await params).patientId
    })
  }
}

