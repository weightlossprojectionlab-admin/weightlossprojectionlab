import { NextRequest, NextResponse } from 'next/server'
import { assertPatientAccess } from '@/lib/rbac-middleware'
import { errorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import {
  generateHealthSummary,
  type HealthSummaryInput
} from '@/lib/health-summary-generator'
import { generateHealthReport } from '@/lib/health-report-generator'

/**
 * POST /api/patients/[patientId]/ai-health-report
 * Generate a rule-based health summary for a patient using Firebase data analysis
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

    // Parse request body
    const {
      patient,
      medications,
      vitals,
      documents,
      todayMeals,
      weightData,
      stepsData,
      // Phase B–E entities (medical-binder gap close)
      immunizations,
      equipment,
      familyHistory,
      appointments,
      // Pet-specific data
      feedingData,
      vaccinations
    } = await request.json()

    logger.info('[Health Report] Generating rule-based report', { patientId, patientName: patient.name, patientType: patient.type })

    // Build input for health summary generator
    const summaryInput: HealthSummaryInput = {
      patient,
      medications,
      vitals,
      documents,
      weightData,
      stepsData,
      todayMeals,
      // Phase B–E entities passed through to formatter
      immunizations,
      equipment,
      familyHistory,
      appointments,
      // Pet-specific fields
      feedingData,
      vaccinations
    }

    // Generate analysis using centralized utility
    const analyses = generateHealthSummary(summaryInput)

    // Build the report using the existing report generator
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
      // Phase B–E raw data — formatter renders structured sections.
      immunizations,
      equipment,
      familyHistory,
      appointments,
      analyses: analyses
    })

    logger.info('[Health Report] Report generated successfully', {
      patientId,
      reportLength: reportText.length
    })

    return NextResponse.json({
      success: true,
      report: reportText,
      generatedAt: new Date().toISOString(),
      metadata: {
        method: 'rule-based',
        patientType: patient.type,
        species: patient.species,
        dataPoints: {
          vitals: vitals?.length || 0,
          medications: medications?.length || 0,
          weightLogs: weightData?.length || 0,
          stepLogs: stepsData?.length || 0,
          meals: todayMeals?.length || 0,
          documents: documents?.length || 0,
          immunizations: immunizations?.length || 0,
          equipment: equipment?.length || 0,
          familyHistory: familyHistory?.length || 0,
          appointments: appointments?.length || 0,
          feedingLogs: feedingData?.length || 0,
          vaccinations: vaccinations?.length || 0
        }
      }
    })

  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/ai-health-report',
      operation: 'generate'
    })
  }
}
