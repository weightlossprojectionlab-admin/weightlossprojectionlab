/**
 * Social Media Agent
 *
 * Intelligent agent that analyzes meal data and generates platform-specific
 * social media content optimized for engagement based on 2025 trends
 */

export type SocialPlatform = 'instagram' | 'tiktok' | 'twitter' | 'facebook' | 'reddit'

export interface MealData {
  mealType: string
  photoUrl: string
  calories: number
  loggedAt: Date
  foodItems: string[]
  macros?: {
    protein: number
    carbs: number
    fat: number
  }
  notes?: string
  title?: string
}

export interface SocialMediaPost {
  platform: SocialPlatform
  caption: string
  hashtags: string[]
  overlayText: {
    primary: string // Main callout
    secondary?: string // Supporting text
    stats?: string // Macro/cal display
  }
  designStyle: {
    layout: 'full-bleed' | 'gradient-overlay' | 'split-screen' | 'minimal'
    textPosition: 'top' | 'bottom' | 'center'
    fontSize: 'xl' | '2xl' | '3xl' | '4xl'
    fontStyle: 'bold' | 'hand-drawn' | 'modern-sans'
    colorScheme: 'vibrant' | 'neon' | 'minimal' | 'gradient'
    includeEmojis: boolean
  }
  engagementHooks: {
    callToAction: string
    question?: string
    pollOptions?: string[]
  }
}

/**
 * Platform-specific engagement rules based on 2025 trends
 */
const PLATFORM_RULES: Record<SocialPlatform, {
  aspectRatio: string
  maxCaptionLength: number
  optimalHashtags: number
  engagementStyle: string
  visualStyle: string
}> = {
  instagram: {
    aspectRatio: '4:5', // Portrait - takes up more screen real estate
    maxCaptionLength: 2200,
    optimalHashtags: 8-12,
    engagementStyle: 'authentic-lifestyle',
    visualStyle: 'vibrant-bold-text'
  },
  tiktok: {
    aspectRatio: '9:16', // Full vertical
    maxCaptionLength: 150,
    optimalHashtags: 3-5,
    engagementStyle: 'quick-tips-transformation',
    visualStyle: 'neon-motion-graphics'
  },
  twitter: {
    aspectRatio: '16:9', // Horizontal
    maxCaptionLength: 280,
    optimalHashtags: 2-3,
    engagementStyle: 'motivational-polls',
    visualStyle: 'clean-minimal'
  },
  facebook: {
    aspectRatio: '1:1', // Square
    maxCaptionLength: 500,
    optimalHashtags: 3-5,
    engagementStyle: 'storytelling-community',
    visualStyle: 'warm-relatable'
  },
  reddit: {
    aspectRatio: '4:3', // Standard
    maxCaptionLength: 40000,
    optimalHashtags: 0, // Reddit uses flairs, not hashtags
    engagementStyle: 'detailed-context',
    visualStyle: 'authentic-progress'
  }
}

/**
 * Analyzes meal data and determines the most engaging way to present it
 */
function analyzeMealForEngagement(meal: MealData): {
  hook: string
  angle: 'protein-power' | 'low-cal-win' | 'balanced-macros' | 'food-discovery' | 'transformation'
  intensity: 'casual' | 'motivated' | 'inspiring'
} {
  const { calories, macros, foodItems, mealType } = meal

  // High protein = fitness angle
  if (macros && macros.protein >= 30) {
    return {
      hook: '💪 Protein-packed',
      angle: 'protein-power',
      intensity: 'motivated'
    }
  }

  // Low cal = weight loss win
  if (calories < 400) {
    return {
      hook: '✨ Light but filling',
      angle: 'low-cal-win',
      intensity: 'inspiring'
    }
  }

  // Balanced macros = healthy lifestyle
  if (macros && Math.abs(macros.protein - macros.carbs) < 10) {
    return {
      hook: '⚖️ Perfectly balanced',
      angle: 'balanced-macros',
      intensity: 'casual'
    }
  }

  // Interesting foods = discovery
  if (foodItems.length >= 5) {
    return {
      hook: '🍽️ Check out this plate',
      angle: 'food-discovery',
      intensity: 'casual'
    }
  }

  // Default: transformation journey
  return {
    hook: '🎯 My journey',
    angle: 'transformation',
    intensity: 'motivated'
  }
}

/**
 * Generates Instagram-optimized content (2025 trends)
 */
function generateInstagramPost(meal: MealData): SocialMediaPost {
  const analysis = analyzeMealForEngagement(meal)
  const mealName = meal.title || meal.foodItems[0] || meal.mealType

  return {
    platform: 'instagram',
    caption: `${analysis.hook} ${mealName} 🔥\n\n` +
      `Tracking my nutrition goals one meal at a time 📊\n\n` +
      `💯 ${meal.calories} cals | ` +
      `${meal.macros ? `P: ${meal.macros.protein}g C: ${meal.macros.carbs}g F: ${meal.macros.fat}g` : 'Balanced macros'}\n\n` +
      `What's your go-to ${meal.mealType}? Drop it below! 👇`,
    hashtags: [
      '#HealthyEating',
      '#MealPrep',
      '#FitnessJourney',
      '#NutritionTips',
      '#HealthyLifestyle',
      '#FoodTracking',
      `#${meal.mealType}Ideas`,
      '#MyJourney',
      '#ProgressNotPerfection',
      '#BalancedLiving'
    ],
    overlayText: {
      primary: `${meal.calories} CAL`,
      secondary: mealName.toUpperCase(),
      stats: meal.macros ? `P${meal.macros.protein} C${meal.macros.carbs} F${meal.macros.fat}` : undefined
    },
    designStyle: {
      layout: 'gradient-overlay',
      textPosition: 'bottom',
      fontSize: '4xl',
      fontStyle: 'bold',
      colorScheme: 'vibrant',
      includeEmojis: true
    },
    engagementHooks: {
      callToAction: 'Double tap if you\'d eat this! 💚',
      question: `What's your go-to ${meal.mealType}?`
    }
  }
}

/**
 * Generates TikTok-optimized content (15-second hook format)
 */
function generateTikTokPost(meal: MealData): SocialMediaPost {
  const analysis = analyzeMealForEngagement(meal)
  const mealName = meal.title || meal.foodItems[0] || meal.mealType

  return {
    platform: 'tiktok',
    caption: `${analysis.hook} ${mealName} - ${meal.calories} cals!\n` +
      `#HealthyEating #MealIdeas #FitnessTips`,
    hashtags: [
      '#HealthyEating',
      '#FoodTok',
      '#MealPrep',
      '#FitnessTok',
      '#WhatIEat'
    ],
    overlayText: {
      primary: `ONLY ${meal.calories} CALS`,
      secondary: mealName.toUpperCase(),
      stats: `${meal.macros?.protein || 0}P ${meal.macros?.carbs || 0}C ${meal.macros?.fat || 0}F`
    },
    designStyle: {
      layout: 'full-bleed',
      textPosition: 'top',
      fontSize: '3xl',
      fontStyle: 'hand-drawn',
      colorScheme: 'neon',
      includeEmojis: true
    },
    engagementHooks: {
      callToAction: 'Save this for later! 📌',
      question: 'Would you try this? 👀'
    }
  }
}

/**
 * Generates Twitter/X-optimized content (quick impact)
 */
function generateTwitterPost(meal: MealData): SocialMediaPost {
  const analysis = analyzeMealForEngagement(meal)
  const mealName = meal.title || meal.foodItems[0] || meal.mealType

  return {
    platform: 'twitter',
    caption: `${analysis.hook}\n\n` +
      `${mealName}: ${meal.calories} cals\n` +
      `${meal.macros ? `💪 ${meal.macros.protein}g protein` : ''}\n\n` +
      `Day ${Math.ceil(Math.random() * 100)} of tracking everything 📊`,
    hashtags: [
      '#FitnessTwitter',
      '#HealthyEating'
    ],
    overlayText: {
      primary: `${meal.calories}`,
      secondary: 'CALORIES',
      stats: meal.macros ? `${meal.macros.protein}g protein` : undefined
    },
    designStyle: {
      layout: 'minimal',
      textPosition: 'center',
      fontSize: '2xl',
      fontStyle: 'modern-sans',
      colorScheme: 'minimal',
      includeEmojis: false
    },
    engagementHooks: {
      callToAction: 'Like if you\'d smash this',
      pollOptions: ['Would eat', 'Pass', 'Need the recipe']
    }
  }
}

/**
 * Generates Reddit-optimized content (detailed context)
 */
function generateRedditPost(meal: MealData): SocialMediaPost {
  const analysis = analyzeMealForEngagement(meal)
  const mealName = meal.title || meal.foodItems.join(', ') || meal.mealType

  return {
    platform: 'reddit',
    caption: `[Progress] My ${meal.mealType} today: ${mealName}\n\n` +
      `**Stats:** ${meal.calories} calories, ` +
      `${meal.macros ? `${meal.macros.protein}g protein, ${meal.macros.carbs}g carbs, ${meal.macros.fat}g fat` : 'balanced macros'}\n\n` +
      `**Context:** I've been focusing on sustainable eating habits rather than restriction. ` +
      `This meal keeps me satisfied while hitting my nutrition goals.\n\n` +
      `**Approach:** Tracking with a nutrition app but not obsessing over perfection. ` +
      `Finding what works for my lifestyle.\n\n` +
      `**Mental health note:** Learning that consistency > perfection has been game-changing.\n\n` +
      `Happy to answer questions!`,
    hashtags: [], // Reddit doesn't use hashtags
    overlayText: {
      primary: mealName,
      secondary: `${meal.calories} cal`,
      stats: meal.macros ? `P: ${meal.macros.protein}g C: ${meal.macros.carbs}g F: ${meal.macros.fat}g` : undefined
    },
    designStyle: {
      layout: 'minimal',
      textPosition: 'bottom',
      fontSize: 'xl',
      fontStyle: 'modern-sans',
      colorScheme: 'minimal',
      includeEmojis: false
    },
    engagementHooks: {
      callToAction: 'Happy to answer questions in the comments!'
    }
  }
}

/**
 * Generates Facebook-optimized content (storytelling)
 */
function generateFacebookPost(meal: MealData): SocialMediaPost {
  const analysis = analyzeMealForEngagement(meal)
  const mealName = meal.title || meal.foodItems.join(', ') || meal.mealType

  return {
    platform: 'facebook',
    caption: `${analysis.hook} ${mealName}! 🎉\n\n` +
      `I'm on a journey to better health, and meals like this remind me that eating well doesn't have to be boring or complicated.\n\n` +
      `📊 ${meal.calories} calories of deliciousness\n` +
      `${meal.macros ? `💪 ${meal.macros.protein}g protein to keep me strong\n` : ''}\n` +
      `Tracking my food has been eye-opening - I'm learning so much about what fuels my body best!\n\n` +
      `Who else is working on their health goals? Let's support each other! 💚`,
    hashtags: [
      '#HealthJourney',
      '#HealthyEating',
      '#Wellness'
    ],
    overlayText: {
      primary: mealName,
      secondary: `${meal.calories} calories`,
      stats: meal.macros ? `${meal.macros.protein}g protein` : undefined
    },
    designStyle: {
      layout: 'gradient-overlay',
      textPosition: 'bottom',
      fontSize: '2xl',
      fontStyle: 'bold',
      colorScheme: 'warm-relatable',
      includeEmojis: true
    },
    engagementHooks: {
      callToAction: 'React if you\'re on a health journey too!',
      question: 'What are your favorite healthy meals?'
    }
  }
}

/**
 * Main social media agent - generates platform-specific content
 */
export function generateSocialMediaPost(
  meal: MealData,
  platform: SocialPlatform
): SocialMediaPost {
  switch (platform) {
    case 'instagram':
      return generateInstagramPost(meal)
    case 'tiktok':
      return generateTikTokPost(meal)
    case 'twitter':
      return generateTwitterPost(meal)
    case 'reddit':
      return generateRedditPost(meal)
    case 'facebook':
      return generateFacebookPost(meal)
    default:
      return generateInstagramPost(meal) // Default fallback
  }
}

/**
 * Suggests the best platform for a given meal based on its characteristics
 */
export function suggestBestPlatform(meal: MealData): SocialPlatform {
  const analysis = analyzeMealForEngagement(meal)

  // High protein = TikTok/Instagram (fitness community)
  if (analysis.angle === 'protein-power') {
    return 'tiktok'
  }

  // Low cal win = Instagram (transformation journeys)
  if (analysis.angle === 'low-cal-win') {
    return 'instagram'
  }

  // Balanced/educational = Reddit (detailed community)
  if (analysis.angle === 'balanced-macros') {
    return 'reddit'
  }

  // Food discovery = Instagram (visual platform)
  if (analysis.angle === 'food-discovery') {
    return 'instagram'
  }

  // Default: Instagram (most versatile)
  return 'instagram'
}
