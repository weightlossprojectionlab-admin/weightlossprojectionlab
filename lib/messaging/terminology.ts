/**
 * Centralized Messaging & Terminology System
 *
 * Provides context-aware messaging for features across different platform layers:
 * - SEO: AI-heavy for search discoverability
 * - Marketing: Technical authority for healthcare credibility
 * - Product: Branded WPL technology for trust & differentiation
 *
 * This system enables consistent terminology replacement across 750+ AI references
 * while maintaining strategic messaging per context.
 */

/**
 * Messaging contexts determine which terminology variant to use
 * - seo: Search-optimized (AI keywords for discoverability)
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

  // Health Insights & Predictions
  healthInsights: {
    seo: {
      headline: 'AI Health Insights & Predictions',
      description: 'Get AI-powered health insights, weight predictions, and personalized wellness recommendations',
      keywords: ['AI health insights', 'predictive health analytics', 'AI wellness coach']
    },
    marketing: {
      headline: 'Predictive Health Analytics Engine',
      description: 'Machine learning algorithms analyze your health data to identify trends, predict outcomes, and provide evidence-based recommendations',
      technicalDetails: 'Time-series analysis with LSTM neural networks for outcome prediction'
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

  // Smart Shopping Suggestions
  shoppingSuggestions: {
    seo: {
      headline: 'AI Smart Shopping Lists',
      description: 'AI-powered shopping suggestions based on your health goals, inventory, and meal plans',
      keywords: ['AI shopping list', 'smart grocery suggestions', 'AI meal planning']
    },
    marketing: {
      headline: 'Intelligent Shopping Recommendation Engine',
      description: 'Multi-factor recommendation system combining health goals, dietary restrictions, inventory depletion, and nutritional optimization',
      technicalDetails: 'Collaborative filtering with constraint-based optimization for health-aligned shopping'
    },
    product: {
      label: 'Smart Suggestions',
      tooltip: 'Get personalized shopping suggestions based on your health goals, pantry inventory, and preferences',
      shortDescription: 'Intelligent shopping'
    }
  },

  // Recipe Generation
  recipeGeneration: {
    seo: {
      headline: 'AI Recipe Generator',
      description: 'Generate personalized recipes with AI based on your inventory, health goals, and preferences',
      keywords: ['AI recipe generator', 'personalized recipe AI', 'inventory recipe creator']
    },
    marketing: {
      headline: 'Adaptive Recipe Generation System',
      description: 'Large language model fine-tuned on nutritional science generates recipes optimized for your health conditions and available ingredients',
      technicalDetails: 'LLM with retrieval-augmented generation (RAG) for evidence-based recipe creation'
    },
    product: {
      label: 'Recipe Generator',
      tooltip: 'Create custom recipes from your pantry ingredients, tailored to your health goals and taste preferences',
      shortDescription: 'Generate recipes'
    }
  },

  // AI Coaching
  aiCoaching: {
    seo: {
      headline: 'AI Wellness Coach',
      description: 'Get 24/7 AI coaching for weight loss, nutrition, fitness, and wellness guidance',
      keywords: ['AI wellness coach', 'AI health coach', 'personalized AI coaching']
    },
    marketing: {
      headline: 'Conversational AI Health Coaching',
      description: 'Advanced natural language AI trained on clinical wellness protocols provides personalized coaching, accountability, and evidence-based guidance',
      technicalDetails: 'GPT-4 fine-tuned on behavioral psychology and nutritional science research'
    },
    product: {
      label: 'Wellness Coach',
      tooltip: 'Chat with your AI Wellness Coach anytime for personalized guidance, motivation, and health advice',
      shortDescription: '24/7 coaching support'
    }
  },

  // Weight Projections
  weightProjections: {
    seo: {
      headline: 'AI Weight Loss Predictions',
      description: 'AI-powered weight projections show when you\'ll reach your goal based on your progress',
      keywords: ['AI weight prediction', 'weight loss calculator', 'AI goal projections']
    },
    marketing: {
      headline: 'Predictive Weight Modeling',
      description: 'Statistical time-series models analyze your weight trends and lifestyle factors to project realistic goal achievement timelines',
      technicalDetails: 'Bayesian regression with confidence intervals for evidence-based projections'
    },
    product: {
      label: 'Goal Projections',
      tooltip: 'See when you\'re projected to reach your goal based on your current progress and trends',
      shortDescription: 'Weight predictions'
    }
  },

  // Nutrition Analysis
  nutritionAnalysis: {
    seo: {
      headline: 'AI Nutrition Analysis',
      description: 'Instant AI-powered nutrition facts from meal photos and food descriptions',
      keywords: ['AI nutrition calculator', 'meal nutrition AI', 'automatic calorie counter']
    },
    marketing: {
      headline: 'Multi-Modal Nutrition Computation',
      description: 'Computer vision and NLP algorithms estimate portion sizes and compute comprehensive macronutrient breakdowns from images or text',
      technicalDetails: 'CNN-based portion estimation with USDA database integration for 300k+ foods'
    },
    product: {
      label: 'Nutrition Analysis',
      tooltip: 'Automatically calculate calories, protein, carbs, and fats from your meals',
      shortDescription: 'Auto nutrition tracking'
    }
  },

  // Health Correlations
  healthCorrelations: {
    seo: {
      headline: 'AI Health Pattern Detection',
      description: 'Discover how your meals, activities, and lifestyle affect your health with AI pattern analysis',
      keywords: ['AI health patterns', 'nutrition correlation AI', 'health trend analysis']
    },
    marketing: {
      headline: 'Multi-Variate Health Correlation Analysis',
      description: 'Statistical learning algorithms identify correlations between nutrition, vitals, medications, and health outcomes for personalized insights',
      technicalDetails: 'Correlation matrices with causal inference for actionable health recommendations'
    },
    product: {
      label: 'Health Patterns',
      tooltip: 'Discover how your meals and activities impact your weight, energy, and health metrics',
      shortDescription: 'Pattern insights'
    }
  },

  // Appointment Recommendations
  appointmentRecommendations: {
    seo: {
      headline: 'AI Health Appointment Reminders',
      description: 'AI suggests when you need checkups based on your health conditions and medical history',
      keywords: ['AI appointment scheduler', 'health checkup reminders', 'medical appointment AI']
    },
    marketing: {
      headline: 'Clinical Decision Support for Preventive Care',
      description: 'Evidence-based algorithms analyze health conditions, medication regimens, and care guidelines to recommend appropriate appointment scheduling',
      technicalDetails: 'Rule-based expert system trained on USPSTF clinical care guidelines'
    },
    product: {
      label: 'Checkup Reminders',
      tooltip: 'Get timely reminders for doctor visits, lab work, and preventive screenings based on your health profile',
      shortDescription: 'Smart appointment scheduling'
    }
  },

  // Expiration Predictions
  expirationPredictions: {
    seo: {
      headline: 'AI Food Expiration Tracker',
      description: 'AI predicts when your food will expire to reduce waste and keep your pantry fresh',
      keywords: ['AI expiration tracker', 'food waste prevention', 'smart pantry management']
    },
    marketing: {
      headline: 'Predictive Inventory Degradation Modeling',
      description: 'Machine learning models trained on shelf-life data predict optimal consumption windows based on storage conditions and product categories',
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

  // Veterinary Intelligence
  veterinaryIntelligence: {
    seo: {
      headline: 'AI Pet Health Tracking',
      description: 'Track your pet\'s weight, medications, and vet appointments with AI-powered pet health insights',
      keywords: ['AI pet health tracker', 'pet weight tracking', 'veterinary health AI']
    },
    marketing: {
      headline: 'Species-Specific Veterinary Health Analytics',
      description: 'Specialized algorithms calibrated for canine and feline physiology provide breed-aware health monitoring and veterinary care recommendations',
      technicalDetails: 'Multi-species neural networks trained on veterinary medical databases and breed standards'
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
  return messaging?.label || featureKey
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
  return messaging?.headline || getProductLabel(featureKey)
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
  return messaging?.headline || getSEOHeadline(featureKey)
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
  return messaging?.tooltip
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
  return messaging?.keywords || []
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
  return messaging?.technicalDetails
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
