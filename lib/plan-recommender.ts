/**
 * Intelligent Plan Recommender
 *
 * Analyzes user needs, usage patterns, and features to recommend
 * the optimal subscription plan. Uses scoring algorithm to balance
 * user needs with business objectives.
 */

import { SubscriptionPlan, UserSubscription } from '@/types'
import { canAccessFeature } from './feature-gates'

export interface PlanRecommendation {
  recommendedPlan: SubscriptionPlan
  confidence: number // 0-100
  reasons: string[]
  alternativePlan?: SubscriptionPlan
  estimatedValue: number // cents per month
  upgradeUrgency: 'low' | 'medium' | 'high'
}

export interface UserNeeds {
  needsMedical: boolean
  needsMultiplePatients: boolean
  needsCaregivers: boolean
  patientsCount?: number
  caregiversCount?: number
  selectedFeatures: string[]
  currentPlan: SubscriptionPlan
}

/**
 * Recommend the best plan for a user based on their needs
 */
export function recommendPlan(needs: UserNeeds): PlanRecommendation {
  const scores: Record<SubscriptionPlan, number> = {
    free: 0,
    single: 0,
    single_plus: 0,
    family_basic: 0,
    family_plus: 0,
    family_premium: 0,
  }

  const reasons: string[] = []
  let upgradeUrgency: 'low' | 'medium' | 'high' = 'low'

  // Score based on medical tracking needs
  if (needs.needsMedical) {
    scores.single_plus += 30
    scores.family_basic += 25
    scores.family_plus += 20
    scores.family_premium += 15
    reasons.push('Medical tracking for appointments, medications, and vitals')
    upgradeUrgency = 'high'
  }

  // Score based on multiple patients
  if (needs.needsMultiplePatients) {
    scores.family_basic += 40
    scores.family_plus += 35
    scores.family_premium += 30
    reasons.push('Manage multiple family members or patients')
    upgradeUrgency = 'high'
  }

  // Score based on caregiver needs
  if (needs.needsCaregivers) {
    if (needs.caregiversCount && needs.caregiversCount > 3) {
      scores.family_basic += 20
      scores.family_plus += 30
      scores.family_premium += 40
      reasons.push(`Support for ${needs.caregiversCount} external caregivers`)
    } else {
      scores.single_plus += 25
      scores.family_basic += 20
      reasons.push('Invite caregivers to help manage health')
    }
  }

  // Score based on patient count
  if (needs.patientsCount) {
    if (needs.patientsCount <= 1) {
      scores.single += 10
      scores.single_plus += 15
    } else if (needs.patientsCount <= 5) {
      scores.family_basic += 35
      scores.family_plus += 30
    } else if (needs.patientsCount <= 10) {
      scores.family_plus += 40
      scores.family_premium += 35
    } else {
      scores.family_premium += 50
      reasons.push(`Support for ${needs.patientsCount}+ family members`)
    }
  }

  // Score based on feature selection
  const premiumFeatures = needs.selectedFeatures.filter(f =>
    ['medical_tracking', 'vitals', 'medications'].includes(f)
  )
  if (premiumFeatures.length > 0) {
    scores.single_plus += 20
    scores.family_basic += 15
    scores.family_plus += 10
  }

  // Penalty for downgrade (encourage staying on current tier or higher)
  const currentPlanIndex = getPlanTierIndex(needs.currentPlan)
  Object.keys(scores).forEach((plan) => {
    const planIndex = getPlanTierIndex(plan as SubscriptionPlan)
    if (planIndex < currentPlanIndex) {
      scores[plan as SubscriptionPlan] -= 50 // Heavy penalty for downgrade
    }
  })

  // Exclude free plan from recommendations
  delete scores.free

  // Find highest scoring plan
  const sortedPlans = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const recommendedPlan = sortedPlans[0][0] as SubscriptionPlan
  const alternativePlan = sortedPlans[1]?.[0] as SubscriptionPlan

  // Calculate confidence (0-100)
  const topScore = sortedPlans[0][1]
  const secondScore = sortedPlans[1]?.[1] || 0
  const scoreDiff = topScore - secondScore
  const confidence = Math.min(100, 50 + scoreDiff)

  // Estimate value based on plan pricing
  const pricing: Record<SubscriptionPlan, number> = {
    free: 0,
    single: 999,
    single_plus: 1499,
    family_basic: 1999,
    family_plus: 2999,
    family_premium: 3999,
  }
  const estimatedValue = pricing[recommendedPlan]

  // Add value-based reasons
  if (recommendedPlan === 'single_plus') {
    reasons.push('Best value for solo users with medical needs')
  } else if (recommendedPlan === 'family_plus') {
    reasons.push('Most popular for families managing health together')
  } else if (recommendedPlan === 'family_premium') {
    reasons.push('Unlimited seats and caregivers for large families')
  }

  return {
    recommendedPlan,
    confidence,
    reasons: reasons.slice(0, 3), // Top 3 reasons
    alternativePlan,
    estimatedValue,
    upgradeUrgency,
  }
}

/**
 * Get plan tier index for comparison
 */
function getPlanTierIndex(plan: SubscriptionPlan): number {
  const tiers: Record<SubscriptionPlan, number> = {
    free: 0,
    single: 1,
    single_plus: 2,
    family_basic: 3,
    family_plus: 4,
    family_premium: 5,
  }
  return tiers[plan]
}

/**
 * Analyze if user is approaching plan limits
 */
export function analyzeUsageVsPlan(
  subscription: UserSubscription,
  usageData: {
    patientsCount: number
    caregiversCount: number
    medicalRecordsCount?: number
  }
): {
  approachingLimit: boolean
  limitType?: 'patients' | 'caregivers'
  utilizationPercent: number
  recommendUpgrade: boolean
  suggestedPlan?: SubscriptionPlan
} {
  const { patientsCount, caregiversCount } = usageData

  // Check patients limit
  const patientUtilization = (patientsCount / subscription.maxSeats) * 100
  const caregiverUtilization = (caregiversCount / subscription.maxExternalCaregivers) * 100

  const approachingLimit = patientUtilization >= 80 || caregiverUtilization >= 80
  const limitType = patientUtilization >= caregiverUtilization ? 'patients' : 'caregivers'
  const utilizationPercent = Math.max(patientUtilization, caregiverUtilization)
  const recommendUpgrade = utilizationPercent >= 90

  let suggestedPlan: SubscriptionPlan | undefined

  if (recommendUpgrade) {
    // Suggest next tier up
    const upgradeMap: Record<SubscriptionPlan, SubscriptionPlan | null> = {
      free: 'single',
      single: 'single_plus',
      single_plus: 'family_basic',
      family_basic: 'family_plus',
      family_plus: 'family_premium',
      family_premium: null,
    }
    suggestedPlan = upgradeMap[subscription.plan] || undefined
  }

  return {
    approachingLimit,
    limitType,
    utilizationPercent: Math.round(utilizationPercent),
    recommendUpgrade,
    suggestedPlan,
  }
}

/**
 * Get plan comparison for user decision-making
 */
export function comparePlans(
  currentPlan: SubscriptionPlan,
  targetPlan: SubscriptionPlan
): {
  isUpgrade: boolean
  priceDifference: number // cents per month
  additionalFeatures: string[]
  additionalSeats: number
  additionalCaregivers: number
} {
  const currentTier = getPlanTierIndex(currentPlan)
  const targetTier = getPlanTierIndex(targetPlan)
  const isUpgrade = targetTier > currentTier

  const pricing: Record<SubscriptionPlan, number> = {
    free: 0,
    single: 999,
    single_plus: 1499,
    family_basic: 1999,
    family_plus: 2999,
    family_premium: 3999,
  }
  const priceDifference = pricing[targetPlan] - pricing[currentPlan]

  const seats: Record<SubscriptionPlan, number> = {
    free: 1,
    single: 1,
    single_plus: 1,
    family_basic: 5,
    family_plus: 10,
    family_premium: 999,
  }
  const additionalSeats = seats[targetPlan] - seats[currentPlan]

  const caregivers: Record<SubscriptionPlan, number> = {
    free: 0,
    single: 0,
    single_plus: 3,
    family_basic: 5,
    family_plus: 10,
    family_premium: 999,
  }
  const additionalCaregivers = caregivers[targetPlan] - caregivers[currentPlan]

  // Feature differences by tier
  const featuresByTier: Record<SubscriptionPlan, string[]> = {
    free: ['Weight & step tracking', 'Meal logging', 'Photo gallery'],
    single: ['Weight & step tracking', 'Meal logging', 'Photo gallery', 'Recipes'],
    single_plus: ['All Single features', 'Medical tracking', '3 caregivers', 'Vitals monitoring'],
    family_basic: ['All Single Plus features', '5 family seats', 'Family dashboard', 'Shared meal planning'],
    family_plus: ['All Family Basic features', '10 family seats', 'Advanced analytics', 'Priority support'],
    family_premium: ['All Family Plus features', 'Unlimited seats', 'Unlimited caregivers', 'White-glove support'],
  }

  const additionalFeatures = featuresByTier[targetPlan]

  return {
    isUpgrade,
    priceDifference,
    additionalFeatures,
    additionalSeats,
    additionalCaregivers,
  }
}

/**
 * Calculate ROI for plan upgrade
 */
export function calculateUpgradeROI(
  currentPlan: SubscriptionPlan,
  targetPlan: SubscriptionPlan,
  usageData: {
    patientsManaged: number
    timeSpentPerWeek: number // hours
    caregiverCollaborators: number
  }
): {
  monthlyCost: number
  estimatedTimeSaved: number // hours per month
  costPerPatient: number
  valueScore: number // 0-100
  recommendation: 'strongly_recommend' | 'recommend' | 'neutral' | 'not_recommended'
} {
  const pricing: Record<SubscriptionPlan, number> = {
    free: 0,
    single: 999,
    single_plus: 1499,
    family_basic: 1999,
    family_plus: 2999,
    family_premium: 3999,
  }

  const monthlyCost = pricing[targetPlan]
  const costDifference = monthlyCost - pricing[currentPlan]

  // Estimate time saved based on features
  const timeSavingsByTier: Record<SubscriptionPlan, number> = {
    free: 0,
    single: 2,
    single_plus: 5,
    family_basic: 8,
    family_plus: 12,
    family_premium: 15,
  }
  const estimatedTimeSaved = timeSavingsByTier[targetPlan]

  // Cost per patient
  const costPerPatient = usageData.patientsManaged > 0
    ? Math.round(monthlyCost / usageData.patientsManaged)
    : monthlyCost

  // Value score calculation
  let valueScore = 50 // Start at neutral

  // More patients = higher value
  if (usageData.patientsManaged > 1) {
    valueScore += Math.min(20, usageData.patientsManaged * 5)
  }

  // More time spent = higher value
  if (usageData.timeSpentPerWeek > 5) {
    valueScore += 15
  }

  // Collaborators add value
  if (usageData.caregiverCollaborators > 0) {
    valueScore += Math.min(15, usageData.caregiverCollaborators * 5)
  }

  valueScore = Math.min(100, valueScore)

  // Recommendation
  let recommendation: 'strongly_recommend' | 'recommend' | 'neutral' | 'not_recommended'
  if (valueScore >= 80) {
    recommendation = 'strongly_recommend'
  } else if (valueScore >= 60) {
    recommendation = 'recommend'
  } else if (valueScore >= 40) {
    recommendation = 'neutral'
  } else {
    recommendation = 'not_recommended'
  }

  return {
    monthlyCost,
    estimatedTimeSaved,
    costPerPatient,
    valueScore,
    recommendation,
  }
}
