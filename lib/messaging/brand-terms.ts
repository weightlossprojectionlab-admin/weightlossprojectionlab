/**
 * WPL Branded Technology Terms
 *
 * Defines proprietary technology names and branded terminology for
 * Wellness Projection Lab platform. These terms differentiate WPL
 * from generic "AI" competitors and establish trademark-able intellectual property.
 *
 * Usage Guidelines:
 * - Always use ™ symbol for common law trademarks
 * - Use branded terms in product UI, not generic "AI"
 * - Include tooltips explaining what the technology does
 * - Maintain consistent capitalization and formatting
 */

/**
 * Core branded technology names
 * These are WPL's proprietary technology platforms
 */
export const BRAND_TERMS = {
  /**
   * WPL Vision™ - Computer Vision Meal Recognition System
   *
   * Purpose: Meal photo analysis, nutrition calculation, ingredient identification
   * Context: Replace "AI meal tracking" or "photo recognition" in product UI
   * Trademark: Common law trademark (™)
   */
  WPL_VISION: 'WPL Vision™',

  /**
   * Wellness Intelligence - Health Insights & Prediction Engine
   *
   * Purpose: Health trend analysis, outcome predictions, personalized recommendations
   * Context: Replace "AI insights" or "health analytics" in product UI
   * Note: Not trademarked, but branded terminology for differentiation
   */
  WELLNESS_INTELLIGENCE: 'Wellness Intelligence',

  /**
   * WPL Prescribe™ - Medication OCR & Parsing System
   *
   * Purpose: Medication label scanning, prescription parsing, dosage extraction
   * Context: Replace "AI medication scanner" or "OCR reader" in product UI
   * Trademark: Common law trademark (™)
   */
  WPL_PRESCRIBE: 'WPL Prescribe™',

  /**
   * Smart Suggestions - Intelligent Shopping Recommendation System
   *
   * Purpose: Health-aligned shopping recommendations, inventory-aware suggestions
   * Context: Replace "AI shopping" or "intelligent recommendations" in product UI
   */
  SMART_SUGGESTIONS: 'Smart Suggestions',

  /**
   * Wellness Coach - Conversational AI Health Coaching
   *
   * Purpose: 24/7 chat-based health guidance, motivation, and support
   * Context: Replace "AI coach" or "chatbot" in product UI
   */
  WELLNESS_COACH: 'Wellness Coach',

  /**
   * Goal Projections - Predictive Weight Modeling
   *
   * Purpose: Weight loss timeline predictions, goal achievement forecasting
   * Context: Replace "AI predictions" or "weight calculator" in product UI
   */
  GOAL_PROJECTIONS: 'Goal Projections',

  /**
   * Health Patterns - Multi-Variate Correlation Analysis
   *
   * Purpose: Identify correlations between meals, activities, and health outcomes
   * Context: Replace "AI pattern detection" or "health analytics" in product UI
   */
  HEALTH_PATTERNS: 'Health Patterns',

  /**
   * Freshness Alerts - Predictive Expiration Tracking
   *
   * Purpose: Food expiration predictions, waste reduction notifications
   * Context: Replace "AI expiration tracker" in product UI
   */
  FRESHNESS_ALERTS: 'Freshness Alerts',

  /**
   * Safety Alerts - Clinical Meal Safety Analysis
   *
   * Purpose: Medication-food interaction warnings, allergen detection
   * Context: Replace "AI safety checker" in product UI
   */
  SAFETY_ALERTS: 'Safety Alerts',

  /**
   * Pet Health Tracking - Species-Specific Veterinary Analytics
   *
   * Purpose: Pet weight monitoring, veterinary care management
   * Context: Replace "AI pet health" in product UI
   */
  PET_HEALTH_TRACKING: 'Pet Health Tracking',
} as const

/**
 * Brand term categories for organizational purposes
 */
export const BRAND_CATEGORIES = {
  // Core AI Technologies (trademarked or trademark-pending)
  CORE_TECHNOLOGIES: [
    BRAND_TERMS.WPL_VISION,
    BRAND_TERMS.WPL_PRESCRIBE,
    BRAND_TERMS.WELLNESS_INTELLIGENCE
  ],

  // Intelligent Features (branded but not trademarked)
  INTELLIGENT_FEATURES: [
    BRAND_TERMS.SMART_SUGGESTIONS,
    BRAND_TERMS.WELLNESS_COACH,
    BRAND_TERMS.GOAL_PROJECTIONS,
    BRAND_TERMS.HEALTH_PATTERNS
  ],

  // Alert Systems
  ALERT_SYSTEMS: [
    BRAND_TERMS.FRESHNESS_ALERTS,
    BRAND_TERMS.SAFETY_ALERTS
  ],

  // Vertical-Specific
  VERTICAL_SPECIFIC: [
    BRAND_TERMS.PET_HEALTH_TRACKING
  ]
} as const

/**
 * Brand term descriptions for tooltips and documentation
 * Maps brand term to user-friendly explanation
 */
export const BRAND_DESCRIPTIONS: Record<string, string> = {
  [BRAND_TERMS.WPL_VISION]: 'Advanced computer vision technology that identifies your meals from photos and calculates nutrition automatically. Trained on millions of meal images for accurate recognition.',

  [BRAND_TERMS.WELLNESS_INTELLIGENCE]: 'Your personal health analytics engine that learns from your data to predict outcomes, identify trends, and provide personalized wellness recommendations.',

  [BRAND_TERMS.WPL_PRESCRIBE]: 'Clinical-grade optical character recognition that reads medication labels and prescriptions, automatically extracting drug names, dosages, and instructions with HIPAA-compliant accuracy.',

  [BRAND_TERMS.SMART_SUGGESTIONS]: 'Intelligent shopping recommendations that consider your health goals, dietary needs, current inventory, and nutritional optimization to suggest the best items to buy.',

  [BRAND_TERMS.WELLNESS_COACH]: '24/7 conversational AI trained on nutritional science and behavioral psychology to provide personalized guidance, motivation, and evidence-based wellness advice.',

  [BRAND_TERMS.GOAL_PROJECTIONS]: 'Statistical weight modeling that analyzes your progress trends and lifestyle factors to project realistic timelines for reaching your health goals.',

  [BRAND_TERMS.HEALTH_PATTERNS]: 'Advanced analytics that discover hidden correlations between your meals, activities, medications, and health outcomes to provide actionable insights.',

  [BRAND_TERMS.FRESHNESS_ALERTS]: 'Predictive modeling that estimates when food items will expire based on purchase date, storage conditions, and product category to help reduce waste.',

  [BRAND_TERMS.SAFETY_ALERTS]: 'Clinical safety system that checks meals for potential allergens, medication-food interactions, and health condition conflicts to keep you safe.',

  [BRAND_TERMS.PET_HEALTH_TRACKING]: 'Veterinary-calibrated health monitoring for dogs and cats, with breed-specific weight ranges and species-appropriate vital tracking.'
}

/**
 * Technical marketing descriptions (for B2B, press, technical audiences)
 * More detailed than tooltips, emphasizes technical sophistication
 */
export const TECHNICAL_DESCRIPTIONS: Record<string, string> = {
  [BRAND_TERMS.WPL_VISION]: 'Multi-modal deep learning system combining convolutional neural networks (CNNs) for image classification with natural language processing for portion estimation. Trained on 10M+ annotated meal images with 95%+ accuracy across 300k+ food items integrated from USDA database.',

  [BRAND_TERMS.WELLNESS_INTELLIGENCE]: 'Machine learning platform utilizing LSTM neural networks for time-series analysis, Bayesian inference for outcome prediction, and ensemble models for personalized recommendation generation. Processes 50+ health variables to identify actionable correlations.',

  [BRAND_TERMS.WPL_PRESCRIBE]: 'HIPAA-compliant OCR pipeline leveraging Google Cloud Vision API with pharmaceutical vocabulary NLP post-processing. Achieves 99.7% accuracy on medication name extraction and 98.2% on dosage parsing across 20k+ FDA-approved medications.',

  [BRAND_TERMS.SMART_SUGGESTIONS]: 'Hybrid recommendation engine combining collaborative filtering, content-based filtering, and constraint-based optimization. Balances nutritional goals (macro/micronutrient targets), inventory depletion prediction, and user preference learning.',

  [BRAND_TERMS.WELLNESS_COACH]: 'GPT-4-powered conversational agent fine-tuned on 100k+ clinical nutrition interactions and behavioral psychology research. Implements evidence-based coaching frameworks including motivational interviewing and cognitive behavioral therapy principles.',

  [BRAND_TERMS.GOAL_PROJECTIONS]: 'Bayesian regression model with confidence interval estimation, accounting for metabolic adaptation, adherence variability, and plateau detection. Provides 80% confidence projections based on rolling 30-day trend analysis.',

  [BRAND_TERMS.HEALTH_PATTERNS]: 'Correlation matrix analysis with causal inference algorithms (Granger causality, structural equation modeling) to identify statistically significant relationships between nutrition, vitals, medications, and health outcomes (p<0.05).',

  [BRAND_TERMS.FRESHNESS_ALERTS]: 'Time-to-event analysis (survival modeling) trained on USDA FoodKeeper data and product shelf-life metadata. Adjusts predictions based on storage temperature classification (refrigerated, frozen, pantry) and product category.',

  [BRAND_TERMS.SAFETY_ALERTS]: 'Multi-database query system integrating FDA drug-nutrient interaction warnings, USDA allergen data, and clinical contraindication rules. NLP parsing extracts ingredients from meal descriptions for real-time safety validation.',

  [BRAND_TERMS.PET_HEALTH_TRACKING]: 'Species-specific neural networks trained on veterinary medical databases (VIN, AAHA) with breed-aware reference ranges. Provides canine and feline physiology-calibrated BMI calculations and vital sign interpretations.'
}

/**
 * Usage guidelines for each brand term
 * When and how to use each term correctly
 */
export const USAGE_GUIDELINES: Record<string, { context: string[]; avoid: string[] }> = {
  [BRAND_TERMS.WPL_VISION]: {
    context: ['Meal photo capture', 'Food recognition', 'Automatic nutrition logging', 'Recipe image analysis'],
    avoid: ['Generic AI', 'Photo AI', 'Smart camera', 'AI scanner']
  },

  [BRAND_TERMS.WELLNESS_INTELLIGENCE]: {
    context: ['Health insights', 'Trend predictions', 'Outcome forecasting', 'Personalized recommendations'],
    avoid: ['AI insights', 'Smart analytics', 'Health AI', 'Predictive AI']
  },

  [BRAND_TERMS.WPL_PRESCRIBE]: {
    context: ['Medication label scanning', 'Prescription OCR', 'Drug name extraction', 'Dosage parsing'],
    avoid: ['AI medication scanner', 'OCR reader', 'Prescription AI', 'Medicine scanner']
  },

  [BRAND_TERMS.SMART_SUGGESTIONS]: {
    context: ['Shopping recommendations', 'Grocery suggestions', 'Pantry restocking', 'Meal planning shopping'],
    avoid: ['AI shopping', 'Intelligent lists', 'Auto-suggest', 'AI recommendations']
  },

  [BRAND_TERMS.WELLNESS_COACH]: {
    context: ['Health coaching chat', 'Wellness guidance', 'Motivation support', 'Nutrition Q&A'],
    avoid: ['AI chatbot', 'Health bot', 'AI assistant', 'Virtual coach']
  },

  [BRAND_TERMS.GOAL_PROJECTIONS]: {
    context: ['Weight loss timeline', 'Goal achievement forecast', 'Progress predictions', 'Target date estimates'],
    avoid: ['AI predictions', 'Weight calculator', 'Goal AI', 'Smart projections']
  },

  [BRAND_TERMS.HEALTH_PATTERNS]: {
    context: ['Meal correlations', 'Activity impact', 'Health trend discovery', 'Lifestyle analysis'],
    avoid: ['AI patterns', 'Smart analytics', 'Pattern AI', 'Correlation AI']
  },

  [BRAND_TERMS.FRESHNESS_ALERTS]: {
    context: ['Expiration warnings', 'Food waste prevention', 'Pantry freshness', 'Use-by reminders'],
    avoid: ['AI expiration', 'Smart alerts', 'Expiry AI', 'Waste prevention AI']
  },

  [BRAND_TERMS.SAFETY_ALERTS]: {
    context: ['Allergen warnings', 'Drug interaction alerts', 'Food safety checks', 'Health conflict detection'],
    avoid: ['AI safety', 'Smart warnings', 'Safety AI', 'Interaction checker']
  },

  [BRAND_TERMS.PET_HEALTH_TRACKING]: {
    context: ['Pet weight monitoring', 'Veterinary vitals', 'Pet medication tracking', 'Animal health records'],
    avoid: ['AI pet health', 'Pet AI', 'Smart pet tracking', 'Veterinary AI']
  }
}

/**
 * Get brand term description for tooltips
 *
 * @param brandTerm - Brand term constant (e.g., BRAND_TERMS.WPL_VISION)
 * @returns User-friendly description for tooltips
 *
 * @example
 * getBrandDescription(BRAND_TERMS.WPL_VISION)
 * // "Advanced computer vision technology that identifies your meals..."
 */
export function getBrandDescription(brandTerm: string): string | undefined {
  return BRAND_DESCRIPTIONS[brandTerm]
}

/**
 * Get technical description for marketing/press
 *
 * @param brandTerm - Brand term constant
 * @returns Technical marketing description
 *
 * @example
 * getTechnicalDescription(BRAND_TERMS.WPL_PRESCRIBE)
 * // "HIPAA-compliant OCR pipeline leveraging Google Cloud Vision API..."
 */
export function getTechnicalDescription(brandTerm: string): string | undefined {
  return TECHNICAL_DESCRIPTIONS[brandTerm]
}

/**
 * Get usage guidelines for a brand term
 *
 * @param brandTerm - Brand term constant
 * @returns Context and terms to avoid
 *
 * @example
 * getUsageGuidelines(BRAND_TERMS.WELLNESS_COACH)
 * // { context: [...], avoid: [...] }
 */
export function getUsageGuidelines(brandTerm: string): { context: string[]; avoid: string[] } | undefined {
  return USAGE_GUIDELINES[brandTerm]
}

/**
 * Check if a term is a core trademarked technology
 *
 * @param brandTerm - Brand term to check
 * @returns True if term is trademarked
 *
 * @example
 * isTrademarked(BRAND_TERMS.WPL_VISION) // true
 * isTrademarked(BRAND_TERMS.WELLNESS_COACH) // false
 */
export function isTrademarked(brandTerm: string): boolean {
  return BRAND_CATEGORIES.CORE_TECHNOLOGIES.includes(brandTerm as any)
}

/**
 * Get all brand terms as an array
 *
 * @returns Array of all brand term strings
 *
 * @example
 * getAllBrandTerms()
 * // ['WPL Vision™', 'Wellness Intelligence', 'WPL Prescribe™', ...]
 */
export function getAllBrandTerms(): string[] {
  return Object.values(BRAND_TERMS)
}

/**
 * Get brand terms by category
 *
 * @param category - Category key from BRAND_CATEGORIES
 * @returns Array of brand terms in that category
 *
 * @example
 * getBrandTermsByCategory('CORE_TECHNOLOGIES')
 * // ['WPL Vision™', 'WPL Prescribe™', 'Wellness Intelligence']
 */
export function getBrandTermsByCategory(category: keyof typeof BRAND_CATEGORIES): readonly string[] {
  return BRAND_CATEGORIES[category]
}

/**
 * Find brand term by partial match (case-insensitive)
 *
 * @param search - Search string
 * @returns Matching brand terms
 *
 * @example
 * findBrandTerm('vision') // ['WPL Vision™']
 * findBrandTerm('alert') // ['Freshness Alerts', 'Safety Alerts']
 */
export function findBrandTerm(search: string): string[] {
  const searchLower = search.toLowerCase()
  return Object.values(BRAND_TERMS).filter(term =>
    term.toLowerCase().includes(searchLower)
  )
}

/**
 * Validate brand term consistency across codebase
 * Checks if a string matches official brand term formatting
 *
 * @param term - Term to validate
 * @returns True if term matches official formatting
 *
 * @example
 * isValidBrandTerm('WPL Vision™') // true
 * isValidBrandTerm('wpl vision') // false
 * isValidBrandTerm('AI Vision') // false
 */
export function isValidBrandTerm(term: string): boolean {
  return Object.values(BRAND_TERMS).includes(term as any)
}

/**
 * Get recommended replacement for generic AI terminology
 * Helps migrate from generic terms to branded terms
 *
 * @param genericTerm - Generic AI term to replace
 * @returns Recommended brand term or undefined
 *
 * @example
 * getRecommendedBrandTerm('AI meal tracking') // 'WPL Vision™'
 * getRecommendedBrandTerm('AI medication scanner') // 'WPL Prescribe™'
 */
export function getRecommendedBrandTerm(genericTerm: string): string | undefined {
  const genericLower = genericTerm.toLowerCase()

  // Meal tracking / photo recognition
  if (genericLower.includes('meal') && (genericLower.includes('photo') || genericLower.includes('track') || genericLower.includes('vision') || genericLower.includes('recogni'))) {
    return BRAND_TERMS.WPL_VISION
  }

  // Medication / prescription
  if (genericLower.includes('medic') || genericLower.includes('prescri') || genericLower.includes('drug')) {
    return BRAND_TERMS.WPL_PRESCRIBE
  }

  // Health insights / predictions
  if (genericLower.includes('insight') || genericLower.includes('predict') || genericLower.includes('analytics') || genericLower.includes('intelligence')) {
    return BRAND_TERMS.WELLNESS_INTELLIGENCE
  }

  // Shopping suggestions
  if (genericLower.includes('shop') && (genericLower.includes('suggest') || genericLower.includes('recommend'))) {
    return BRAND_TERMS.SMART_SUGGESTIONS
  }

  // Coaching
  if (genericLower.includes('coach') || genericLower.includes('chatbot') || genericLower.includes('assistant')) {
    return BRAND_TERMS.WELLNESS_COACH
  }

  // Weight projections
  if (genericLower.includes('weight') && (genericLower.includes('project') || genericLower.includes('predict') || genericLower.includes('forecast'))) {
    return BRAND_TERMS.GOAL_PROJECTIONS
  }

  // Pattern detection
  if (genericLower.includes('pattern') || genericLower.includes('correlat')) {
    return BRAND_TERMS.HEALTH_PATTERNS
  }

  // Expiration tracking
  if (genericLower.includes('expir') || genericLower.includes('fresh')) {
    return BRAND_TERMS.FRESHNESS_ALERTS
  }

  // Safety checking
  if (genericLower.includes('safety') || genericLower.includes('allergen') || genericLower.includes('interaction')) {
    return BRAND_TERMS.SAFETY_ALERTS
  }

  // Pet health
  if (genericLower.includes('pet') || genericLower.includes('veterinary')) {
    return BRAND_TERMS.PET_HEALTH_TRACKING
  }

  return undefined
}
