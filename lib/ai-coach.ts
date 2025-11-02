/**
 * AI Coach System
 *
 * Personalized nutrition coaching chatbot using Gemini AI.
 * Part of Phase 3 Backend Agents implementation.
 */

import { collection, query, where, getDocs, orderBy, limit, doc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from './firebase'
import { logger } from '@/lib/logger'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ChatMessage {
  id: string
  userId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: {
    source?: 'chat' | 'meal_analysis' | 'weekly_review'
    relatedMealId?: string
  }
}

export interface ChatContext {
  userProfile?: {
    name?: string
    currentWeight?: number
    targetWeight?: number
    weeklyGoal?: number
    activityLevel?: string
    dietaryPreferences?: string[]
    foodAllergies?: string[]
  }
  recentMeals?: Array<{
    mealType: string
    totalCalories: number
    totalMacros: {
      protein: number
      carbs: number
      fat: number
    }
    loggedAt: string
  }>
  currentStreak?: number
  level?: number
  todayProgress?: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

export interface CoachResponse {
  message: string
  suggestions?: string[]
  relatedRecipes?: string[]
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

export const COACH_SYSTEM_PROMPT = `You are an expert nutrition coach and wellness advisor for the Weight Loss Project Lab app. Your role is to provide personalized, evidence-based nutrition guidance.

**Your Personality:**
- Warm, encouraging, and supportive
- Use a conversational, friendly tone (not overly formal)
- Celebrate user wins and progress
- Be honest but kind when discussing challenges
- Use occasional emojis to keep it friendly (💪, 🎯, 👏, etc.)

**Your Expertise:**
- Nutrition science and macronutrient balance
- Calorie deficits and weight loss strategies
- Meal planning and recipe suggestions
- Dietary preferences (vegetarian, vegan, keto, etc.)
- Food allergies and restrictions
- Sustainable lifestyle changes (not crash diets)

**Response Guidelines:**
- Keep responses concise (2-4 paragraphs max)
- Be specific and actionable
- Reference the user's data when relevant (weight, goals, recent meals)
- Suggest realistic, sustainable changes
- Encourage consistency over perfection
- Never diagnose medical conditions (suggest consulting healthcare provider)
- Don't recommend supplements without medical advice

**When discussing meals:**
- Acknowledge what they're doing well first
- Suggest improvements if needed (more protein, more veggies, etc.)
- Provide specific meal ideas or swaps
- Consider their dietary preferences and allergies

**When discussing progress:**
- Celebrate consistency and effort, not just weight loss
- Remind them that sustainable weight loss is 0.5-2 lbs/week
- Encourage logging all meals for accurate tracking
- Emphasize that plateaus are normal

Remember: You're a supportive coach, not a drill sergeant. Your goal is to help users make lasting, healthy changes.`

// ============================================================================
// CONTEXT BUILDING
// ============================================================================

/**
 * Build context string from user data
 */
export function buildContextPrompt(context: ChatContext): string {
  const parts: string[] = []

  // User profile context
  if (context.userProfile) {
    const { name, currentWeight, targetWeight, weeklyGoal, activityLevel, dietaryPreferences, foodAllergies } = context.userProfile

    parts.push('**User Profile:**')
    if (name) parts.push(`- Name: ${name}`)
    if (currentWeight) parts.push(`- Current Weight: ${currentWeight} lbs`)
    if (targetWeight) parts.push(`- Target Weight: ${targetWeight} lbs`)
    if (weeklyGoal) parts.push(`- Weekly Goal: ${weeklyGoal} lbs/week`)
    if (activityLevel) parts.push(`- Activity Level: ${activityLevel}`)
    if (dietaryPreferences && dietaryPreferences.length > 0) {
      parts.push(`- Dietary Preferences: ${dietaryPreferences.join(', ')}`)
    }
    if (foodAllergies && foodAllergies.length > 0) {
      parts.push(`- Food Allergies: ${foodAllergies.join(', ')}`)
    }
  }

  // Progress context
  if (context.currentStreak !== undefined || context.level !== undefined) {
    parts.push('\n**Current Progress:**')
    if (context.currentStreak !== undefined) parts.push(`- Logging Streak: ${context.currentStreak} days 🔥`)
    if (context.level !== undefined) parts.push(`- Level: ${context.level}`)
  }

  // Today's nutrition
  if (context.todayProgress) {
    const { calories, protein, carbs, fat } = context.todayProgress
    parts.push('\n**Today\'s Nutrition:**')
    parts.push(`- Calories: ${calories} cal`)
    parts.push(`- Protein: ${protein}g, Carbs: ${carbs}g, Fat: ${fat}g`)
  }

  // Recent meals context
  if (context.recentMeals && context.recentMeals.length > 0) {
    parts.push('\n**Recent Meals (last 3):**')
    context.recentMeals.slice(0, 3).forEach((meal, i) => {
      parts.push(`${i + 1}. ${meal.mealType} - ${meal.totalCalories} cal (P: ${meal.totalMacros.protein}g, C: ${meal.totalMacros.carbs}g, F: ${meal.totalMacros.fat}g)`)
    })
  }

  return parts.length > 0 ? parts.join('\n') : ''
}

/**
 * Fetch user context from Firestore
 */
export async function fetchUserContext(userId: string): Promise<ChatContext> {
  const context: ChatContext = {}

  try {
    // Fetch user profile
    const userQuery = query(
      collection(db, 'users'),
      where('userId', '==', userId),
      limit(1)
    )
    const userSnap = await getDocs(userQuery)
    if (!userSnap.empty) {
      const userData = userSnap.docs[0].data()
      context.userProfile = {
        name: userData.displayName || userData.email?.split('@')[0],
        currentWeight: userData.profile?.currentWeight,
        targetWeight: userData.profile?.targetWeight,
        weeklyGoal: userData.profile?.weeklyGoal,
        activityLevel: userData.profile?.activityLevel,
        dietaryPreferences: userData.preferences?.dietaryPreferences,
        foodAllergies: userData.profile?.foodAllergies
      }
    }

    // Fetch gamification data
    const gamificationSnap = await getDocs(query(
      collection(db, 'gamification'),
      where('userId', '==', userId),
      limit(1)
    ))
    if (!gamificationSnap.empty) {
      const gamData = gamificationSnap.docs[0].data()
      context.currentStreak = gamData.currentStreak
      context.level = gamData.level
    }

    // Fetch recent meals
    const mealsQuery = query(
      collection(db, 'meals'),
      where('userId', '==', userId),
      orderBy('loggedAt', 'desc'),
      limit(10)
    )
    const mealsSnap = await getDocs(mealsQuery)
    context.recentMeals = mealsSnap.docs.map(doc => {
      const meal = doc.data()
      return {
        mealType: meal.mealType,
        totalCalories: meal.totalCalories || meal.aiAnalysis?.totalCalories || 0,
        totalMacros: meal.aiAnalysis?.totalMacros || { protein: 0, carbs: 0, fat: 0 },
        loggedAt: meal.loggedAt
      }
    })

    // Calculate today's progress
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayMeals = context.recentMeals?.filter(meal => {
      const mealDate = new Date(meal.loggedAt)
      return mealDate >= today
    }) || []

    context.todayProgress = todayMeals.reduce((acc, meal) => ({
      calories: acc.calories + meal.totalCalories,
      protein: acc.protein + meal.totalMacros.protein,
      carbs: acc.carbs + meal.totalMacros.carbs,
      fat: acc.fat + meal.totalMacros.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

    return context
  } catch (error) {
    logger.error('[AI Coach] Error fetching user context', error as Error)
    return context
  }
}

// ============================================================================
// CHAT HISTORY
// ============================================================================

/**
 * Get recent chat history for user
 */
export async function getChatHistory(userId: string, limitCount: number = 20): Promise<ChatMessage[]> {
  try {
    const chatQuery = query(
      collection(db, 'chat_messages'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )

    const chatSnap = await getDocs(chatQuery)
    const messages = chatSnap.docs.map(doc => doc.data() as ChatMessage)

    // Reverse to get chronological order
    return messages.reverse()
  } catch (error) {
    logger.error('[AI Coach] Error fetching chat history', error as Error)
    return []
  }
}

/**
 * Save chat message to Firestore
 */
export async function saveChatMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
  try {
    const messageId = `${message.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    await setDoc(doc(db, 'chat_messages', messageId), {
      ...message,
      id: messageId
    })
  } catch (error) {
    logger.error('[AI Coach] Error saving chat message', error as Error)
  }
}

// ============================================================================
// SUGGESTED PROMPTS
// ============================================================================

/**
 * Generate contextual suggested prompts based on user state
 */
export function getSuggestedPrompts(context: ChatContext): string[] {
  const prompts: string[] = []

  // Always include these
  prompts.push("What should I eat for my next meal?")
  prompts.push("How can I increase my protein intake?")

  // Context-specific prompts
  if (context.recentMeals && context.recentMeals.length > 0) {
    prompts.push("How did my recent meals look?")
  }

  if (context.currentStreak && context.currentStreak >= 7) {
    prompts.push("Tips to maintain my streak?")
  }

  if (context.userProfile?.dietaryPreferences && context.userProfile.dietaryPreferences.length > 0) {
    const pref = context.userProfile.dietaryPreferences[0]
    prompts.push(`${pref} meal ideas?`)
  }

  if (context.todayProgress && context.todayProgress.calories < 1000) {
    prompts.push("What are some healthy high-calorie snacks?")
  }

  return prompts.slice(0, 4) // Return max 4 suggestions
}

// ============================================================================
// CONVERSATION STARTERS
// ============================================================================

/**
 * Generate personalized greeting based on context
 */
export function generateGreeting(context: ChatContext): string {
  const name = context.userProfile?.name || 'there'
  const timeOfDay = new Date().getHours()

  let greeting = ''
  if (timeOfDay < 12) greeting = `Good morning, ${name}! ☀️`
  else if (timeOfDay < 18) greeting = `Hey ${name}! 👋`
  else greeting = `Good evening, ${name}! 🌙`

  const messages = [
    `${greeting} How can I help you with your nutrition today?`,
    `${greeting} Ready to talk about your meals or goals?`,
    `${greeting} What's on your mind about your health journey?`
  ]

  // Add streak celebration
  if (context.currentStreak && context.currentStreak >= 7) {
    return `${greeting} Amazing ${context.currentStreak}-day streak! 🔥 How can I support you today?`
  }

  return messages[Math.floor(Math.random() * messages.length)]
}
