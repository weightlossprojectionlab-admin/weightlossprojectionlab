/**
 * Landing Page Ad Generator
 *
 * Automatically generates ad templates from landing page personas
 * Creates emotionally resonant ads for each of the 30 landing pages
 */

import { AdTemplate, AdType } from './ad-templates'
import { LandingPagePersona, getAllLandingPagePersonas } from './landing-page-personas'

/**
 * Generate ad templates from landing page persona
 */
export function generateAdTemplatesFromPersona(persona: LandingPagePersona): AdTemplate[] {
  const templates: AdTemplate[] = []
  const baseId = persona.id

  // Hero Ad - Main value proposition
  templates.push({
    id: `${baseId}-hero`,
    persona: 'weight-loss-warrior', // Map to existing persona type
    type: 'hero',
    headline: generateHeadline(persona),
    subheadline: persona.description,
    bodyText: generateBodyText(persona),
    cta: 'Start Free Trial',
    visualHint: `${persona.icon} ${persona.name} - ${persona.emotionalTriggers[0]}`,
    emotionalHook: persona.emotionalTriggers[0] || 'Transform your life today',
    colors: generateColors(persona)
  })

  // Feature Highlight - Key benefit
  if (persona.keyFeatures.length > 0) {
    templates.push({
      id: `${baseId}-feature`,
      persona: 'weight-loss-warrior',
      type: 'feature-highlight',
      headline: persona.keyFeatures[0],
      subheadline: `Made for ${persona.targetAudience.split(',')[0]}`,
      bodyText: `Track your progress with ${persona.keyFeatures.slice(0, 3).join(', ')}. Everything you need in one place.`,
      cta: 'See How It Works',
      visualHint: `${persona.icon} Feature showcase - ${persona.keyFeatures[0]}`,
      emotionalHook: persona.emotionalTriggers[1] || persona.emotionalTriggers[0],
      colors: generateColors(persona)
    })
  }

  // Pain Point Ad - Address specific struggle
  if (persona.painPoints.length > 0) {
    templates.push({
      id: `${baseId}-pain`,
      persona: 'weight-loss-warrior',
      type: 'testimonial',
      headline: `Struggling with ${persona.painPoints[0]}?`,
      subheadline: 'You\'re not alone. We can help.',
      bodyText: `Join thousands who overcame ${persona.painPoints[0]} and ${persona.painPoints[1] || 'achieved their goals'}.`,
      cta: 'Find Your Solution',
      visualHint: `${persona.icon} Person overcoming ${persona.painPoints[0]}`,
      emotionalHook: `Finally solve ${persona.painPoints[0]}`,
      colors: generateColors(persona)
    })
  }

  return templates
}

/**
 * Generate compelling headline based on persona
 */
function generateHeadline(persona: LandingPagePersona): string {
  const headlines: Record<string, string> = {
    // Health Conditions
    'diabetes': 'Manage Diabetes & Lose Weight',
    'heart-health': 'Love Your Heart, Lose the Weight',
    'pcos': 'Balance Hormones, Achieve Your Weight Goals',
    'thyroid': 'Lose Weight Despite Thyroid Issues',
    'prediabetes': 'Prevent Diabetes Through Weight Loss',
    'high-blood-pressure': 'Lower Your Blood Pressure Naturally',
    'sleep-apnea': 'Sleep Better, Weigh Less',
    'joint-pain': 'Reduce Pain Through Weight Loss',
    'fertility': 'Optimize Fertility with Healthy Weight',
    'postpartum': 'Get Your Body Back, New Mama',

    // Lifestyle
    'busy-moms': 'Weight Loss That Fits Mom Life',
    'working-professionals': 'Lose Weight Without Disrupting Work',
    'seniors': 'Safe Weight Loss for Seniors',
    'college-students': 'Beat the Freshman 15',
    'shift-workers': 'Weight Loss for Any Schedule',
    'traveling-professionals': 'Stay on Track While Traveling',
    'single-parents': 'You Deserve This, Super Parent',
    'caregivers': 'Take Care of You While Caring for Others',
    'athletes': 'Lean Down, Perform Better',
    'couples': 'Get Healthy Together',

    // Diet Preferences
    'vegetarian': 'Plant-Based Weight Loss Made Easy',
    'vegan': 'Vegan Weight Loss That Works',
    'keto': 'Stay in Ketosis, Lose the Weight',
    'low-carb': 'Cut Carbs, Drop Pounds',
    'mediterranean': 'Mediterranean Diet Made Simple',

    // Pain Points
    'quick-logging': 'Track Meals in 30 Seconds',
    'no-calorie-counting': 'Lose Weight Without Counting Calories',
    'visual-tracking': 'See Your Transformation',
    'family-meal-planning': 'One Meal Plan for the Whole Family',
    'medication-management': 'Manage Meds & Weight Together'
  }

  return headlines[persona.id] || persona.name
}

/**
 * Generate body text based on persona
 */
function generateBodyText(persona: LandingPagePersona): string {
  return `Perfect for ${persona.targetAudience.split(',')[0]}. ${persona.description}. Track progress effortlessly.`
}

/**
 * Generate color scheme based on persona category
 */
function generateColors(persona: LandingPagePersona): { primary: string; secondary: string; accent: string } {
  const colorSchemes: Record<string, { primary: string; secondary: string; accent: string }> = {
    // Health-focused: blues and greens for trust/health
    'health-conditions': {
      primary: '#0EA5E9', // Sky blue
      secondary: '#10B981', // Green
      accent: '#F59E0B'    // Warning orange
    },
    // Lifestyle: purples and pinks for energy/motivation
    'lifestyle': {
      primary: '#8B5CF6', // Purple
      secondary: '#EC4899', // Pink
      accent: '#10B981'    // Success green
    },
    // Diet: greens and earth tones for natural/healthy
    'diet-preferences': {
      primary: '#059669', // Emerald
      secondary: '#10B981', // Green
      accent: '#F59E0B'    // Accent orange
    },
    // Pain points: bold colors for attention/urgency
    'pain-points': {
      primary: '#7C3AED', // Violet
      secondary: '#3B82F6', // Blue
      accent: '#EF4444'    // Red accent
    }
  }

  return colorSchemes[persona.category] || colorSchemes['health-conditions']
}

/**
 * Generate all ad templates from all landing page personas
 * Returns 90 templates (30 personas × 3 templates each)
 */
export function generateAllLandingPageAdTemplates(): AdTemplate[] {
  const allPersonas = getAllLandingPagePersonas()
  const allTemplates: AdTemplate[] = []

  for (const persona of allPersonas) {
    const templates = generateAdTemplatesFromPersona(persona)
    allTemplates.push(...templates)
  }

  return allTemplates
}

/**
 * Get ad templates for specific landing page persona
 */
export function getAdTemplatesForLandingPage(personaId: string): AdTemplate[] {
  const allPersonas = getAllLandingPagePersonas()
  const persona = allPersonas.find(p => p.id === personaId)

  if (!persona) {
    return []
  }

  return generateAdTemplatesFromPersona(persona)
}

/**
 * Get recommended platforms for landing page persona
 */
export function getRecommendedPlatforms(persona: LandingPagePersona): string[] {
  // Recommend platforms based on persona demographics
  const platformMap: Record<string, string[]> = {
    // Health conditions: Facebook (older audience), Pinterest (health content)
    'health-conditions': ['facebook-feed', 'facebook-story', 'pinterest'],

    // Lifestyle: Instagram (visual), Facebook (broad reach)
    'lifestyle': ['instagram-feed', 'instagram-story', 'facebook-feed'],

    // Diet preferences: Instagram (food photos), Pinterest (recipes)
    'diet-preferences': ['instagram-feed', 'pinterest', 'facebook-feed'],

    // Pain points: All platforms (broad pain points)
    'pain-points': ['instagram-story', 'facebook-feed', 'twitter']
  }

  // Special cases
  if (persona.id === 'college-students') {
    return ['instagram-story', 'twitter', 'instagram-feed']
  }
  if (persona.id === 'working-professionals') {
    return ['linkedin', 'instagram-feed', 'facebook-feed']
  }
  if (persona.id === 'seniors') {
    return ['facebook-feed', 'pinterest']
  }

  return platformMap[persona.category] || ['facebook-feed', 'instagram-feed']
}

/**
 * Get landing page URL for ad campaign tracking
 */
export function getLandingPageUrlWithTracking(
  persona: LandingPagePersona,
  platform: string,
  campaignId?: string
): string {
  const baseUrl = persona.landingPageUrl
  const params = new URLSearchParams({
    utm_source: platform,
    utm_medium: 'paid',
    utm_campaign: campaignId || `${persona.id}-campaign`,
    utm_content: persona.id
  })

  return `${baseUrl}?${params.toString()}`
}
