/**
 * AI Appointment Recommendation Engine
 *
 * Analyzes user progress, vitals, and appointment history to generate
 * intelligent recommendations for medical appointments
 */

import { db } from '@/lib/firebase'
import { collection, query, where, orderBy, limit, getDocs, getDoc, addDoc, updateDoc, doc } from 'firebase/firestore'
import type {
  AppointmentRecommendation,
  RecommendationType,
  RecommendationSeverity,
  RecommendationUrgency,
  ProviderType,
  VitalSign,
  Appointment
} from '@/types/medical'

interface ProgressMetrics {
  currentWeight: number
  startWeight: number
  goalWeight: number
  weeklyChangeRate: number
  daysSinceLastWeightLog: number
  daysOnProgram: number
  isStalled: boolean
  paceTooSlow: boolean
  paceTooFast: boolean
}

interface VitalTrends {
  hasElevatedBP: boolean
  hasIrregularGlucose: boolean
  hasAbnormalHeartRate: boolean
  lastVitalDate: string | null
  daysSinceLastVital: number | null
}

interface AppointmentHistory {
  lastNutritionistVisit: string | null
  lastDoctorVisit: string | null
  lastPsychologistVisit: string | null
  daysSinceLastNutritionist: number | null
  daysSinceLastDoctor: number | null
  daysSinceLastPsychologist: number | null
  isOverdueNutritionist: boolean
  isOverdueDoctor: boolean
  isOverduePsychologist: boolean
}

// Recommendation thresholds
const THRESHOLDS = {
  WEIGHT_STALL_WEEKS: 3, // No change for 3 weeks
  SLOW_PACE_LBS_PER_WEEK: 0.5, // Less than 0.5 lbs/week
  FAST_PACE_LBS_PER_WEEK: 3, // More than 3 lbs/week
  NUTRITIONIST_FREQUENCY_DAYS: 90, // Every 3 months
  DOCTOR_FREQUENCY_DAYS: 180, // Every 6 months
  PSYCHOLOGIST_FREQUENCY_DAYS: 120, // Every 4 months
  VITAL_CHECK_FREQUENCY_DAYS: 30, // Monthly vitals
  BP_SYSTOLIC_THRESHOLD: 140,
  BP_DIASTOLIC_THRESHOLD: 90,
  GLUCOSE_HIGH_THRESHOLD: 180,
  GLUCOSE_LOW_THRESHOLD: 70,
  HEART_RATE_HIGH_THRESHOLD: 100,
  HEART_RATE_LOW_THRESHOLD: 50
}

/**
 * Analyze weight loss progress metrics
 */
async function analyzeProgressMetrics(userId: string): Promise<ProgressMetrics | null> {
  try {
    // Get user profile for start weight and goal
    const profileRef = doc(db, 'user_profiles', userId)
    const profileSnap = await getDoc(profileRef)

    if (!profileSnap.exists()) return null

    const profile = profileSnap.data()
    const startWeight = profile.startWeight || profile.currentWeight
    const goalWeight = profile.goalWeight

    // Get recent weight logs (last 4 weeks)
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

    const weightLogsQuery = query(
      collection(db, 'weight_logs'),
      where('userId', '==', userId),
      where('date', '>=', fourWeeksAgo.toISOString().split('T')[0]),
      orderBy('date', 'desc')
    )

    const weightLogsSnap = await getDocs(weightLogsQuery)
    const weightLogs = weightLogsSnap.docs.map(d => ({
      date: d.data().date,
      weight: d.data().weight
    }))

    if (weightLogs.length < 2) return null

    const currentWeight = weightLogs[0].weight
    const oldestWeight = weightLogs[weightLogs.length - 1].weight
    const weeksElapsed = weightLogs.length / 7 // Rough estimate
    const weeklyChangeRate = (oldestWeight - currentWeight) / weeksElapsed

    // Check if stalled (no change in 3 weeks)
    const threeWeeksAgo = weightLogs.find((_, idx) => idx >= 21)
    const isStalled = threeWeeksAgo ? Math.abs(currentWeight - threeWeeksAgo.weight) < 1 : false

    // Calculate days on program
    const programStartDate = new Date(profile.createdAt || Date.now())
    const daysOnProgram = Math.floor((Date.now() - programStartDate.getTime()) / (1000 * 60 * 60 * 24))

    // Days since last weight log
    const lastLogDate = new Date(weightLogs[0].date)
    const daysSinceLastWeightLog = Math.floor((Date.now() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24))

    return {
      currentWeight,
      startWeight,
      goalWeight,
      weeklyChangeRate,
      daysSinceLastWeightLog,
      daysOnProgram,
      isStalled,
      paceTooSlow: weeklyChangeRate < THRESHOLDS.SLOW_PACE_LBS_PER_WEEK,
      paceTooFast: weeklyChangeRate > THRESHOLDS.FAST_PACE_LBS_PER_WEEK
    }
  } catch (error) {
    console.error('Error analyzing progress metrics:', error)
    return null
  }
}

/**
 * Analyze vital sign trends
 */
async function analyzeVitalTrends(userId: string): Promise<VitalTrends> {
  try {
    // Get all patients for this user
    const patientsQuery = query(
      collection(db, 'patients'),
      where('userId', '==', userId)
    )
    const patientsSnap = await getDocs(patientsQuery)

    let hasElevatedBP = false
    let hasIrregularGlucose = false
    let hasAbnormalHeartRate = false
    let lastVitalDate: string | null = null
    let daysSinceLastVital: number | null = null

    // Check vitals for each patient
    for (const patientDoc of patientsSnap.docs) {
      const vitalsQuery = query(
        collection(db, 'vital_signs'),
        where('patientId', '==', patientDoc.id),
        orderBy('recordedAt', 'desc'),
        limit(10)
      )

      const vitalsSnap = await getDocs(vitalsQuery)
      const vitals = vitalsSnap.docs.map(d => d.data() as VitalSign)

      if (vitals.length > 0) {
        const latestVitalDate = new Date(vitals[0].recordedAt)
        if (!lastVitalDate || latestVitalDate > new Date(lastVitalDate)) {
          lastVitalDate = vitals[0].recordedAt
          daysSinceLastVital = Math.floor((Date.now() - latestVitalDate.getTime()) / (1000 * 60 * 60 * 24))
        }
      }

      // Check for elevated BP
      const bpReadings = vitals.filter(v => v.type === 'blood_pressure')
      for (const bp of bpReadings) {
        // BP value can be BloodPressureValue object or string format "120/80"
        let systolic = 0
        let diastolic = 0

        if (typeof bp.value === 'object' && bp.value !== null && 'systolic' in bp.value) {
          systolic = bp.value.systolic
          diastolic = bp.value.diastolic
        } else if (typeof bp.value === 'string') {
          const parts = (bp.value as string).split('/')
          systolic = Number(parts[0]) || 0
          diastolic = Number(parts[1]) || 0
        }
        if (systolic >= THRESHOLDS.BP_SYSTOLIC_THRESHOLD || diastolic >= THRESHOLDS.BP_DIASTOLIC_THRESHOLD) {
          hasElevatedBP = true
          break
        }
      }

      // Check for irregular glucose
      const glucoseReadings = vitals.filter(v => v.type === 'blood_sugar')
      for (const glucose of glucoseReadings) {
        const value = Number(glucose.value)
        if (value >= THRESHOLDS.GLUCOSE_HIGH_THRESHOLD || value <= THRESHOLDS.GLUCOSE_LOW_THRESHOLD) {
          hasIrregularGlucose = true
          break
        }
      }

      // Check for abnormal heart rate (from pulse oximeter)
      const hrReadings = vitals.filter(v => v.type === 'pulse_oximeter')
      for (const hr of hrReadings) {
        if (typeof hr.value === 'object' && 'pulseRate' in hr.value) {
          const value = hr.value.pulseRate
          if (value >= THRESHOLDS.HEART_RATE_HIGH_THRESHOLD || value <= THRESHOLDS.HEART_RATE_LOW_THRESHOLD) {
            hasAbnormalHeartRate = true
            break
          }
        }
      }
    }

    return {
      hasElevatedBP,
      hasIrregularGlucose,
      hasAbnormalHeartRate,
      lastVitalDate,
      daysSinceLastVital
    }
  } catch (error) {
    console.error('Error analyzing vital trends:', error)
    return {
      hasElevatedBP: false,
      hasIrregularGlucose: false,
      hasAbnormalHeartRate: false,
      lastVitalDate: null,
      daysSinceLastVital: null
    }
  }
}

/**
 * Analyze appointment history
 */
async function analyzeAppointmentHistory(userId: string): Promise<AppointmentHistory> {
  try {
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('userId', '==', userId),
      where('status', 'in', ['completed', 'confirmed', 'scheduled']),
      orderBy('dateTime', 'desc'),
      limit(50)
    )

    const appointmentsSnap = await getDocs(appointmentsQuery)
    const appointments = appointmentsSnap.docs.map(d => d.data() as Appointment)

    let lastNutritionistVisit: string | null = null
    let lastDoctorVisit: string | null = null
    let lastPsychologistVisit: string | null = null

    // Find last visits by provider type
    for (const apt of appointments) {
      // We need to check provider specialty - this requires joining with providers
      // For now, use a simplified approach based on appointment reason/type
      const reason = apt.reason.toLowerCase()
      const type = apt.type

      if ((reason.includes('nutrition') || type === 'routine-checkup') && !lastNutritionistVisit) {
        lastNutritionistVisit = apt.dateTime
      }
      if ((reason.includes('doctor') || reason.includes('physician') || type === 'routine-checkup') && !lastDoctorVisit) {
        lastDoctorVisit = apt.dateTime
      }
      if ((reason.includes('psych') || reason.includes('mental') || type === 'specialist') && !lastPsychologistVisit) {
        lastPsychologistVisit = apt.dateTime
      }
    }

    // Calculate days since last visits
    const now = Date.now()
    const daysSinceLastNutritionist = lastNutritionistVisit
      ? Math.floor((now - new Date(lastNutritionistVisit).getTime()) / (1000 * 60 * 60 * 24))
      : null
    const daysSinceLastDoctor = lastDoctorVisit
      ? Math.floor((now - new Date(lastDoctorVisit).getTime()) / (1000 * 60 * 60 * 24))
      : null
    const daysSinceLastPsychologist = lastPsychologistVisit
      ? Math.floor((now - new Date(lastPsychologistVisit).getTime()) / (1000 * 60 * 60 * 24))
      : null

    return {
      lastNutritionistVisit,
      lastDoctorVisit,
      lastPsychologistVisit,
      daysSinceLastNutritionist,
      daysSinceLastDoctor,
      daysSinceLastPsychologist,
      isOverdueNutritionist: daysSinceLastNutritionist ? daysSinceLastNutritionist > THRESHOLDS.NUTRITIONIST_FREQUENCY_DAYS : true,
      isOverdueDoctor: daysSinceLastDoctor ? daysSinceLastDoctor > THRESHOLDS.DOCTOR_FREQUENCY_DAYS : true,
      isOverduePsychologist: daysSinceLastPsychologist ? daysSinceLastPsychologist > THRESHOLDS.PSYCHOLOGIST_FREQUENCY_DAYS : false
    }
  } catch (error) {
    console.error('Error analyzing appointment history:', error)
    return {
      lastNutritionistVisit: null,
      lastDoctorVisit: null,
      lastPsychologistVisit: null,
      daysSinceLastNutritionist: null,
      daysSinceLastDoctor: null,
      daysSinceLastPsychologist: null,
      isOverdueNutritionist: false,
      isOverdueDoctor: false,
      isOverduePsychologist: false
    }
  }
}

/**
 * Generate appointment recommendations based on analysis
 */
export async function generateRecommendations(userId: string): Promise<AppointmentRecommendation[]> {
  const recommendations: Omit<AppointmentRecommendation, 'id' | 'createdAt' | 'updatedAt'>[] = []

  // Analyze all metrics
  const [progressMetrics, vitalTrends, appointmentHistory] = await Promise.all([
    analyzeProgressMetrics(userId),
    analyzeVitalTrends(userId),
    analyzeAppointmentHistory(userId)
  ])

  // Recommendation 1: Weight stalled - nutritionist
  if (progressMetrics?.isStalled) {
    recommendations.push({
      userId,
      patientId: userId, // Assuming self for now
      type: 'nutritionist' as RecommendationType,
      reason: 'Your weight has remained stable for 3 weeks. A nutritionist can help adjust your meal plan to restart progress.',
      severity: 'medium' as RecommendationSeverity,
      urgency: 'normal' as RecommendationUrgency,
      suggestedProviderType: 'nutritionist' as ProviderType,
      triggerMetrics: {
        weightLossStalled: true,
        currentWeight: progressMetrics.currentWeight,
        weeklyChangeRate: progressMetrics.weeklyChangeRate
      },
      status: 'active',
      createdFrom: 'ai-analysis' as const,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    })
  }

  // Recommendation 2: Pace too slow - nutritionist
  if (progressMetrics?.paceTooSlow && !progressMetrics.isStalled) {
    recommendations.push({
      userId,
      patientId: userId,
      type: 'nutritionist' as RecommendationType,
      reason: `Your current pace is ${progressMetrics.weeklyChangeRate.toFixed(1)} lbs/week, which is slower than optimal. Consider consulting a nutritionist to optimize your plan.`,
      severity: 'low' as RecommendationSeverity,
      urgency: 'normal' as RecommendationUrgency,
      suggestedProviderType: 'nutritionist' as ProviderType,
      triggerMetrics: {
        paceTooSlow: true,
        weeklyChangeRate: progressMetrics.weeklyChangeRate
      },
      status: 'active',
      createdFrom: 'ai-analysis' as const,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
  }

  // Recommendation 3: Pace too fast - doctor checkup
  if (progressMetrics?.paceTooFast) {
    recommendations.push({
      userId,
      patientId: userId,
      type: 'doctor-checkup' as RecommendationType,
      reason: `You're losing weight very quickly (${progressMetrics.weeklyChangeRate.toFixed(1)} lbs/week). A doctor visit is recommended to ensure you're healthy.`,
      severity: 'high' as RecommendationSeverity,
      urgency: 'soon' as RecommendationUrgency,
      suggestedProviderType: 'primary-care' as ProviderType,
      triggerMetrics: {
        paceTooFast: true,
        weeklyChangeRate: progressMetrics.weeklyChangeRate
      },
      status: 'active',
      createdFrom: 'ai-analysis' as const,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
    })
  }

  // Recommendation 4: Elevated blood pressure
  if (vitalTrends.hasElevatedBP) {
    recommendations.push({
      userId,
      patientId: userId,
      type: 'doctor-checkup' as RecommendationType,
      reason: 'Your recent blood pressure readings are elevated. Please schedule a doctor visit to review your cardiovascular health.',
      severity: 'high' as RecommendationSeverity,
      urgency: 'urgent' as RecommendationUrgency,
      suggestedProviderType: 'primary-care' as ProviderType,
      triggerMetrics: {
        vitalAlert: 'Elevated blood pressure detected'
      },
      status: 'active',
      createdFrom: 'ai-analysis' as const,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    })
  }

  // Recommendation 5: Irregular glucose
  if (vitalTrends.hasIrregularGlucose) {
    recommendations.push({
      userId,
      patientId: userId,
      type: 'specialist' as RecommendationType,
      reason: 'Your glucose levels show irregular patterns. Consider seeing an endocrinologist or your primary care doctor.',
      severity: 'high' as RecommendationSeverity,
      urgency: 'soon' as RecommendationUrgency,
      suggestedProviderType: 'specialist' as ProviderType,
      triggerMetrics: {
        vitalAlert: 'Irregular glucose levels detected'
      },
      status: 'active',
      createdFrom: 'ai-analysis' as const,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    })
  }

  // Recommendation 6: Overdue nutritionist
  if (appointmentHistory.isOverdueNutritionist) {
    recommendations.push({
      userId,
      patientId: userId,
      type: 'nutritionist' as RecommendationType,
      reason: appointmentHistory.lastNutritionistVisit
        ? `It's been ${appointmentHistory.daysSinceLastNutritionist} days since your last nutritionist visit. Regular check-ins help maintain progress.`
        : 'Consider scheduling your first nutritionist visit to optimize your weight loss plan.',
      severity: 'low' as RecommendationSeverity,
      urgency: 'normal' as RecommendationUrgency,
      suggestedProviderType: 'nutritionist' as ProviderType,
      triggerMetrics: {
        overdueAppointment: true,
        daysSinceLastVisit: appointmentHistory.daysSinceLastNutritionist
      },
      status: 'active',
      createdFrom: 'ai-analysis' as const,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days
    })
  }

  // Recommendation 7: Overdue doctor
  if (appointmentHistory.isOverdueDoctor) {
    recommendations.push({
      userId,
      patientId: userId,
      type: 'doctor-checkup' as RecommendationType,
      reason: appointmentHistory.lastDoctorVisit
        ? `It's been ${appointmentHistory.daysSinceLastDoctor} days since your last doctor visit. A checkup is recommended.`
        : 'Schedule a doctor visit to establish a baseline for your weight loss journey.',
      severity: 'medium' as RecommendationSeverity,
      urgency: 'normal' as RecommendationUrgency,
      suggestedProviderType: 'primary-care' as ProviderType,
      triggerMetrics: {
        overdueAppointment: true,
        daysSinceLastVisit: appointmentHistory.daysSinceLastDoctor
      },
      status: 'active',
      createdFrom: 'ai-analysis' as const,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    })
  }

  // Save recommendations to database
  const savedRecommendations: AppointmentRecommendation[] = []

  for (const rec of recommendations) {
    try {
      const docRef = await addDoc(collection(db, 'appointment_recommendations'), {
        ...rec,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      savedRecommendations.push({
        id: docRef.id,
        ...rec,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as AppointmentRecommendation)
    } catch (error) {
      console.error('Error saving recommendation:', error)
    }
  }

  return savedRecommendations
}

/**
 * Get active recommendations for a user
 */
export async function getActiveRecommendations(userId: string): Promise<AppointmentRecommendation[]> {
  try {
    const q = query(
      collection(db, 'appointment_recommendations'),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      orderBy('severity', 'desc'),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AppointmentRecommendation[]
  } catch (error) {
    console.error('Error fetching recommendations:', error)
    return []
  }
}

/**
 * Dismiss a recommendation
 */
export async function dismissRecommendation(recommendationId: string): Promise<void> {
  try {
    const docRef = doc(db, 'appointment_recommendations', recommendationId)
    await updateDoc(docRef, {
      status: 'dismissed',
      dismissedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error dismissing recommendation:', error)
    throw error
  }
}

/**
 * Mark recommendation as scheduled (when user books the appointment)
 */
export async function markRecommendationScheduled(
  recommendationId: string,
  appointmentId: string
): Promise<void> {
  try {
    const docRef = doc(db, 'appointment_recommendations', recommendationId)
    await updateDoc(docRef, {
      status: 'scheduled',
      scheduledAppointmentId: appointmentId,
      scheduledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error marking recommendation as scheduled:', error)
    throw error
  }
}
