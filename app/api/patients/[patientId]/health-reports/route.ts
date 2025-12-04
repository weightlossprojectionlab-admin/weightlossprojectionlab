import { NextRequest, NextResponse } from 'next/server'
import { assertPatientAccess } from '@/lib/rbac-middleware'
import { healthReportOperations } from '@/lib/provider-operations'
import { logger } from '@/lib/logger'
import { adminDb } from '@/lib/firebase-admin'
import { errorResponse } from '@/lib/api-response'
import { Timestamp } from 'firebase-admin/firestore'

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
      return NextResponse.json(
        {
          success: false,
          error: 'Patient not found'
        },
        { status: 404 }
      )
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

    // Generate the report using the same logic as ai-health-report
    const reportText = await generateHealthReport({
      patient,
      medications,
      vitals,
      documents,
      todayMeals,
      weightData,
      stepsData
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

// Helper function to generate health report (adapted from ai-health-report)
async function generateHealthReport(data: {
  patient: any
  medications: any[]
  vitals: any[]
  documents: any[]
  todayMeals: any[]
  weightData: any[]
  stepsData: any[]
}): Promise<string> {
  const { patient, medications, vitals, documents, todayMeals, weightData, stepsData } = data

  // Import the helper functions from ai-health-report route
  // For now, we'll use a simplified version
  const reportDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  let report = `# HEALTH SUMMARY REPORT\n\n`
  report += `**Patient:** ${patient.name}  \n`
  report += `**Report Date:** ${reportDate}  \n\n`
  report += `---\n\n`

  // Executive Summary
  report += `## EXECUTIVE SUMMARY\n\n`
  report += `| Key Metric | Count/Value |\n`
  report += `|------------|-------------|\n`
  report += `| Active Medications | ${medications.length} |\n`
  report += `| Vital Sign Records | ${vitals.length} |\n`
  report += `| Weight Measurements | ${weightData.length} |\n`
  report += `| Step Logs | ${stepsData.length} |\n`
  report += `| Meals Today | ${todayMeals.length} |\n`
  report += `| Medical Documents | ${documents.length} |\n`
  report += `\n---\n\n`

  // Current Medications
  if (medications.length > 0) {
    report += `## CURRENT MEDICATIONS\n\n`
    report += `**Total Active Prescriptions:** ${medications.length}\n\n`

    medications.forEach((med: any, i: number) => {
      report += `### ${i + 1}. ${med.name}\n\n`
      report += `| Detail | Information |\n`
      report += `|--------|-------------|\n`
      if (med.strength) report += `| Strength | ${med.strength} |\n`
      if (med.dosageForm) report += `| Form | ${med.dosageForm} |\n`
      if (med.frequency) report += `| Frequency | ${med.frequency} |\n`
      if (med.prescribedFor) report += `| Prescribed For | ${med.prescribedFor} |\n`
      report += `\n`
    })
  }

  // Recent Vitals
  if (vitals.length > 0) {
    report += `## VITAL SIGNS\n\n`
    report += `**Recent Readings:**\n\n`
    report += `| Date | Type | Value |\n`
    report += `|------|------|-------|\n`

    vitals.slice(0, 10).forEach((vital: any) => {
      const date = vital.recordedAt ? new Date(vital.recordedAt).toLocaleDateString() : 'N/A'
      const type = vital.type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      const value = formatVitalValue(vital)
      report += `| ${date} | ${type} | ${value} |\n`
    })
    report += `\n`
  }

  // Weight Tracking
  if (weightData.length > 0) {
    report += `## WEIGHT TRACKING\n\n`
    const latestWeight = weightData[0]?.weight
    const targetWeight = patient.goals?.targetWeight
    report += `**Current Weight:** ${latestWeight} lbs  \n`
    if (targetWeight) {
      report += `**Target Weight:** ${targetWeight} lbs  \n`
      report += `**Remaining:** ${Math.abs(latestWeight - targetWeight).toFixed(1)} lbs  \n`
    }
    report += `**Measurements Recorded:** ${weightData.length}  \n\n`
  }

  // Activity
  if (stepsData.length > 0) {
    report += `## ACTIVITY TRACKING\n\n`
    const totalSteps = stepsData.reduce((sum: number, log: any) => sum + (log.steps || 0), 0)
    const avgSteps = Math.round(totalSteps / stepsData.length)
    report += `**Average Daily Steps:** ${avgSteps.toLocaleString()}  \n`
    report += `**Logs Recorded:** ${stepsData.length}  \n\n`
  }

  // Disclaimer
  report += `---\n\n`
  report += `**DISCLAIMER:** This report is generated from patient health data for informational and tracking purposes only. It does not constitute medical advice, diagnosis, or treatment. All medical decisions should be made in consultation with qualified healthcare providers.\n`

  return report
}

function formatVitalValue(vital: any): string {
  if (vital.type === 'blood_pressure') {
    const systolic = vital.systolic || vital.value?.systolic || 'N/A'
    const diastolic = vital.diastolic || vital.value?.diastolic || 'N/A'
    return `${systolic}/${diastolic} mmHg`
  } else if (vital.type === 'blood_sugar') {
    return `${vital.value} mg/dL`
  } else if (vital.type === 'pulse_oximeter') {
    return `${vital.value}%`
  } else if (vital.type === 'temperature') {
    return `${vital.value}°${vital.unit === 'celsius' ? 'C' : 'F'}`
  } else if (vital.type === 'weight') {
    return `${vital.value} ${vital.unit}`
  }
  return `${vital.value || 'N/A'}`
}
