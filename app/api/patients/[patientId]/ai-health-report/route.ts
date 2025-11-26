import { NextRequest, NextResponse } from 'next/server'
import { assertPatientAccess } from '@/lib/rbac-middleware'
import { logger } from '@/lib/logger'

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
    const accessInfo = await assertPatientAccess(request, patientId, 'viewPatientProfile')
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
      stepsData
    } = await request.json()

    logger.info('[Health Report] Generating rule-based report', { patientId, patientName: patient.name })

    // Analyze patient data to generate insights
    const age = calculateAge(patient.dateOfBirth)
    const isPet = patient.type === 'pet'

    // Analyze weight trend
    const weightAnalysis = analyzeWeightTrend(weightData, patient.goals)

    // Analyze activity levels
    const activityAnalysis = analyzeActivity(stepsData, patient.goals)

    // Analyze nutrition
    const nutritionAnalysis = analyzeNutrition(todayMeals, patient.goals)

    // Analyze vitals
    const vitalsAnalysis = analyzeVitals(vitals)

    // Analyze medication adherence
    const medicationAnalysis = analyzeMedications(medications)

    // Build the report
    const reportText = generateHealthReport({
      patient,
      age,
      isPet,
      weightAnalysis,
      activityAnalysis,
      nutritionAnalysis,
      vitalsAnalysis,
      medicationAnalysis,
      documentsCount: documents?.length || 0
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
        dataPoints: {
          vitals: vitals?.length || 0,
          medications: medications?.length || 0,
          weightLogs: weightData?.length || 0,
          stepLogs: stepsData?.length || 0,
          meals: todayMeals?.length || 0,
          documents: documents?.length || 0
        }
      }
    })

  } catch (error: any) {
    logger.error('[AI Health Report] Error generating report', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate health report',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// Helper functions
function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

function analyzeWeightTrend(weightData: any[], goals: any) {
  if (!weightData || weightData.length === 0) {
    return { status: 'no_data', message: 'No weight data available', trend: null }
  }

  const latestWeight = weightData[0]?.weight
  const targetWeight = goals?.targetWeight

  if (weightData.length < 2) {
    return {
      status: 'insufficient',
      message: 'Keep logging to see trends',
      current: latestWeight,
      target: targetWeight,
      trend: null
    }
  }

  const firstWeight = weightData[weightData.length - 1]?.weight
  const diff = latestWeight - firstWeight
  const percentChange = ((diff / firstWeight) * 100).toFixed(1)

  let status = 'stable'
  let message = 'Weight is stable'

  if (diff < -1) {
    status = 'losing'
    message = `Down ${Math.abs(diff).toFixed(1)} lbs (${Math.abs(parseFloat(percentChange))}%)`
  } else if (diff > 1) {
    status = 'gaining'
    message = `Up ${diff.toFixed(1)} lbs (${percentChange}%)`
  }

  return {
    status,
    message,
    current: latestWeight,
    target: targetWeight,
    diff,
    percentChange,
    logsCount: weightData.length
  }
}

function analyzeActivity(stepsData: any[], goals: any) {
  if (!stepsData || stepsData.length === 0) {
    return { status: 'no_data', message: 'No activity data available' }
  }

  const totalSteps = stepsData.reduce((sum: number, log: any) => sum + (log.steps || 0), 0)
  const avgSteps = Math.round(totalSteps / stepsData.length)
  const dailyGoal = goals?.dailyStepGoal || 10000

  let status = 'below_goal'
  let message = `Averaging ${avgSteps.toLocaleString()} steps/day`

  if (avgSteps >= dailyGoal) {
    status = 'meeting_goal'
    message = `Great! Averaging ${avgSteps.toLocaleString()} steps/day`
  } else if (avgSteps >= dailyGoal * 0.75) {
    status = 'close_to_goal'
    message = `Almost there! ${avgSteps.toLocaleString()} steps/day`
  }

  return {
    status,
    message,
    average: avgSteps,
    goal: dailyGoal,
    logsCount: stepsData.length
  }
}

function analyzeNutrition(todayMeals: any[], goals: any) {
  if (!todayMeals || todayMeals.length === 0) {
    return { status: 'no_data', message: 'No meals logged today' }
  }

  const totalCalories = todayMeals.reduce((sum: number, meal: any) => {
    return sum + (meal.calories || meal.nutritionEstimate?.calories || 0)
  }, 0)

  const dailyGoal = goals?.dailyCalorieGoal || 2000

  let status = 'on_track'
  let message = `${totalCalories} calories logged today`

  if (totalCalories > dailyGoal * 1.15) {
    status = 'over_goal'
    message = `${totalCalories} cal (${Math.round((totalCalories / dailyGoal) * 100)}% of goal)`
  } else if (totalCalories < dailyGoal * 0.85) {
    status = 'under_goal'
    message = `${totalCalories} cal (${Math.round((totalCalories / dailyGoal) * 100)}% of goal)`
  }

  return {
    status,
    message,
    calories: totalCalories,
    goal: dailyGoal,
    mealsCount: todayMeals.length
  }
}

function analyzeVitals(vitals: any[]) {
  if (!vitals || vitals.length === 0) {
    return { status: 'no_data', message: 'No vitals recorded', recent: [] }
  }

  const recentVitals = vitals.slice(0, 5).map((v: any) => {
    // Parse timestamp - handle both Firestore timestamp and ISO string
    let dateStr = 'N/A'
    try {
      if (v.timestamp) {
        if (typeof v.timestamp === 'string') {
          dateStr = new Date(v.timestamp).toLocaleDateString()
        } else if (v.timestamp.toDate) {
          // Firestore Timestamp
          dateStr = v.timestamp.toDate().toLocaleDateString()
        } else if (v.timestamp.seconds) {
          // Firestore Timestamp as object
          dateStr = new Date(v.timestamp.seconds * 1000).toLocaleDateString()
        }
      }
    } catch (e) {
      dateStr = 'N/A'
    }

    return {
      type: v.type,
      value: formatVitalValue(v),
      date: dateStr
    }
  })

  return {
    status: 'recorded',
    message: `${vitals.length} vitals recorded`,
    recent: recentVitals,
    totalCount: vitals.length
  }
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

function analyzeMedications(medications: any[]) {
  if (!medications || medications.length === 0) {
    return { status: 'none', message: 'No medications recorded', count: 0, medications: [] }
  }

  return {
    status: 'active',
    message: `${medications.length} active medication${medications.length > 1 ? 's' : ''}`,
    count: medications.length,
    medications: medications, // Add full medications array for report generation
    list: medications.slice(0, 5).map((m: any) => `${m.name} (${m.strength} ${m.dosageForm})`)
  }
}

function generateHealthReport(data: any): string {
  const { patient, age, isPet, weightAnalysis, activityAnalysis, nutritionAnalysis, vitalsAnalysis, medicationAnalysis, documentsCount } = data

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
  report += `| Key Metric | Current | Target | Status |\n`
  report += `|------------|---------|--------|--------|\n`

  // Demographics row
  const demographics = `${age}y ${!isPet && patient.gender ? patient.gender.charAt(0).toUpperCase() : ''}`
  report += `| Patient Profile | ${demographics} | - | ${patient.relationship ? patient.relationship.charAt(0).toUpperCase() + patient.relationship.slice(1) : 'Self'} |\n`

  // Weight
  if (weightAnalysis.current) {
    const weightStatus = weightAnalysis.target
      ? `${Math.abs(weightAnalysis.current - weightAnalysis.target).toFixed(1)} lbs to goal`
      : `${weightAnalysis.logsCount || 0} measurements`
    report += `| Current Weight | ${weightAnalysis.current} lbs | ${weightAnalysis.target || '-'} lbs | ${weightStatus} |\n`
  }

  // Nutrition
  if (nutritionAnalysis.status !== 'no_data') {
    const nutritionAlert = nutritionAnalysis.calories < nutritionAnalysis.goal * 0.5 ? '⚠️ CRITICALLY LOW'
      : nutritionAnalysis.status === 'under_goal' ? 'Below Target'
      : nutritionAnalysis.status === 'over_goal' ? 'Above Target'
      : 'On Track'
    report += `| Daily Calories | ${nutritionAnalysis.calories} cal | ${nutritionAnalysis.goal} cal | ${nutritionAlert} (${Math.round((nutritionAnalysis.calories / nutritionAnalysis.goal) * 100)}%) |\n`
  }

  // Activity
  if (activityAnalysis.status !== 'no_data') {
    const activityStatus = activityAnalysis.status === 'meeting_goal' ? 'Meeting Goal'
      : activityAnalysis.status === 'close_to_goal' ? 'Near Goal'
      : 'Below Goal'
    report += `| Daily Steps | ${activityAnalysis.average?.toLocaleString() || 'N/A'} | ${activityAnalysis.goal?.toLocaleString() || 'N/A'} | ${activityStatus} |\n`
  }

  // Medical records
  report += `| Active Medications | ${medicationAnalysis.count || 0} | - | ${medicationAnalysis.status === 'active' ? 'Documented' : 'None'} |\n`
  report += `| Vital Sign Records | ${vitalsAnalysis.totalCount || 0} | - | ${vitalsAnalysis.totalCount > 0 ? 'Active Monitoring' : 'None'} |\n`
  report += `| Medical Documents | ${documentsCount || 0} | - | ${documentsCount > 0 ? 'Organized' : 'None'} |\n`

  report += `\n---\n\n`

  // Clinical Alerts (if any critical issues)
  const criticalAlerts = getCriticalAlerts(weightAnalysis, nutritionAnalysis, vitalsAnalysis)
  if (criticalAlerts.length > 0) {
    report += `## CLINICAL ALERTS\n\n`
    criticalAlerts.forEach(alert => {
      report += `⚠️ **${alert.severity}:** ${alert.message}  \n\n`
      if (alert.details) {
        alert.details.forEach((detail: string) => report += `- ${detail}  \n`)
        report += `\n`
      }
    })
    report += `---\n\n`
  }

  // Patient Demographics
  report += `## PATIENT DEMOGRAPHICS\n\n`
  report += `| Field | Value |\n`
  report += `|-------|-------|\n`
  report += `| Age | ${age} years |\n`
  if (!isPet && patient.gender) {
    report += `| Gender | ${patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)} |\n`
  }
  if (patient.relationship) {
    report += `| Relationship | ${patient.relationship.charAt(0).toUpperCase() + patient.relationship.slice(1)} |\n`
  }
  if (isPet) {
    report += `| Species | ${patient.species} |\n`
    if (patient.breed) report += `| Breed | ${patient.breed} |\n`
  }
  report += `\n`

  // Clinical Summary
  const healthScore = calculateHealthScore(weightAnalysis, activityAnalysis, nutritionAnalysis)
  report += `## CLINICAL SUMMARY\n\n`
  report += `${healthScore.message}\n\n`

  // Weight Management
  if (weightAnalysis.status !== 'no_data' && weightAnalysis.status !== 'insufficient') {
    report += `### Weight Management\n\n`
    report += `| Metric | Value |\n`
    report += `|--------|-------|\n`
    if (weightAnalysis.current) {
      report += `| Current Weight | ${weightAnalysis.current} lbs |\n`
    }
    if (weightAnalysis.target) {
      const remaining = Math.abs(weightAnalysis.current - weightAnalysis.target)
      report += `| Target Weight | ${weightAnalysis.target} lbs |\n`
      report += `| Remaining | ${remaining.toFixed(1)} lbs |\n`
    }
    if (weightAnalysis.logsCount) {
      report += `| Measurements Recorded | ${weightAnalysis.logsCount} |\n`
    }
    if (weightAnalysis.diff) {
      const direction = weightAnalysis.diff < 0 ? 'decrease' : 'increase'
      report += `| Trend | ${Math.abs(weightAnalysis.diff).toFixed(1)} lbs ${direction} |\n`
    }
    report += `\n`
  }

  // Activity & Nutrition
  report += `### Activity & Nutrition\n\n`
  report += `| Metric | Current | Goal | Status |\n`
  report += `|--------|---------|------|--------|\n`

  if (activityAnalysis.status !== 'no_data') {
    const activityPercent = activityAnalysis.average && activityAnalysis.goal
      ? `${Math.round((activityAnalysis.average / activityAnalysis.goal) * 100)}%`
      : 'N/A'
    const activityStatus = activityAnalysis.status === 'meeting_goal' ? 'Meeting Goal'
      : activityAnalysis.status === 'close_to_goal' ? 'Near Goal'
      : 'Below Goal'
    report += `| Daily Steps | ${activityAnalysis.average?.toLocaleString() || 'N/A'} | ${activityAnalysis.goal?.toLocaleString() || 'N/A'} | ${activityStatus} (${activityPercent}) |\n`
  }

  if (nutritionAnalysis.status !== 'no_data') {
    const nutritionPercent = nutritionAnalysis.calories && nutritionAnalysis.goal
      ? `${Math.round((nutritionAnalysis.calories / nutritionAnalysis.goal) * 100)}%`
      : 'N/A'
    const nutritionStatus = nutritionAnalysis.status === 'on_track' ? 'On Track'
      : nutritionAnalysis.status === 'under_goal' ? 'Below Goal'
      : 'Above Goal'
    report += `| Daily Calories | ${nutritionAnalysis.calories || 'N/A'} | ${nutritionAnalysis.goal || 'N/A'} | ${nutritionStatus} (${nutritionPercent}) |\n`
    if (nutritionAnalysis.mealsCount) {
      report += `| Meals Logged Today | ${nutritionAnalysis.mealsCount} | - | - |\n`
    }
  }

  report += `\n`

  // Current Medications with images
  if (medicationAnalysis.status === 'active' && medicationAnalysis.medications) {
    report += `## CURRENT MEDICATIONS\n\n`
    report += `**Total Active Prescriptions:** ${medicationAnalysis.count}\n\n`

    // Display each medication with its image if available
    medicationAnalysis.medications.forEach((med: any, i: number) => {
      report += `### ${i + 1}. ${med.name}\n\n`

      // Medication details table
      report += `| Detail | Information |\n`
      report += `|--------|-------------|\n`
      if (med.brand) report += `| Brand | ${med.brand} |\n`
      if (med.strength) report += `| Strength | ${med.strength} |\n`
      if (med.dosageForm) report += `| Form | ${med.dosageForm} |\n`
      if (med.frequency) report += `| Frequency | ${med.frequency} |\n`
      if (med.prescribedFor) report += `| Prescribed For | ${med.prescribedFor} |\n`
      if (med.prescribingDoctor) report += `| Prescribing Doctor | ${med.prescribingDoctor} |\n`
      if (med.pharmacy) report += `| Pharmacy | ${med.pharmacy} |\n`
      if (med.expirationDate) {
        const expDate = new Date(med.expirationDate)
        const isExpired = expDate < new Date()
        report += `| Expiration Date | ${expDate.toLocaleDateString()} ${isExpired ? '⚠️ EXPIRED' : ''} |\n`
      }
      report += `\n`

      // Add medication image if available
      if (med.imageUrl || med.photoUrl) {
        const imageUrl = med.imageUrl || med.photoUrl
        report += `**Visual Reference:**\n\n`
        report += `![${med.name} bottle](${imageUrl})\n\n`
        report += `*Medication bottle image for verification and identification*\n\n`
      }

      // Warnings if present
      if (med.warnings && med.warnings.length > 0) {
        report += `**⚠️ Warnings:**  \n`
        med.warnings.forEach((warning: string) => {
          report += `- ${warning}  \n`
        })
        report += `\n`
      }

      report += `---\n\n`
    })
  }

  // Recent Vitals - Grouped by category
  if (vitalsAnalysis.status === 'recorded' && vitalsAnalysis.recent.length > 0) {
    report += `## VITAL SIGNS\n\n`

    // Group vitals by category
    const cardiovascular = vitalsAnalysis.recent.filter((v: any) => v.type === 'blood_pressure' || v.type === 'heart_rate')
    const metabolic = vitalsAnalysis.recent.filter((v: any) => v.type === 'blood_sugar' || v.type === 'weight')
    const other = vitalsAnalysis.recent.filter((v: any) => !['blood_pressure', 'heart_rate', 'blood_sugar', 'weight'].includes(v.type))

    if (cardiovascular.length > 0) {
      report += `### Cardiovascular\n\n`
      report += `| Date | Type | Reading | Status |\n`
      report += `|------|------|---------|--------|\n`
      cardiovascular.forEach((v: any) => {
        const status = getVitalStatus(v)
        const vitalName = v.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
        report += `| ${v.date} | ${vitalName} | ${v.value} | ${status} |\n`
      })
      report += `\n`
    }

    if (metabolic.length > 0) {
      report += `### Metabolic\n\n`
      report += `| Date | Type | Reading | Status |\n`
      report += `|------|------|---------|--------|\n`
      metabolic.forEach((v: any) => {
        const status = getVitalStatus(v)
        const vitalName = v.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
        report += `| ${v.date} | ${vitalName} | ${v.value} | ${status} |\n`
      })
      report += `\n`
    }

    if (other.length > 0) {
      report += `### Other Measurements\n\n`
      report += `| Date | Type | Reading | Status |\n`
      report += `|------|------|---------|--------|\n`
      other.forEach((v: any) => {
        const status = getVitalStatus(v)
        const vitalName = v.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
        report += `| ${v.date} | ${vitalName} | ${v.value} | ${status} |\n`
      })
      report += `\n`
    }
  }

  // Assessment
  report += `## ASSESSMENT\n\n`

  // Positive findings
  const highlights = getPositiveHighlights(weightAnalysis, activityAnalysis, nutritionAnalysis, vitalsAnalysis, medicationAnalysis, documentsCount)
  if (highlights.length > 0) {
    report += `**Positive Findings:**  \n\n`
    highlights.forEach((h: string) => report += `- ${h}  \n`)
    report += `\n`
  }

  // Areas requiring attention
  const recommendations = getRecommendations(weightAnalysis, activityAnalysis, nutritionAnalysis, vitalsAnalysis, medicationAnalysis)
  if (recommendations.length > 0) {
    report += `**Areas Requiring Attention:**  \n\n`
    recommendations.forEach((r: string, i: number) => {
      report += `${i + 1}. ${r}  \n`
    })
    report += `\n`
  }

  // Plan with priorities
  report += `## RECOMMENDED PLAN\n\n`
  const nextSteps = getNextSteps(weightAnalysis, activityAnalysis, nutritionAnalysis, vitalsAnalysis, medicationAnalysis)
  const immediateActions = nextSteps.filter((_, i) => i < 2)
  const weeklyGoals = nextSteps.filter((_, i) => i >= 2)

  if (immediateActions.length > 0) {
    report += `### Immediate Actions (Next 24-48 Hours)  \n\n`
    immediateActions.forEach((step: string, i: number) => {
      report += `**${i + 1}.** ${step}  \n\n`
    })
  }

  if (weeklyGoals.length > 0) {
    report += `### Weekly Goals  \n\n`
    weeklyGoals.forEach((step: string, i: number) => {
      report += `**${i + 1}.** ${step}  \n\n`
    })
  }

  // CAREGIVER & FAMILY COORDINATION
  report += `## CAREGIVER COORDINATION CHECKLIST\n\n`

  // Doctor Discussion Points
  const doctorPoints = getDoctorDiscussionPoints(weightAnalysis, nutritionAnalysis, vitalsAnalysis, medicationAnalysis, age)
  if (doctorPoints.length > 0) {
    report += `### 🩺 Questions for Primary Care Doctor\n\n`
    report += `**Bring this list to the next appointment:**\n\n`
    doctorPoints.forEach((point: string, i: number) => {
      report += `${i + 1}. ${point}  \n`
    })
    report += `\n`
  }

  // Medication Management
  const medReminders = getMedicationReminders(medicationAnalysis, patient)
  if (medReminders.length > 0) {
    report += `### 💊 Medication Management\n\n`
    medReminders.forEach((reminder: string) => {
      report += `- ${reminder}  \n`
    })
    report += `\n`
  }

  // Appointments Needed
  const appointmentNeeds = getAppointmentNeeds(age, vitalsAnalysis, medicationAnalysis, documentsCount)
  if (appointmentNeeds.length > 0) {
    report += `### 📅 Recommended Appointments & Screenings\n\n`
    appointmentNeeds.forEach((appt: string) => {
      report += `- ${appt}  \n`
    })
    report += `\n`
  }

  // Shopping Lists
  const shoppingLists = getShoppingLists(nutritionAnalysis, medicationAnalysis, vitalsAnalysis)
  if (shoppingLists.groceries.length > 0 || shoppingLists.medical.length > 0) {
    report += `### 🛒 Shopping & Supply Lists\n\n`

    if (shoppingLists.groceries.length > 0) {
      report += `**Grocery Items (Nutrition Support):**\n\n`
      shoppingLists.groceries.forEach((item: string) => {
        report += `- [ ] ${item}  \n`
      })
      report += `\n`
    }

    if (shoppingLists.medical.length > 0) {
      report += `**Medical Supplies:**\n\n`
      shoppingLists.medical.forEach((item: string) => {
        report += `- [ ] ${item}  \n`
      })
      report += `\n`
    }
  }

  // Caregiver Action Items
  const caregiverActions = getCaregiverActions(weightAnalysis, nutritionAnalysis, vitalsAnalysis, medicationAnalysis, patient)
  if (caregiverActions.length > 0) {
    report += `### 👨‍👩‍👧‍👦 Caregiver Action Items\n\n`
    report += `**Tasks for family members and caregivers:**\n\n`
    caregiverActions.forEach((action: any) => {
      report += `**${action.priority}:** ${action.task}  \n`
      if (action.details) {
        action.details.forEach((detail: string) => report += `   - ${detail}  \n`)
      }
      report += `\n`
    })
  }

  // Medical Records Summary
  if (vitalsAnalysis.totalCount > 0 || documentsCount > 0) {
    report += `## MEDICAL RECORDS SUMMARY\n\n`
    report += `| Category | Count |\n`
    report += `|----------|-------|\n`
    if (vitalsAnalysis.totalCount > 0) {
      report += `| Vital Sign Records | ${vitalsAnalysis.totalCount} |\n`
    }
    if (documentsCount > 0) {
      report += `| Medical Documents | ${documentsCount} |\n`
    }
    if (weightAnalysis.logsCount) {
      report += `| Weight Measurements | ${weightAnalysis.logsCount} |\n`
    }
    if (activityAnalysis.logsCount) {
      report += `| Activity Logs | ${activityAnalysis.logsCount} |\n`
    }
    report += `\n`
  }

  // Disclaimer
  report += `---\n\n`
  report += `**DISCLAIMER:** This report is generated from patient health data for informational and tracking purposes only. It does not constitute medical advice, diagnosis, or treatment. All medical decisions should be made in consultation with qualified healthcare providers.  \n\n`
  report += `**Data Sources:** Patient vitals, weight logs, activity tracking, meal logs, medication records, and medical documents stored in the patient health record system.  `

  return report
}

function calculateHealthScore(weight: any, activity: any, nutrition: any) {
  const scores = []

  if (weight.status === 'losing') scores.push(3)
  else if (weight.status === 'stable') scores.push(2)
  else if (weight.status === 'gaining') scores.push(1)

  if (activity.status === 'meeting_goal') scores.push(3)
  else if (activity.status === 'close_to_goal') scores.push(2)
  else if (activity.status === 'below_goal') scores.push(1)

  if (nutrition.status === 'on_track') scores.push(3)
  else if (nutrition.status === 'under_goal' || nutrition.status === 'over_goal') scores.push(2)

  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 2

  if (avgScore >= 2.5) {
    return { score: avgScore, message: 'Overall health metrics are looking great! Keep up the excellent work.' }
  } else if (avgScore >= 1.5) {
    return { score: avgScore, message: 'Making good progress with some areas to improve. Consistency is key!' }
  } else {
    return { score: avgScore, message: 'Getting started on the health journey. Small steps lead to big changes!' }
  }
}

function getPositiveHighlights(weight: any, activity: any, nutrition: any, vitals: any, medications: any, docsCount: number): string[] {
  const highlights = []

  if (weight.logsCount >= 7) highlights.push(`Consistent weight tracking with ${weight.logsCount} logs`)
  if (weight.status === 'losing') highlights.push(`Making progress toward weight goal`)
  if (activity.status === 'meeting_goal') highlights.push(`Meeting daily step goal consistently`)
  if (nutrition.mealsCount >= 3) highlights.push(`Logging meals regularly (${nutrition.mealsCount} today)`)
  if (vitals.totalCount >= 5) highlights.push(`Active vital signs monitoring (${vitals.totalCount} records)`)
  if (medications.status === 'active') highlights.push(`Medication regimen documented and tracked`)
  if (docsCount >= 3) highlights.push(`Medical documents organized (${docsCount} files)`)

  return highlights.length > 0 ? highlights : ['Starting to build healthy tracking habits']
}

function getRecommendations(weight: any, activity: any, nutrition: any, vitals: any, medications: any): string[] {
  const recommendations = []

  if (weight.status === 'no_data' || weight.logsCount < 3) {
    recommendations.push('Log weight regularly to track progress and identify trends')
  }
  if (activity.status === 'below_goal') {
    recommendations.push('Try to increase daily steps gradually - even 500 more steps helps!')
  }
  if (nutrition.status === 'no_data') {
    recommendations.push('Start logging meals to understand calorie intake and patterns')
  }
  if (nutrition.status === 'under_goal' && nutrition.calories < nutrition.goal * 0.5) {
    recommendations.push('⚠️ Calorie intake is very low - ensure adequate nutrition for health and energy')
  } else if (nutrition.status === 'under_goal') {
    recommendations.push('Consider adding healthy snacks or larger portions to meet calorie goals')
  }
  if (nutrition.status === 'over_goal') {
    recommendations.push('Consider smaller portions or healthier substitutions to stay within calorie goal')
  }
  if (vitals.status === 'no_data') {
    recommendations.push('Monitor vital signs regularly for a complete health picture')
  }

  return recommendations.length > 0 ? recommendations : ['Continue current healthy habits and stay consistent']
}

function getNextSteps(weight: any, activity: any, nutrition: any, vitals: any, medications: any): string[] {
  const steps = []

  if (weight.status === 'no_data' || weight.logsCount < 7) {
    steps.push('Log weight weekly to establish a baseline and track trends')
  } else if (weight.status === 'losing') {
    steps.push('Maintain current eating and activity habits - they\'re working!')
  }

  if (activity.status === 'below_goal' || activity.status === 'close_to_goal') {
    steps.push('Set a daily step reminder and aim for short walks after meals')
  }

  if (nutrition.mealsCount < 2) {
    steps.push('Log all meals today to get accurate calorie tracking')
  }

  if (steps.length < 3 && vitals.status !== 'recorded') {
    steps.push('Record vital signs to monitor overall health indicators')
  }

  if (steps.length === 0) {
    steps.push('Keep up the great work with consistent tracking!')
    steps.push('Review progress weekly and adjust goals as needed')
    steps.push('Consider consulting healthcare provider for personalized guidance')
  }

  return steps.slice(0, 3)
}

function getCriticalAlerts(weight: any, nutrition: any, vitals: any): any[] {
  const alerts = []

  // Critical calorie deficit
  if (nutrition.status !== 'no_data' && nutrition.calories < nutrition.goal * 0.5) {
    alerts.push({
      severity: 'CRITICAL',
      message: 'Severely inadequate caloric intake detected',
      details: [
        `Current intake: ${nutrition.calories} calories (${Math.round((nutrition.calories / nutrition.goal) * 100)}% of target)`,
        `Target: ${nutrition.goal} calories`,
        `Deficit: ${nutrition.goal - nutrition.calories} calories`,
        `Risk: Prolonged inadequate nutrition may impact health, energy levels, and metabolic function`,
        `Recommendation: Increase meal frequency and portion sizes immediately. Consult healthcare provider if persistent.`
      ]
    })
  }

  // Significant weight increase
  if (weight.status === 'gaining' && weight.diff && weight.diff > 20) {
    alerts.push({
      severity: 'ATTENTION REQUIRED',
      message: `Significant weight increase observed`,
      details: [
        `Change: +${weight.diff.toFixed(1)} lbs`,
        `Measurements: ${weight.logsCount} recorded`,
        `Recommendation: Schedule consultation with healthcare provider to discuss weight trend`
      ]
    })
  }

  return alerts
}

function getVitalStatus(vital: any): string {
  if (vital.type === 'blood_pressure') {
    const systolic = vital.systolic || vital.value?.systolic
    const diastolic = vital.diastolic || vital.value?.diastolic

    if (!systolic || !diastolic) return 'N/A'

    if (systolic >= 140 || diastolic >= 90) return 'Elevated'
    if (systolic >= 130 || diastolic >= 80) return 'High Normal'
    if (systolic < 90 || diastolic < 60) return 'Low'
    return 'Normal'
  }

  if (vital.type === 'blood_sugar') {
    const value = vital.value
    if (!value) return 'N/A'

    if (value > 125) return 'Elevated'
    if (value > 100) return 'High Normal'
    if (value < 70) return 'Low'
    return 'Normal'
  }

  if (vital.type === 'temperature') {
    const value = vital.value
    if (!value) return 'N/A'

    if (value > 100.4) return 'Fever'
    if (value < 95) return 'Low'
    return 'Normal'
  }

  if (vital.type === 'pulse_oximeter') {
    const value = vital.value
    if (!value) return 'N/A'

    if (value < 90) return 'Low'
    if (value >= 95) return 'Normal'
    return 'Monitor'
  }

  return 'Recorded'
}

function getDoctorDiscussionPoints(weight: any, nutrition: any, vitals: any, medications: any, age: number): string[] {
  const points = []

  // Critical nutrition issue
  if (nutrition.status !== 'no_data' && nutrition.calories < nutrition.goal * 0.5) {
    points.push(`Discuss severely low caloric intake (${nutrition.calories} cal/day, only ${Math.round((nutrition.calories / nutrition.goal) * 100)}% of target) - assess for appetite issues, difficulty eating, or underlying conditions`)
  }

  // Weight changes
  if (weight.status === 'gaining' && weight.diff && weight.diff > 20) {
    points.push(`Review ${weight.diff.toFixed(1)} lbs weight increase - check for fluid retention, medication side effects, or other causes`)
  } else if (weight.status === 'losing' && weight.diff && weight.diff < -15) {
    points.push(`Discuss ${Math.abs(weight.diff).toFixed(1)} lbs weight loss - evaluate if intentional and healthy or needs investigation`)
  }

  // Vital sign abnormalities
  if (vitals.recent) {
    const highBP = vitals.recent.find((v: any) => v.type === 'blood_pressure' && getVitalStatus(v) === 'Elevated')
    if (highBP) {
      points.push(`Blood pressure reading of ${highBP.value} was elevated - may need medication adjustment or additional monitoring`)
    }

    const highBS = vitals.recent.find((v: any) => v.type === 'blood_sugar' && getVitalStatus(v) === 'Elevated')
    if (highBS) {
      points.push(`Blood sugar ${highBS.value} mg/dL is elevated - discuss diabetes management and medication effectiveness`)
    }
  }

  // Age-appropriate screenings
  if (age >= 65) {
    points.push(`Confirm age-appropriate screenings are up to date: bone density, vision, hearing, fall risk assessment`)
  }
  if (age >= 50 && age < 65) {
    points.push(`Verify preventive screenings are current: colonoscopy, mammogram (if applicable), cardiovascular assessment`)
  }

  // Medication review
  if (medications.count === 0 && vitals.totalCount > 5) {
    points.push(`No medications on record despite regular vital monitoring - ensure all current medications are documented`)
  } else if (medications.count >= 5) {
    points.push(`Review all ${medications.count} medications for potential interactions, duplications, or medications that could be discontinued`)
  }

  return points
}

function getMedicationReminders(medicationAnalysis: any, patient: any): string[] {
  const reminders = []
  const medications = medicationAnalysis.medications || []

  if (!medications || medications.length === 0) {
    reminders.push('No medications currently on file - ensure to add all current prescriptions for accurate tracking')
    reminders.push('Bring all medication bottles to next doctor visit for review')
    return reminders
  }

  // Check for medications without expiration dates
  const noExpiry = medications.filter((m: any) => !m.expirationDate)
  if (noExpiry.length > 0) {
    reminders.push(`${noExpiry.length} medication(s) missing expiration dates - check bottles and update records`)
  }

  // General medication management
  reminders.push('Schedule medication review with pharmacist every 6 months')
  reminders.push('Set up pill organizer for the week every Sunday evening')
  reminders.push('Keep updated medication list in wallet/purse for emergencies')

  // Check for upcoming refills needed (if we had refill data)
  if (medications.length > 0) {
    reminders.push(`Review prescription refills - call pharmacy to check remaining refills for all ${medications.length} medications`)
  }

  return reminders
}

function getAppointmentNeeds(age: number, vitals: any, medications: any, documentsCount: number): string[] {
  const needs = []

  // Age-based screenings
  if (age >= 75) {
    needs.push('Annual wellness visit with primary care physician')
    needs.push('Geriatric assessment (if not done in last year)')
    needs.push('Vision exam with ophthalmologist (check for cataracts, glaucoma, macular degeneration)')
    needs.push('Hearing test with audiologist')
    needs.push('Bone density scan (if not done in last 2 years)')
  } else if (age >= 65) {
    needs.push('Annual wellness visit and Medicare wellness exam')
    needs.push('Comprehensive eye exam')
    needs.push('Hearing screening')
    needs.push('Fall risk assessment')
  } else if (age >= 50) {
    needs.push('Annual physical exam')
    needs.push('Colonoscopy (if not done in last 10 years)')
    needs.push('Cardiovascular risk assessment')
  }

  // Based on vitals
  if (vitals.totalCount > 10) {
    const highBP = vitals.recent?.find((v: any) => v.type === 'blood_pressure' && getVitalStatus(v) === 'Elevated')
    if (highBP) {
      needs.push('Cardiology consultation for blood pressure management')
    }

    const highBS = vitals.recent?.find((v: any) => v.type === 'blood_sugar' && getVitalStatus(v) === 'Elevated')
    if (highBS) {
      needs.push('Endocrinology or diabetes educator consultation')
    }
  }

  // Dental
  needs.push('Dental cleaning and exam (every 6 months)')

  // Preventive
  needs.push('Annual flu vaccine (September-October)')
  if (age >= 65) {
    needs.push('Pneumonia vaccine (if not up to date)')
    needs.push('Shingles vaccine (if not completed)')
  }

  return needs
}

function getShoppingLists(nutrition: any, medications: any, vitals: any): { groceries: string[], medical: string[] } {
  const groceries = []
  const medical = []

  // Nutrition-based grocery recommendations
  if (nutrition.status === 'under_goal' || nutrition.calories < nutrition.goal * 0.5) {
    groceries.push('High-calorie nutritious foods: nuts, nut butters, avocados, olive oil')
    groceries.push('Protein-rich items: eggs, Greek yogurt, cheese, lean meats, protein powder')
    groceries.push('Easy-to-eat nutritious snacks: granola bars, trail mix, fruit cups')
    groceries.push('Meal replacement shakes (Ensure, Boost, or similar)')
    groceries.push('Whole grain breads and crackers')
    groceries.push('Frozen meals for convenience on difficult days')
  }

  // General healthy staples
  groceries.push('Fresh fruits and vegetables (pre-cut if easier)')
  groceries.push('Whole grains: brown rice, quinoa, oatmeal')
  groceries.push('Hydration: water, herbal teas, low-sugar drinks')

  // Medical supplies based on vital monitoring
  if (vitals.totalCount > 0) {
    const hasBP = vitals.recent?.some((v: any) => v.type === 'blood_pressure')
    if (hasBP) {
      medical.push('Blood pressure monitor batteries (if needed)')
      medical.push('Blood pressure log notebook or app')
    }

    const hasBS = vitals.recent?.some((v: any) => v.type === 'blood_sugar')
    if (hasBS) {
      medical.push('Blood glucose test strips (check supply)')
      medical.push('Lancets for glucose meter')
      medical.push('Alcohol wipes')
    }

    const hasTemp = vitals.recent?.some((v: any) => v.type === 'temperature')
    if (hasTemp) {
      medical.push('Thermometer probe covers (if applicable)')
    }
  }

  // General medical supplies
  medical.push('7-day pill organizer (if not already have one)')
  medical.push('First aid supplies: bandages, antiseptic, pain relievers')
  medical.push('Hand sanitizer and tissues')

  return { groceries, medical }
}

function getCaregiverActions(weight: any, nutrition: any, vitals: any, medicationAnalysis: any, patient: any): any[] {
  const actions = []
  const medications = medicationAnalysis.medications || []

  // Critical nutrition action
  if (nutrition.status !== 'no_data' && nutrition.calories < nutrition.goal * 0.5) {
    actions.push({
      priority: 'URGENT',
      task: 'Address critically low calorie intake',
      details: [
        'Offer small, frequent meals throughout the day (6-8 mini meals)',
        'Keep high-calorie snacks readily available',
        'Consider meal delivery service or meal prep assistance',
        'Contact doctor if appetite does not improve within 48 hours'
      ]
    })
  }

  // Meal logging support
  if (nutrition.mealsCount < 2) {
    actions.push({
      priority: 'THIS WEEK',
      task: 'Help establish meal tracking routine',
      details: [
        'Set phone reminders for meal times',
        'Take photos of meals to make logging easier',
        'Sit together to log meals daily for accountability'
      ]
    })
  }

  // Medication organization
  if (medications.length > 0) {
    actions.push({
      priority: 'THIS WEEK',
      task: 'Organize medication system',
      details: [
        'Fill weekly pill organizer together',
        'Create medication schedule chart for refrigerator',
        'Set phone alarms for medication times',
        'Review understanding of what each medication is for'
      ]
    })
  }

  // Vital monitoring
  if (vitals.totalCount > 0) {
    actions.push({
      priority: 'ONGOING',
      task: 'Continue regular vital sign monitoring',
      details: [
        'Take blood pressure at same time each day',
        'Record all readings immediately',
        'Bring monitoring log to all doctor appointments',
        'Report any unusual readings to healthcare provider'
      ]
    })
  }

  // Weight tracking
  if (weight.status === 'no_data' || weight.logsCount < 5) {
    actions.push({
      priority: 'THIS WEEK',
      task: 'Establish weekly weight check routine',
      details: [
        'Choose same day and time each week (e.g., every Monday morning)',
        'Use same scale before eating or drinking',
        'Record weight immediately in app',
        'Focus on trends over time, not daily fluctuations'
      ]
    })
  }

  // Emergency preparedness
  actions.push({
    priority: 'THIS MONTH',
    task: 'Update emergency information',
    details: [
      'Ensure emergency contacts are current in phone',
      'Keep list of medications in wallet/purse',
      'Program doctor\'s office and pharmacy numbers into phone',
      'Identify neighbor or friend who can help in emergency'
    ]
  })

  return actions
}
