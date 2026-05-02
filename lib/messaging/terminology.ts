/**
 * Centralized Messaging & Terminology System
 *
 * Provides context-aware messaging for features across different platform layers:
 * - SEO: Search-discoverable terms that accurately reflect each feature's tech layer
 *        (AI for vision/OCR; self-teaching for personalization; smart for rule-based)
 * - Marketing: Technical authority for healthcare credibility
 * - Product: Branded WPL technology for trust & differentiation
 *
 * Architecture note: WPL uses two distinct technology layers. AI (Gemini Vision)
 * powers photo-based capture (meals, medical document OCR). Self-teaching ML
 * (WPL-owned) powers personalization, projections, and recommendations that
 * learn each family member's patterns over time. Terminology in this file
 * reflects which layer actually powers each feature — do not inflate.
 */

/**
 * Messaging contexts determine which terminology variant to use
 * - seo: Search-optimized terms accurate to the feature's tech layer
 * - marketing: Technical authority (builds healthcare credibility)
 * - product: Branded WPL terms (user-facing trust & differentiation)
 */
export type MessagingContext = 'seo' | 'marketing' | 'product'

/**
 * Feature messaging structure for multi-context terminology
 * Each feature can have different messaging for different contexts
 */
export interface FeatureMessaging {
  seo: {
    headline: string
    description: string
    keywords?: string[]
  }
  marketing: {
    headline: string
    description: string
    technicalDetails?: string
  }
  product: {
    label: string
    tooltip?: string
    shortDescription?: string
  }
}

/**
 * Core feature messaging constants
 * Maps feature identifiers to context-aware terminology
 */
export const FEATURE_MESSAGING: Record<string, FeatureMessaging> = {
  // Meal Tracking & Computer Vision
  mealTracking: {
    seo: {
      headline: 'AI-Powered Meal Tracking',
      description: 'Track meals with AI photo recognition and automatic nutrition analysis',
      keywords: ['AI meal tracking', 'photo nutrition analysis', 'AI food recognition']
    },
    marketing: {
      headline: 'Computer Vision Meal Analysis',
      description: 'Advanced neural network technology for precise meal identification and nutritional breakdown',
      technicalDetails: 'Multi-modal deep learning models trained on 10M+ meal images'
    },
    product: {
      label: 'WPL Vision™',
      tooltip: 'Snap a photo and let WPL Vision™ identify your meal and calculate nutrition automatically',
      shortDescription: 'Photo meal tracking'
    }
  },

  // Health Insights & Predictions (self-teaching ML)
  healthInsights: {
    seo: {
      headline: 'Self-Teaching Health Insights & Predictions',
      description: 'Personalized health insights, weight predictions, and wellness recommendations that adapt to your family\'s patterns over time',
      keywords: ['self-teaching health insights', 'predictive health analytics', 'personalized wellness insights']
    },
    marketing: {
      headline: 'Predictive Health Analytics Engine',
      description: 'Self-teaching ML algorithms analyze your health data to identify trends, predict outcomes, and provide evidence-based recommendations that adapt as new data accumulates',
      technicalDetails: 'Time-series analysis with statistical models for outcome prediction; learns each family member\'s baseline over time'
    },
    product: {
      label: 'Wellness Intelligence',
      tooltip: 'Wellness Intelligence analyzes your health patterns to predict trends and suggest personalized improvements',
      shortDescription: 'Smart health insights'
    }
  },

  // Medication OCR & Parsing
  medicationParsing: {
    seo: {
      headline: 'AI Medication Label Scanner',
      description: 'Scan medication labels with AI OCR technology for instant digital medication records',
      keywords: ['AI medication scanner', 'OCR prescription reader', 'AI medication tracker']
    },
    marketing: {
      headline: 'Clinical-Grade OCR & NLP Medication Parser',
      description: 'HIPAA-compliant optical character recognition with natural language processing to extract medication data from labels and prescriptions',
      technicalDetails: 'Multi-language OCR with pharmaceutical vocabulary NLP for 99.7% accuracy'
    },
    product: {
      label: 'WPL Prescribe™',
      tooltip: 'WPL Prescribe™ reads medication labels and automatically creates your medication list with dosage reminders',
      shortDescription: 'Scan medication labels'
    }
  },

  // Smart Shopping Suggestions (self-teaching ML, rule-based + collaborative filtering)
  shoppingSuggestions: {
    seo: {
      headline: 'Self-Teaching Smart Shopping Lists',
      description: 'Adaptive shopping suggestions that learn what your household actually buys, based on health goals, inventory, and meal plans',
      keywords: ['self-teaching shopping list', 'smart grocery suggestions', 'adaptive meal planning']
    },
    marketing: {
      headline: 'Self-Teaching Shopping Recommendation Engine',
      description: 'Multi-factor recommendation system combining health goals, dietary restrictions, inventory depletion, and nutritional optimization — learns your household\'s actual purchase patterns over time',
      technicalDetails: 'Collaborative filtering with constraint-based optimization for health-aligned shopping'
    },
    product: {
      label: 'Smart Suggestions',
      tooltip: 'Get personalized shopping suggestions based on your health goals, pantry inventory, and preferences',
      shortDescription: 'Intelligent shopping'
    }
  },

  // Recipe Generation (self-teaching ML, with Gemini fallback for missing recipe steps)
  recipeGeneration: {
    seo: {
      headline: 'Self-Teaching Recipe Recommendations',
      description: 'Personalized recipe recommendations that adapt to your family\'s inventory, health goals, restrictions, and preferences over time',
      keywords: ['self-teaching recipe recommendations', 'personalized recipes', 'inventory recipe creator']
    },
    marketing: {
      headline: 'Adaptive Recipe Recommendation System',
      description: 'Self-teaching ML uses collaborative filtering on product associations and family preferences to recommend recipes optimized for your health conditions and available ingredients. Gemini Flash fills in missing recipe steps when needed.',
      technicalDetails: 'Collaborative filtering with product-association mining; Gemini Flash Lite for recipe-step generation when inventory matches a recipe with incomplete instructions'
    },
    product: {
      label: 'Recipe Recommendations',
      tooltip: 'Get recipe ideas tuned to your pantry ingredients, health goals, and taste preferences',
      shortDescription: 'Personalized recipes'
    }
  },

  // Self-Teaching Coach (ROADMAP — not yet shipped; will be data-driven coaching, NOT a conversational LLM chatbot)
  aiCoaching: {
    seo: {
      headline: 'Self-Teaching Wellness Coach (Coming Soon)',
      description: 'Data-driven coaching surfaced from your family\'s accumulated patterns — not a chatbot. Coming soon.',
      keywords: ['self-teaching wellness coach', 'data-driven health coach', 'personalized coaching']
    },
    marketing: {
      headline: 'Predictive Wellness Coaching',
      description: 'Self-teaching ML coaching surfaced from each family member\'s accumulated meal, vitals, weight, and adherence data. Not a conversational chatbot — it\'s evidence-based guidance derived from your actual patterns.',
      technicalDetails: 'Pattern detection on time-series health data with rule-based intervention suggestions; roadmap feature, not yet shipped'
    },
    product: {
      label: 'Predictive Coach',
      tooltip: 'Predictive coaching surfaces what your data is telling us — personalized guidance from your family\'s patterns. (Coming soon.)',
      shortDescription: 'Data-driven coaching (roadmap)'
    }
  },

  // Weight Projections (self-teaching ML, statistical time-series)
  weightProjections: {
    seo: {
      headline: 'Self-Teaching Weight Loss Projections',
      description: 'Self-teaching weight projections that learn your body\'s actual response patterns to show when you\'ll reach your goal',
      keywords: ['self-teaching weight projection', 'weight loss calculator', 'personalized goal projections']
    },
    marketing: {
      headline: 'Predictive Weight Modeling',
      description: 'Statistical time-series models analyze your weight trends and lifestyle factors to project realistic goal achievement timelines — refining as more data accumulates',
      technicalDetails: 'Bayesian regression with confidence intervals for evidence-based projections'
    },
    product: {
      label: 'Goal Projections',
      tooltip: 'See when you\'re projected to reach your goal based on your current progress and trends',
      shortDescription: 'Weight predictions'
    }
  },

  // Nutrition Analysis (Gemini Vision = real AI; ACCURATE to call this AI)
  nutritionAnalysis: {
    seo: {
      headline: 'AI Nutrition Analysis',
      description: 'Instant AI-powered nutrition facts from meal photos and food descriptions, powered by Gemini Vision',
      keywords: ['AI nutrition calculator', 'meal nutrition AI', 'automatic calorie counter']
    },
    marketing: {
      headline: 'Multi-Modal Nutrition Computation',
      description: 'Gemini Vision estimates portion sizes and computes comprehensive macronutrient breakdowns from images or text descriptions',
      technicalDetails: 'Gemini Vision 2.5 Pro for image analysis with USDA FoodData Central integration for 300k+ foods'
    },
    product: {
      label: 'Nutrition Analysis',
      tooltip: 'Automatically calculate calories, protein, carbs, and fats from your meals',
      shortDescription: 'Auto nutrition tracking'
    }
  },

  // Health Correlations (self-teaching ML, statistical correlation analysis)
  healthCorrelations: {
    seo: {
      headline: 'Self-Teaching Health Pattern Detection',
      description: 'Discover how your meals, activities, and lifestyle affect your health — patterns get more accurate the longer you use it',
      keywords: ['self-teaching health patterns', 'nutrition correlation', 'health trend analysis']
    },
    marketing: {
      headline: 'Multi-Variate Health Correlation Analysis',
      description: 'Self-teaching statistical learning identifies correlations between nutrition, vitals, medications, and health outcomes — building a personalized model for each family member',
      technicalDetails: 'Correlation matrices with causal inference for actionable health recommendations'
    },
    product: {
      label: 'Health Patterns',
      tooltip: 'Discover how your meals and activities impact your weight, energy, and health metrics',
      shortDescription: 'Pattern insights'
    }
  },

  // Appointment Recommendations (heuristic engine on weight trends, vital thresholds, appointment intervals — NOT USPSTF clinical decision support)
  appointmentRecommendations: {
    seo: {
      headline: 'Smart Appointment Reminders',
      description: 'Reminders for nutritionist, doctor, and follow-up visits based on your weight trends, vital sign patterns, and time since last appointment',
      keywords: ['smart appointment reminders', 'weight loss check-in', 'health appointment scheduler']
    },
    marketing: {
      headline: 'Heuristic Appointment Recommendations',
      description: 'Pattern-based suggestions for when to see a nutritionist, doctor, or specialist — driven by stalled weight loss, vital sign trends, and appointment cadence',
      technicalDetails: 'Heuristic rule engine evaluating weight progress, vital sign thresholds, and appointment intervals. Not a USPSTF or clinical decision support system; does not codify Recommendation Statements or grade screenings.'
    },
    product: {
      label: 'Checkup Reminders',
      tooltip: 'Get timely reminders for doctor visits and follow-ups based on your weight progress, vitals, and appointment history',
      shortDescription: 'Appointment reminders'
    }
  },

  // Expiration Predictions (self-teaching ML on shelf-life data)
  expirationPredictions: {
    seo: {
      headline: 'Self-Teaching Food Expiration Tracker',
      description: 'Predicts when your food will expire — learning from your household\'s storage and consumption patterns to reduce waste',
      keywords: ['food expiration tracker', 'food waste prevention', 'smart pantry management']
    },
    marketing: {
      headline: 'Predictive Inventory Degradation Modeling',
      description: 'Self-teaching ML models trained on shelf-life data predict optimal consumption windows based on storage conditions and product categories',
      technicalDetails: 'Time-to-event analysis with environmental factor adjustment for accurate predictions'
    },
    product: {
      label: 'Freshness Alerts',
      tooltip: 'Get notified before food expires so you can use it in time and reduce waste',
      shortDescription: 'Expiration tracking'
    }
  },

  // Family Health Dashboard
  familyHealthDashboard: {
    seo: {
      headline: 'AI Family Health Dashboard',
      description: 'Monitor entire family health with AI insights, tracking multiple people and pets in one place',
      keywords: ['family health tracker', 'multi-person health AI', 'household wellness dashboard']
    },
    marketing: {
      headline: 'Unified Multi-Patient Analytics Platform',
      description: 'Aggregate health intelligence across household members with role-based access control and HIPAA-compliant data segregation',
      technicalDetails: 'RBAC-secured multi-tenant architecture with patient-level data isolation'
    },
    product: {
      label: 'Family Dashboard',
      tooltip: 'See health overview for everyone in your household - humans and pets - in one unified dashboard',
      shortDescription: 'Household health tracking'
    }
  },

  // Veterinary Intelligence (self-teaching ML, species-specific analytics)
  veterinaryIntelligence: {
    seo: {
      headline: 'Self-Teaching Pet Health Tracking',
      description: 'Track your pet\'s weight, medications, and vet appointments with self-teaching pet health insights tuned to your specific animal',
      keywords: ['self-teaching pet health tracker', 'pet weight tracking', 'veterinary health analytics']
    },
    marketing: {
      headline: 'Species-Specific Veterinary Health Analytics',
      description: 'Self-teaching ML calibrated for canine and feline physiology provides breed-aware health monitoring and veterinary care recommendations that adapt to your specific pet',
      technicalDetails: 'Species-specific statistical models on veterinary care guidelines and breed standards'
    },
    product: {
      label: 'Pet Health Tracking',
      tooltip: 'Monitor your pet\'s health with veterinary-calibrated tracking for weight, medications, and wellness',
      shortDescription: 'Pet health monitoring'
    }
  },

  // Barcode Scanning
  barcodeScanning: {
    seo: {
      headline: 'AI Barcode Scanner for Groceries',
      description: 'Scan barcodes with AI to instantly add products to inventory and shopping lists',
      keywords: ['barcode scanner app', 'grocery barcode reader', 'product scanner AI']
    },
    marketing: {
      headline: 'Computer Vision Barcode Recognition',
      description: 'Real-time barcode detection with product database integration for instant nutritional data and inventory management',
      technicalDetails: 'CNN-based barcode localization with Open Food Facts API integration for 2M+ products'
    },
    product: {
      label: 'Barcode Scanner',
      tooltip: 'Scan product barcodes to quickly add items to your pantry and see nutrition information',
      shortDescription: 'Quick barcode scanning'
    }
  },

  // Meal Safety Analysis
  mealSafety: {
    seo: {
      headline: 'AI Meal Safety Checker',
      description: 'AI analyzes your meals for food safety, allergen warnings, and health condition compatibility',
      keywords: ['AI food safety', 'allergen detection AI', 'meal safety checker']
    },
    marketing: {
      headline: 'Clinical Safety Analysis Engine',
      description: 'NLP-powered medication-food interaction detection combined with allergen analysis for patient safety',
      technicalDetails: 'Drug-nutrient interaction database with allergy constraint checking for HIPAA-compliant safety'
    },
    product: {
      label: 'Safety Alerts',
      tooltip: 'Get warnings about potential allergens, medication interactions, or health condition conflicts in your meals',
      shortDescription: 'Meal safety checking'
    }
  }
}

/**
 * Get messaging for a feature in a specific context
 *
 * @param featureKey - Feature identifier (e.g., 'mealTracking')
 * @param context - Messaging context ('seo', 'marketing', 'product')
 * @returns Context-specific messaging or undefined if feature not found
 *
 * @example
 * getFeatureMessaging('mealTracking', 'product')
 * // { label: 'WPL Vision™', tooltip: '...', shortDescription: '...' }
 */
export function getFeatureMessaging(
  featureKey: string,
  context: MessagingContext
): FeatureMessaging[MessagingContext] | undefined {
  const messaging = FEATURE_MESSAGING[featureKey]
  if (!messaging) {
    console.warn(`[Terminology] Unknown feature key: ${featureKey}`)
    return undefined
  }
  return messaging[context]
}

/**
 * Get product label for a feature (most common use case)
 *
 * @param featureKey - Feature identifier
 * @returns User-facing product label or feature key if not found
 *
 * @example
 * getProductLabel('mealTracking') // 'WPL Vision™'
 * getProductLabel('healthInsights') // 'Wellness Intelligence'
 */
export function getProductLabel(featureKey: string): string {
  const messaging = getFeatureMessaging(featureKey, 'product')
  return (messaging && 'label' in messaging) ? messaging.label : featureKey
}

/**
 * Get SEO headline for a feature (for meta titles, H1s)
 *
 * @param featureKey - Feature identifier
 * @returns SEO-optimized headline or fallback
 *
 * @example
 * getSEOHeadline('medicationParsing') // 'AI Medication Label Scanner'
 */
export function getSEOHeadline(featureKey: string): string {
  const messaging = getFeatureMessaging(featureKey, 'seo')
  return (messaging && 'headline' in messaging) ? messaging.headline : getProductLabel(featureKey)
}

/**
 * Get marketing headline for a feature (for landing pages, ads)
 *
 * @param featureKey - Feature identifier
 * @returns Marketing headline with technical authority
 *
 * @example
 * getMarketingHeadline('healthInsights') // 'Predictive Health Analytics Engine'
 */
export function getMarketingHeadline(featureKey: string): string {
  const messaging = getFeatureMessaging(featureKey, 'marketing')
  return (messaging && 'headline' in messaging) ? messaging.headline : getSEOHeadline(featureKey)
}

/**
 * Get tooltip for a product feature (for hover help text)
 *
 * @param featureKey - Feature identifier
 * @returns Tooltip text or undefined
 *
 * @example
 * getTooltip('mealTracking')
 * // 'Snap a photo and let WPL Vision™ identify your meal...'
 */
export function getTooltip(featureKey: string): string | undefined {
  const messaging = getFeatureMessaging(featureKey, 'product')
  return (messaging && 'tooltip' in messaging) ? messaging.tooltip : undefined
}

/**
 * Get all feature keys with messaging defined
 *
 * @returns Array of feature keys
 *
 * @example
 * getAllFeatureKeys()
 * // ['mealTracking', 'healthInsights', 'medicationParsing', ...]
 */
export function getAllFeatureKeys(): string[] {
  return Object.keys(FEATURE_MESSAGING)
}

/**
 * Get SEO keywords for a feature (for meta keywords, search optimization)
 *
 * @param featureKey - Feature identifier
 * @returns Array of SEO keywords or empty array
 *
 * @example
 * getSEOKeywords('mealTracking')
 * // ['AI meal tracking', 'photo nutrition analysis', 'AI food recognition']
 */
export function getSEOKeywords(featureKey: string): string[] {
  const messaging = getFeatureMessaging(featureKey, 'seo')
  return (messaging && 'keywords' in messaging) ? (messaging.keywords || []) : []
}

/**
 * Get technical details for a feature (for marketing/documentation)
 *
 * @param featureKey - Feature identifier
 * @returns Technical marketing details or undefined
 *
 * @example
 * getTechnicalDetails('medicationParsing')
 * // 'Multi-language OCR with pharmaceutical vocabulary NLP for 99.7% accuracy'
 */
export function getTechnicalDetails(featureKey: string): string | undefined {
  const messaging = getFeatureMessaging(featureKey, 'marketing')
  return (messaging && 'technicalDetails' in messaging) ? messaging.technicalDetails : undefined
}

/**
 * Validate that all features have complete messaging
 * Used for testing and quality assurance
 *
 * @returns Validation result with any missing messaging
 */
export function validateMessaging(): {
  valid: boolean
  issues: Array<{ featureKey: string; context: MessagingContext; missing: string[] }>
} {
  const issues: Array<{ featureKey: string; context: MessagingContext; missing: string[] }> = []

  for (const [featureKey, messaging] of Object.entries(FEATURE_MESSAGING)) {
    // Check SEO context
    if (!messaging.seo.headline || !messaging.seo.description) {
      issues.push({
        featureKey,
        context: 'seo',
        missing: [
          !messaging.seo.headline ? 'headline' : '',
          !messaging.seo.description ? 'description' : ''
        ].filter(Boolean)
      })
    }

    // Check marketing context
    if (!messaging.marketing.headline || !messaging.marketing.description) {
      issues.push({
        featureKey,
        context: 'marketing',
        missing: [
          !messaging.marketing.headline ? 'headline' : '',
          !messaging.marketing.description ? 'description' : ''
        ].filter(Boolean)
      })
    }

    // Check product context
    if (!messaging.product.label) {
      issues.push({
        featureKey,
        context: 'product',
        missing: ['label']
      })
    }
  }

  return {
    valid: issues.length === 0,
    issues
  }
}

/**
 * Get complete messaging object for a feature across all contexts
 * Useful for admin/documentation views
 *
 * @param featureKey - Feature identifier
 * @returns Complete messaging object or undefined
 *
 * @example
 * getCompleteMessaging('mealTracking')
 * // { seo: {...}, marketing: {...}, product: {...} }
 */
export function getCompleteMessaging(featureKey: string): FeatureMessaging | undefined {
  return FEATURE_MESSAGING[featureKey]
}
