/**
 * Landing Page Personas
 *
 * Maps the 30 landing pages to targetable personas for marketing campaigns
 * Organized by category: Health Conditions, Lifestyle, Diet Preferences, Pain Points
 */

export type LandingPageCategory = 'health-conditions' | 'lifestyle' | 'diet-preferences' | 'pain-points'

export interface LandingPagePersona {
  id: string
  name: string
  icon: string
  category: LandingPageCategory
  landingPageUrl: string
  description: string
  targetAudience: string
  painPoints: string[]
  keyFeatures: string[]
  emotionalTriggers: string[]
  adKeywords: string[]
  status: 'live' | 'coming-soon'
}

/**
 * Health Conditions Category (10 personas)
 */
export const HEALTH_CONDITION_PERSONAS: LandingPagePersona[] = [
  {
    id: 'diabetes',
    name: 'Diabetes Weight Loss',
    icon: '🩸',
    category: 'health-conditions',
    landingPageUrl: '/landing/diabetes-weight-loss.html',
    description: 'Manage diabetes while losing weight effortlessly',
    targetAudience: 'Type 2 diabetics, pre-diabetics, health-conscious individuals',
    painPoints: ['Blood sugar management', 'Medication coordination', 'Doctor recommendations', 'Carb tracking'],
    keyFeatures: ['Blood sugar tracking', 'Carb counting', 'Medication reminders', 'A1C progress'],
    emotionalTriggers: ['Health scare', 'Doctor warning', 'Family history', 'Avoid medication'],
    adKeywords: ['diabetes', 'blood sugar', 'A1C', 'carbs', 'glucose'],
    status: 'live'
  },
  {
    id: 'heart-health',
    name: 'Heart Health Weight Loss',
    icon: '❤️',
    category: 'health-conditions',
    landingPageUrl: '/landing/heart-health-weight-loss.html',
    description: 'Strengthen your heart through weight loss',
    targetAudience: 'Cardiac patients, high cholesterol, heart disease family history',
    painPoints: ['Cholesterol', 'Blood pressure', 'Heart disease risk', 'Statins'],
    keyFeatures: ['Sodium tracking', 'Heart-healthy recipes', 'BP monitoring', 'Cholesterol tracking'],
    emotionalTriggers: ['Heart scare', 'Family heart disease', 'Want to avoid surgery', 'Live longer for kids'],
    adKeywords: ['heart health', 'cholesterol', 'blood pressure', 'cardiac', 'cardiovascular'],
    status: 'live'
  },
  {
    id: 'pcos',
    name: 'PCOS Weight Loss',
    icon: '🌸',
    category: 'health-conditions',
    landingPageUrl: '/landing/pcos-weight-loss.html',
    description: 'Hormone balance through weight management',
    targetAudience: 'Women with PCOS, ages 20-40, fertility concerns',
    painPoints: ['Hormonal imbalance', 'Fertility issues', 'Irregular periods', 'Insulin resistance'],
    keyFeatures: ['Hormone tracking', 'Low-GI meal tracking', 'Cycle tracking', 'Symptom logging'],
    emotionalTriggers: ['Want to conceive', 'Frustrated with symptoms', 'Doctor recommended weight loss'],
    adKeywords: ['PCOS', 'hormones', 'fertility', 'insulin resistance', 'irregular periods'],
    status: 'live'
  },
  {
    id: 'thyroid',
    name: 'Thyroid Weight Loss',
    icon: '🦋',
    category: 'health-conditions',
    landingPageUrl: '/landing/thyroid-weight-loss.html',
    description: 'Weight loss with thyroid conditions',
    targetAudience: 'Hypothyroid patients, Hashimoto\'s, underactive thyroid',
    painPoints: ['Slow metabolism', 'Hard to lose weight', 'Fatigue', 'Medication side effects'],
    keyFeatures: ['Metabolism tracking', 'Energy logging', 'Medication reminders', 'TSH tracking'],
    emotionalTriggers: ['Frustration with weight gain', 'Feel helpless', 'Want control'],
    adKeywords: ['thyroid', 'hypothyroid', 'hashimotos', 'TSH', 'metabolism'],
    status: 'live'
  },
  {
    id: 'prediabetes',
    name: 'Prediabetes Weight Loss',
    icon: '📊',
    category: 'health-conditions',
    landingPageUrl: '/landing/prediabetes-weight-loss.html',
    description: 'Prevent diabetes through weight loss',
    targetAudience: 'Pre-diabetic adults, A1C 5.7-6.4, family history of diabetes',
    painPoints: ['Fear of diabetes', 'Doctor warning', 'Prevention urgency', 'Lifestyle change'],
    keyFeatures: ['Blood sugar tracking', 'Prevention milestones', 'Carb awareness', 'A1C goals'],
    emotionalTriggers: ['Prevent disease', 'Saw family suffer', 'Doctor scared me', 'Want to reverse'],
    adKeywords: ['prediabetes', 'prevent diabetes', 'A1C', 'blood sugar', 'prevention'],
    status: 'live'
  },
  {
    id: 'high-blood-pressure',
    name: 'High Blood Pressure Weight Loss',
    icon: '💓',
    category: 'health-conditions',
    landingPageUrl: '/landing/high-blood-pressure-weight-loss.html',
    description: 'Lower BP through weight management',
    targetAudience: 'Hypertension patients, pre-hypertensive, salt-sensitive',
    painPoints: ['High BP readings', 'Medication side effects', 'Stroke fear', 'Salt restriction'],
    keyFeatures: ['BP tracking', 'Sodium monitoring', 'DASH diet support', 'Medication tracking'],
    emotionalTriggers: ['Stroke fear', 'Want off medication', 'Family history', 'Doctor ultimatum'],
    adKeywords: ['blood pressure', 'hypertension', 'sodium', 'DASH diet', 'BP'],
    status: 'live'
  },
  {
    id: 'sleep-apnea',
    name: 'Sleep Apnea Weight Loss',
    icon: '😴',
    category: 'health-conditions',
    landingPageUrl: '/landing/sleep-apnea-weight-loss.html',
    description: 'Improve sleep through weight loss',
    targetAudience: 'Sleep apnea patients, CPAP users, snorers',
    painPoints: ['CPAP dependency', 'Poor sleep quality', 'Daytime fatigue', 'Partner complaints'],
    keyFeatures: ['Sleep tracking', 'Weight milestones', 'Energy logging', 'CPAP hours'],
    emotionalTriggers: ['Want better sleep', 'Get off CPAP', 'More energy', 'Partner frustrated'],
    adKeywords: ['sleep apnea', 'CPAP', 'snoring', 'sleep quality', 'fatigue'],
    status: 'live'
  },
  {
    id: 'joint-pain',
    name: 'Joint Pain Weight Loss',
    icon: '🦴',
    category: 'health-conditions',
    landingPageUrl: '/landing/joint-pain-weight-loss.html',
    description: 'Reduce arthritis pain through weight loss',
    targetAudience: 'Arthritis sufferers, knee pain, mobility issues',
    painPoints: ['Knee pain', 'Arthritis', 'Limited mobility', 'Pain medication'],
    keyFeatures: ['Pain tracking', 'Mobility logging', 'Anti-inflammatory foods', 'Weight milestones'],
    emotionalTriggers: ['Want to play with grandkids', 'Avoid surgery', 'Reduce pain', 'Stay active'],
    adKeywords: ['arthritis', 'joint pain', 'knee pain', 'mobility', 'inflammation'],
    status: 'live'
  },
  {
    id: 'fertility',
    name: 'Fertility Weight Loss',
    icon: '👶',
    category: 'health-conditions',
    landingPageUrl: '/landing/fertility-weight-loss.html',
    description: 'Improve fertility through weight management',
    targetAudience: 'Women trying to conceive, ages 25-40, fertility treatment patients',
    painPoints: ['Difficulty conceiving', 'Doctor recommended weight loss', 'IVF prep', 'PCOS'],
    keyFeatures: ['Cycle tracking', 'Fertility windows', 'Nutrition for conception', 'BMI goals'],
    emotionalTriggers: ['Want a baby', 'Time pressure', 'Doctor recommendation', 'Optimize fertility'],
    adKeywords: ['fertility', 'trying to conceive', 'IVF', 'pregnancy', 'conception'],
    status: 'live'
  },
  {
    id: 'postpartum',
    name: 'Postpartum Weight Loss',
    icon: '🍼',
    category: 'health-conditions',
    landingPageUrl: '/landing/postpartum-weight-loss.html',
    description: 'New mom weight loss made simple',
    targetAudience: 'New moms, breastfeeding mothers, 0-2 years postpartum',
    painPoints: ['No time', 'Exhaustion', 'Breastfeeding concerns', 'Baby weight'],
    keyFeatures: ['Quick logging', 'Breastfeeding-safe', 'Sleep-deprived friendly', 'Baby schedule'],
    emotionalTriggers: ['Feel like myself', 'Pre-baby body', 'Have energy', 'Fit into clothes'],
    adKeywords: ['postpartum', 'baby weight', 'new mom', 'breastfeeding', 'pregnancy weight'],
    status: 'live'
  }
]

/**
 * Lifestyle & Demographics Category (10 personas)
 */
export const LIFESTYLE_PERSONAS: LandingPagePersona[] = [
  {
    id: 'busy-moms',
    name: 'Busy Moms Weight Loss',
    icon: '👩‍👧‍👦',
    category: 'lifestyle',
    landingPageUrl: '/landing/busy-moms-weight-loss.html',
    description: 'Weight loss that fits your chaotic schedule',
    targetAudience: 'Working moms, stay-at-home moms, ages 30-45',
    painPoints: ['No time', 'Kids meals vs own meals', 'Exhaustion', 'Self-care guilt'],
    keyFeatures: ['30-second tracking', 'Family meal support', 'Quick wins', 'Flexible goals'],
    emotionalTriggers: ['Want energy', 'Feel confident', 'Set example for kids', 'Self-care'],
    adKeywords: ['busy mom', 'mom life', 'no time', 'quick tracking', 'family meals'],
    status: 'live'
  },
  {
    id: 'working-professionals',
    name: 'Working Professionals Weight Loss',
    icon: '💼',
    category: 'lifestyle',
    landingPageUrl: '/landing/working-professionals-weight-loss.html',
    description: 'Office-friendly weight loss strategies',
    targetAudience: 'Corporate employees, desk workers, ages 25-55',
    painPoints: ['Desk job', 'Office snacks', 'Client dinners', 'Stress eating'],
    keyFeatures: ['Work-friendly tracking', 'Restaurant database', 'Stress management', 'Desk exercises'],
    emotionalTriggers: ['Career confidence', 'Health decline', 'Want energy', 'Look professional'],
    adKeywords: ['office worker', 'desk job', 'professional', 'corporate', 'working'],
    status: 'live'
  },
  {
    id: 'seniors',
    name: 'Seniors Weight Loss',
    icon: '👴',
    category: 'lifestyle',
    landingPageUrl: '/landing/seniors-weight-loss.html',
    description: 'Safe weight loss for 60+ age group',
    targetAudience: 'Adults 60+, retirees, active seniors',
    painPoints: ['Slower metabolism', 'Medication interactions', 'Joint issues', 'Doctor concerns'],
    keyFeatures: ['Safe weight loss', 'Medication tracking', 'Gentle goals', 'Health integration'],
    emotionalTriggers: ['Stay independent', 'Play with grandkids', 'Travel', 'Quality of life'],
    adKeywords: ['seniors', 'elderly', 'retirement', '60+', 'older adults'],
    status: 'live'
  },
  {
    id: 'college-students',
    name: 'College Students Weight Loss',
    icon: '🎓',
    category: 'lifestyle',
    landingPageUrl: '/landing/college-students-weight-loss.html',
    description: 'Budget-friendly weight loss for students',
    targetAudience: 'College students, ages 18-25, dorm living',
    painPoints: ['Freshman 15', 'Dining hall food', 'Late night eating', 'Budget constraints'],
    keyFeatures: ['Budget tracking', 'Dorm-friendly', 'Student discounts', 'Campus meal plans'],
    emotionalTriggers: ['Confidence', 'Dating', 'Health', 'Prevent weight gain'],
    adKeywords: ['college', 'student', 'freshman 15', 'dorm', 'campus'],
    status: 'live'
  },
  {
    id: 'shift-workers',
    name: 'Shift Workers Weight Loss',
    icon: '🌙',
    category: 'lifestyle',
    landingPageUrl: '/landing/shift-workers-weight-loss.html',
    description: 'Weight loss for irregular schedules',
    targetAudience: 'Nurses, first responders, night shift workers',
    painPoints: ['Irregular eating', 'Sleep disruption', 'Fatigue', 'Shift work'],
    keyFeatures: ['24/7 tracking', 'Shift schedules', 'Energy tracking', 'Sleep integration'],
    emotionalTriggers: ['Health despite schedule', 'Energy', 'Fight fatigue', 'Stay healthy'],
    adKeywords: ['shift work', 'night shift', 'nurse', 'irregular schedule', '24/7'],
    status: 'live'
  },
  {
    id: 'traveling-professionals',
    name: 'Traveling Professionals Weight Loss',
    icon: '✈️',
    category: 'lifestyle',
    landingPageUrl: '/landing/traveling-professionals-weight-loss.html',
    description: 'Track meals on the go',
    targetAudience: 'Business travelers, sales reps, consultants',
    painPoints: ['Airport food', 'Hotel restaurants', 'Client dinners', 'No routine'],
    keyFeatures: ['Travel mode', 'Restaurant tracking', 'Time zones', 'Offline mode'],
    emotionalTriggers: ['Maintain progress', 'Feel good', 'Professional image', 'Health'],
    adKeywords: ['travel', 'business travel', 'frequent flyer', 'on the road', 'consultant'],
    status: 'live'
  },
  {
    id: 'single-parents',
    name: 'Single Parents Weight Loss',
    icon: '👨‍👧',
    category: 'lifestyle',
    landingPageUrl: '/landing/single-parents-weight-loss.html',
    description: 'Weight loss for single parent households',
    targetAudience: 'Single moms, single dads, sole caregivers',
    painPoints: ['Time scarcity', 'Budget', 'Exhaustion', 'Kids meals', 'No help'],
    keyFeatures: ['Ultra-quick tracking', 'Budget meals', 'Family support', 'Stress management'],
    emotionalTriggers: ['Set example', 'Have energy', 'Self-care', 'Be there for kids'],
    adKeywords: ['single parent', 'single mom', 'single dad', 'solo parent', 'alone'],
    status: 'live'
  },
  {
    id: 'caregivers',
    name: 'Caregivers Weight Loss',
    icon: '🤝',
    category: 'lifestyle',
    landingPageUrl: '/landing/caregivers-weight-loss.html',
    description: 'Self-care while caring for others',
    targetAudience: 'Adult children caring for parents, family caregivers',
    painPoints: ['Caregiver stress', 'Neglect self-care', 'Emotional eating', 'No time'],
    keyFeatures: ['Stress tracking', 'Quick logging', 'Self-care reminders', 'Caregiver support'],
    emotionalTriggers: ['Can\'t pour from empty cup', 'Stay healthy for them', 'Self-care'],
    adKeywords: ['caregiver', 'caring for parents', 'caregiver stress', 'family care'],
    status: 'live'
  },
  {
    id: 'athletes',
    name: 'Athletes Weight Loss',
    icon: '🏃',
    category: 'lifestyle',
    landingPageUrl: '/landing/athletes-weight-loss.html',
    description: 'Performance + weight management',
    targetAudience: 'Athletes, fitness enthusiasts, sports competitors',
    painPoints: ['Performance vs weight', 'Muscle loss', 'Energy for training', 'Recovery'],
    keyFeatures: ['Macro tracking', 'Performance metrics', 'Training integration', 'Body composition'],
    emotionalTriggers: ['Peak performance', 'Competitive edge', 'Lean muscle', 'Optimal weight'],
    adKeywords: ['athlete', 'sports', 'performance', 'training', 'fitness'],
    status: 'live'
  },
  {
    id: 'couples',
    name: 'Couples Weight Loss',
    icon: '💑',
    category: 'lifestyle',
    landingPageUrl: '/landing/couples-weight-loss.html',
    description: 'Lose weight together',
    targetAudience: 'Married couples, partners, ages 25-60',
    painPoints: ['Different goals', 'Accountability', 'Meal planning', 'Motivation'],
    keyFeatures: ['Partner tracking', 'Shared goals', 'Couple challenges', 'Progress comparison'],
    emotionalTriggers: ['Strengthen relationship', 'Support each other', 'Healthy together'],
    adKeywords: ['couples', 'together', 'partner', 'married', 'relationship'],
    status: 'live'
  }
]

/**
 * Diet Preferences Category (5 personas)
 */
export const DIET_PREFERENCE_PERSONAS: LandingPagePersona[] = [
  {
    id: 'vegetarian',
    name: 'Vegetarian Weight Loss',
    icon: '🌱',
    category: 'diet-preferences',
    landingPageUrl: '/landing/vegetarian-weight-loss.html',
    description: 'Plant-based weight loss tracking',
    targetAudience: 'Vegetarians, flexitarians, plant-based eaters',
    painPoints: ['Protein tracking', 'Nutrient gaps', 'Vegetarian options', 'Meal variety'],
    keyFeatures: ['Vegetarian database', 'Protein goals', 'B12 tracking', 'Plant-based recipes'],
    emotionalTriggers: ['Ethical eating', 'Health', 'Environment', 'Lifestyle alignment'],
    adKeywords: ['vegetarian', 'plant-based', 'meatless', 'veggie', 'no meat'],
    status: 'live'
  },
  {
    id: 'vegan',
    name: 'Vegan Weight Loss',
    icon: '🥑',
    category: 'diet-preferences',
    landingPageUrl: '/landing/vegan-weight-loss.html',
    description: '100% plant-based meal tracking',
    targetAudience: 'Vegans, strict plant-based, ethical eaters',
    painPoints: ['Vegan options', 'Complete protein', 'B12/iron', 'Social situations'],
    keyFeatures: ['Vegan database', 'Nutrient tracking', 'Vegan recipes', 'Restaurant filters'],
    emotionalTriggers: ['Ethics', 'Health', 'Environment', 'Animal welfare'],
    adKeywords: ['vegan', 'plant-based', 'cruelty-free', 'dairy-free', 'no animal products'],
    status: 'live'
  },
  {
    id: 'keto',
    name: 'Keto Weight Loss',
    icon: '🥓',
    category: 'diet-preferences',
    landingPageUrl: '/landing/keto-weight-loss-tracking.html',
    description: 'Macro tracking for keto dieters',
    targetAudience: 'Keto dieters, low-carb enthusiasts, ketosis trackers',
    painPoints: ['Macro ratios', 'Ketosis tracking', 'Carb limits', 'Fat goals'],
    keyFeatures: ['Keto macros', 'Net carbs', 'Ketone tracking', 'Fat/protein ratio'],
    emotionalTriggers: ['Stay in ketosis', 'Fat loss', 'Energy', 'Mental clarity'],
    adKeywords: ['keto', 'ketosis', 'low carb', 'high fat', 'ketogenic'],
    status: 'live'
  },
  {
    id: 'low-carb',
    name: 'Low-Carb Weight Loss',
    icon: '🍞',
    category: 'diet-preferences',
    landingPageUrl: '/landing/low-carb-weight-loss.html',
    description: 'Carb counting made easy',
    targetAudience: 'Low-carb dieters, carb-conscious, moderate low-carb',
    painPoints: ['Carb counting', 'Hidden carbs', 'Fiber vs net carbs', 'Sustainability'],
    keyFeatures: ['Carb tracking', 'Net carbs', 'Low-carb recipes', 'Carb goals'],
    emotionalTriggers: ['Blood sugar control', 'Weight loss', 'Less restrictive than keto'],
    adKeywords: ['low carb', 'carb counting', 'reduced carbs', 'carb conscious'],
    status: 'live'
  },
  {
    id: 'mediterranean',
    name: 'Mediterranean Diet Weight Loss',
    icon: '🫒',
    category: 'diet-preferences',
    landingPageUrl: '/landing/mediterranean-diet-weight-loss.html',
    description: 'Heart-healthy Mediterranean tracking',
    targetAudience: 'Mediterranean diet followers, heart health focused',
    painPoints: ['Portion control', 'Healthy fats', 'Whole foods', 'Meal planning'],
    keyFeatures: ['Mediterranean recipes', 'Healthy fats tracking', 'Whole foods focus'],
    emotionalTriggers: ['Heart health', 'Longevity', 'Sustainable eating', 'Delicious food'],
    adKeywords: ['mediterranean', 'heart healthy', 'olive oil', 'whole foods', 'balanced'],
    status: 'live'
  }
]

/**
 * Pain Points & Goals Category (5 personas)
 */
export const PAIN_POINT_PERSONAS: LandingPagePersona[] = [
  {
    id: 'quick-logging',
    name: 'Quick Meal Logging',
    icon: '⚡',
    category: 'pain-points',
    landingPageUrl: '/landing/quick-meal-logging.html',
    description: 'I hate tracking food',
    targetAudience: 'Busy people, tracking-averse, convenience seekers',
    painPoints: ['Tracking takes too long', 'Hate logging', 'Too tedious', 'Give up quickly'],
    keyFeatures: ['Photo tracking', '30-second logging', 'AI recognition', 'Voice input'],
    emotionalTriggers: ['Make it easy', 'No excuses', 'Actually sustainable', 'Save time'],
    adKeywords: ['quick tracking', 'fast logging', 'easy', 'convenient', 'photo tracking'],
    status: 'live'
  },
  {
    id: 'no-calorie-counting',
    name: 'No Calorie Counting Weight Loss',
    icon: '🚫',
    category: 'pain-points',
    landingPageUrl: '/landing/no-counting-calories-weight-loss.html',
    description: 'Weight loss without the math',
    targetAudience: 'Anti-counting, intuitive eaters, calorie-counting burnout',
    painPoints: ['Hate math', 'Obsessive counting', 'Burned out', 'Want freedom'],
    keyFeatures: ['Portion guidance', 'Color coding', 'Intuitive tracking', 'No numbers'],
    emotionalTriggers: ['Freedom', 'Less stress', 'Sustainable', 'Healthy relationship with food'],
    adKeywords: ['no counting', 'no calories', 'intuitive eating', 'portion control', 'stress-free'],
    status: 'live'
  },
  {
    id: 'visual-tracking',
    name: 'Visual Weight Loss Tracking',
    icon: '📊',
    category: 'pain-points',
    landingPageUrl: '/landing/visual-weight-loss-tracking.html',
    description: 'Photo-based progress tracking',
    targetAudience: 'Visual learners, progress photo enthusiasts, motivation seekers',
    painPoints: ['Numbers don\'t motivate', 'Want to see progress', 'Scale obsession', 'Non-scale victories'],
    keyFeatures: ['Progress photos', 'Visual timeline', 'Photo comparison', 'Body measurements'],
    emotionalTriggers: ['See real change', 'Motivation', 'Beyond the scale', 'Visual proof'],
    adKeywords: ['visual tracking', 'progress photos', 'before after', 'photo tracking', 'see results'],
    status: 'live'
  },
  {
    id: 'family-meal-planning',
    name: 'Family Meal Planning Weight Loss',
    icon: '👨‍👩‍👧‍👦',
    category: 'pain-points',
    landingPageUrl: '/landing/family-meal-planning-weight-loss.html',
    description: 'Coordinate family meals + weight loss',
    targetAudience: 'Parents, family cooks, household managers',
    painPoints: ['Cook separate meals', 'Kids vs adult food', 'Meal planning', 'Time constraints'],
    keyFeatures: ['Family recipes', 'Shared meals', 'Kid-friendly', 'Meal planning calendar'],
    emotionalTriggers: ['One meal for all', 'Save time', 'Family health', 'Set example'],
    adKeywords: ['family meals', 'meal planning', 'family dinner', 'kids meals', 'family nutrition'],
    status: 'live'
  },
  {
    id: 'medication-management',
    name: 'Medication + Weight Loss Tracking',
    icon: '💊',
    category: 'pain-points',
    landingPageUrl: '/landing/medication-management-weight-loss.html',
    description: 'Track meds alongside weight loss',
    targetAudience: 'Chronic condition patients, multiple medications, health-conscious',
    painPoints: ['Multiple meds', 'Drug interactions', 'Timing', 'Side effects on weight'],
    keyFeatures: ['Medication tracker', 'Reminder system', 'Side effect logging', 'Drug interaction alerts'],
    emotionalTriggers: ['Stay organized', 'Avoid mistakes', 'Health management', 'Peace of mind'],
    adKeywords: ['medication tracking', 'pill reminder', 'med management', 'prescriptions', 'health tracking'],
    status: 'live'
  }
]

/**
 * Get all landing page personas
 */
export function getAllLandingPagePersonas(): LandingPagePersona[] {
  return [
    ...HEALTH_CONDITION_PERSONAS,
    ...LIFESTYLE_PERSONAS,
    ...DIET_PREFERENCE_PERSONAS,
    ...PAIN_POINT_PERSONAS
  ]
}

/**
 * Get personas by category
 */
export function getPersonasByCategory(category: LandingPageCategory): LandingPagePersona[] {
  switch (category) {
    case 'health-conditions':
      return HEALTH_CONDITION_PERSONAS
    case 'lifestyle':
      return LIFESTYLE_PERSONAS
    case 'diet-preferences':
      return DIET_PREFERENCE_PERSONAS
    case 'pain-points':
      return PAIN_POINT_PERSONAS
  }
}

/**
 * Get persona by ID
 */
export function getLandingPagePersonaById(id: string): LandingPagePersona | undefined {
  return getAllLandingPagePersonas().find(p => p.id === id)
}

/**
 * Category metadata
 */
export const LANDING_PAGE_CATEGORIES = {
  'health-conditions': {
    name: 'Health Conditions',
    icon: '🏥',
    description: 'Weight loss solutions for specific medical conditions',
    count: HEALTH_CONDITION_PERSONAS.length
  },
  'lifestyle': {
    name: 'Lifestyle & Demographics',
    icon: '👥',
    description: 'Weight loss for different lifestyles and life stages',
    count: LIFESTYLE_PERSONAS.length
  },
  'diet-preferences': {
    name: 'Diet Preferences',
    icon: '🥗',
    description: 'Weight loss aligned with your eating style',
    count: DIET_PREFERENCE_PERSONAS.length
  },
  'pain-points': {
    name: 'Goals & Pain Points',
    icon: '🎯',
    description: 'Solutions for specific weight loss challenges',
    count: PAIN_POINT_PERSONAS.length
  }
} as const
