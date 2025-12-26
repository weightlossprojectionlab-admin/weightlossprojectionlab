/**
 * Advertisement Templates for Different User Personas
 *
 * Each template targets a specific user type with emotionally resonant messaging
 */

export type AdPersona = 'weight-loss-warrior' | 'family-health-manager' | 'medical-caregiver'
export type AdType = 'hero' | 'feature-highlight' | 'testimonial' | 'before-after' | 'pricing-cta'

export interface AdTemplate {
  id: string
  persona: AdPersona
  type: AdType
  headline: string
  subheadline: string
  bodyText: string
  cta: string
  visualHint: string // Description of visual to use
  emotionalHook: string
  colors: {
    primary: string
    secondary: string
    accent: string
  }
}

/**
 * Weight Loss Warrior Templates
 * Target: Individuals on personal fitness/weight loss journey
 * Pain Points: Failed diets, need accountability, want transformation
 */
export const WEIGHT_LOSS_TEMPLATES: AdTemplate[] = [
  {
    id: 'wl-hero-01',
    persona: 'weight-loss-warrior',
    type: 'hero',
    headline: 'Finally Stick To It This Time',
    subheadline: 'The last weight loss app you\'ll ever need',
    bodyText: 'AI-powered meal tracking that actually works. See your transformation, stay accountable, achieve your goals.',
    cta: 'Start Free Trial',
    visualHint: 'Person celebrating weight loss victory, fist pump, confident pose',
    emotionalHook: 'This time is different - you have the tools to succeed',
    colors: {
      primary: '#4F46E5', // Indigo
      secondary: '#8B5CF6', // Purple
      accent: '#10B981' // Success green
    }
  },
  {
    id: 'wl-transformation-01',
    persona: 'weight-loss-warrior',
    type: 'before-after',
    headline: 'Your Transformation Starts Today',
    subheadline: 'Join thousands who are seeing real results',
    bodyText: 'Track every meal with AI. See your progress. Stay motivated. Transform your life.',
    cta: 'See How It Works',
    visualHint: 'Progress chart going up, transformation timeline, achievement badges',
    emotionalHook: 'See yourself succeed - visualize your transformation',
    colors: {
      primary: '#7C3AED', // Purple
      secondary: '#EC4899', // Pink
      accent: '#F59E0B' // Achievement gold
    }
  },
  {
    id: 'wl-accountability-01',
    persona: 'weight-loss-warrior',
    type: 'feature-highlight',
    headline: 'Never Miss a Beat',
    subheadline: 'AI tracking that keeps you honest',
    bodyText: 'Snap a photo. AI logs everything. Stay accountable without the hassle.',
    cta: 'Try Free for 14 Days',
    visualHint: 'Phone taking photo of meal, AI analysis overlay, calorie count',
    emotionalHook: 'Accountability made effortless - no more guessing',
    colors: {
      primary: '#06B6D4', // Cyan
      secondary: '#3B82F6', // Blue
      accent: '#8B5CF6' // Purple
    }
  },
  {
    id: 'wl-community-01',
    persona: 'weight-loss-warrior',
    type: 'testimonial',
    headline: 'You\'re Not Alone',
    subheadline: 'Join a community that gets it',
    bodyText: 'Share your wins. Get support. Stay motivated. Real people, real results.',
    cta: 'Join the Community',
    visualHint: 'Multiple people sharing progress, support messages, celebration',
    emotionalHook: 'Find your tribe - people who understand your journey',
    colors: {
      primary: '#EC4899', // Pink
      secondary: '#F472B6', // Light pink
      accent: '#8B5CF6' // Purple
    }
  }
]

/**
 * Family Health Manager Templates
 * Target: Parents managing family health, teaching kids healthy habits
 * Pain Points: Multiple schedules, meal planning, setting good examples
 */
export const FAMILY_HEALTH_TEMPLATES: AdTemplate[] = [
  {
    id: 'fh-hero-01',
    persona: 'family-health-manager',
    type: 'hero',
    headline: 'Keep Your Whole Family Healthy',
    subheadline: 'One app for everyone\'s health journey',
    bodyText: 'Track meals, manage appointments, and teach healthy habits. All in one place.',
    cta: 'Start Family Plan',
    visualHint: 'Family eating healthy meal together, smiling, connected',
    emotionalHook: 'Lead your family to better health - together',
    colors: {
      primary: '#059669', // Green
      secondary: '#10B981', // Emerald
      accent: '#F59E0B' // Orange
    }
  },
  {
    id: 'fh-organization-01',
    persona: 'family-health-manager',
    type: 'feature-highlight',
    headline: 'Make Healthy Living Easier',
    subheadline: 'Family meal planning that actually works',
    bodyText: 'Shared shopping lists. Meal plans everyone loves. Track each family member\'s progress.',
    cta: 'Get Organized',
    visualHint: 'Family dashboard showing multiple members, shared calendar, meal plans',
    emotionalHook: 'Less stress, more health - family wellness simplified',
    colors: {
      primary: '#0EA5E9', // Sky blue
      secondary: '#06B6D4', // Cyan
      accent: '#8B5CF6' // Purple
    }
  },
  {
    id: 'fh-kids-01',
    persona: 'family-health-manager',
    type: 'testimonial',
    headline: 'Teaching Kids Healthy Habits',
    subheadline: 'Lead by example with family tracking',
    bodyText: 'Show your kids what healthy looks like. Track together. Build lifelong habits.',
    cta: 'Build Better Habits',
    visualHint: 'Parent and child looking at app together, high five, achievement',
    emotionalHook: 'Be the role model your kids need',
    colors: {
      primary: '#F59E0B', // Orange
      secondary: '#FBBF24', // Amber
      accent: '#10B981' // Green
    }
  },
  {
    id: 'fh-pets-01',
    persona: 'family-health-manager',
    type: 'feature-highlight',
    headline: 'Even Track Your Pets!',
    subheadline: 'Complete family health - furry friends included',
    bodyText: 'Weight tracking for dogs & cats. Vet appointments. Medication reminders. Your whole family.',
    cta: 'Try Family Premium',
    visualHint: 'Family with pet, all health tracked, complete dashboard',
    emotionalHook: 'Because they\'re family too - track everyone you love',
    colors: {
      primary: '#8B5CF6', // Purple
      secondary: '#A78BFA', // Light purple
      accent: '#EC4899' // Pink
    }
  }
]

/**
 * Medical Caregiver Templates
 * Target: Adult children caring for aging parents remotely
 * Pain Points: Distance, medication management, coordination with healthcare
 */
export const MEDICAL_CAREGIVER_TEMPLATES: AdTemplate[] = [
  {
    id: 'mc-hero-01',
    persona: 'medical-caregiver',
    type: 'hero',
    headline: 'Be There When You Can\'t Be There',
    subheadline: 'Remote caregiving made simple',
    bodyText: 'Track vitals, medications, and appointments for loved ones. Coordinate with nurses. Peace of mind from anywhere.',
    cta: 'Start Caring Today',
    visualHint: 'Adult child video calling elderly parent, health app visible, connection',
    emotionalHook: 'Stay connected to their health, no matter the distance',
    colors: {
      primary: '#0EA5E9', // Blue
      secondary: '#06B6D4', // Cyan
      accent: '#10B981' // Green
    }
  },
  {
    id: 'mc-medications-01',
    persona: 'medical-caregiver',
    type: 'feature-highlight',
    headline: 'Never Miss a Medication',
    subheadline: 'Smart reminders for you and your loved ones',
    bodyText: 'Track medications, vitals, and doctor appointments. Invite professional caregivers. Stay informed.',
    cta: 'Protect Your Loved Ones',
    visualHint: 'Medication tracker, reminders on phone, checkmarks, organized pills',
    emotionalHook: 'Keep them safe - medication tracking you can trust',
    colors: {
      primary: '#DC2626', // Red (urgency)
      secondary: '#EF4444', // Light red
      accent: '#10B981' // Success green
    }
  },
  {
    id: 'mc-coordination-01',
    persona: 'medical-caregiver',
    type: 'feature-highlight',
    headline: 'Coordinate Care Seamlessly',
    subheadline: 'Invite nurses, doctors, and family',
    bodyText: 'Share access with up to 10 caregivers. Everyone stays informed. Better care coordination.',
    cta: 'Coordinate Better Care',
    visualHint: 'Multiple caregivers icons, shared access, medical team collaboration',
    emotionalHook: 'Build a care team - you don\'t have to do it alone',
    colors: {
      primary: '#7C3AED', // Purple
      secondary: '#8B5CF6', // Light purple
      accent: '#3B82F6' // Blue
    }
  },
  {
    id: 'mc-peace-01',
    persona: 'medical-caregiver',
    type: 'testimonial',
    headline: 'Peace of Mind, Delivered',
    subheadline: 'Know they\'re taken care of, always',
    bodyText: 'Real-time vitals monitoring. Instant alerts. Complete medical history at your fingertips.',
    cta: 'Get Peace of Mind',
    visualHint: 'Peaceful caregiver checking phone, notification of vitals recorded, relief',
    emotionalHook: 'Sleep better knowing they\'re monitored',
    colors: {
      primary: '#10B981', // Calm green
      secondary: '#34D399', // Emerald
      accent: '#06B6D4' // Cyan
    }
  },
  {
    id: 'mc-vitals-01',
    persona: 'medical-caregiver',
    type: 'feature-highlight',
    headline: 'Track Every Vital Sign',
    subheadline: 'Blood pressure, glucose, weight & more',
    bodyText: 'AI-guided vital collection. Trend analysis. Share reports with doctors instantly.',
    cta: 'Start Tracking Vitals',
    visualHint: 'Health metrics dashboard, blood pressure cuff, glucose meter, trends',
    emotionalHook: 'Spot problems early - proactive health management',
    colors: {
      primary: '#EF4444', // Red
      secondary: '#F87171', // Light red
      accent: '#F59E0B' // Orange
    }
  }
]

/**
 * Get all templates for a specific persona
 */
export function getTemplatesByPersona(persona: AdPersona): AdTemplate[] {
  switch (persona) {
    case 'weight-loss-warrior':
      return WEIGHT_LOSS_TEMPLATES
    case 'family-health-manager':
      return FAMILY_HEALTH_TEMPLATES
    case 'medical-caregiver':
      return MEDICAL_CAREGIVER_TEMPLATES
  }
}

/**
 * Get all templates
 */
export function getAllTemplates(): AdTemplate[] {
  return [
    ...WEIGHT_LOSS_TEMPLATES,
    ...FAMILY_HEALTH_TEMPLATES,
    ...MEDICAL_CAREGIVER_TEMPLATES
  ]
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): AdTemplate | undefined {
  return getAllTemplates().find(t => t.id === id)
}

/**
 * Persona display names and descriptions
 */
export const PERSONA_INFO = {
  'weight-loss-warrior': {
    name: 'Weight Loss Journey',
    icon: '💪',
    description: 'Individuals focused on personal fitness and transformation',
    targetAudience: 'Ages 25-45, fitness enthusiasts, diet-conscious'
  },
  'family-health-manager': {
    name: 'Family Health',
    icon: '👨‍👩‍👧‍👦',
    description: 'Parents managing family wellness and building healthy habits',
    targetAudience: 'Parents with children, health-conscious families'
  },
  'medical-caregiver': {
    name: 'Medical Caregiving',
    icon: '⚕️',
    description: 'Caregivers managing medical needs for loved ones',
    targetAudience: 'Adult children caring for aging parents, professional caregivers'
  }
} as const
