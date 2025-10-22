/**
 * Weekly Missions Engine
 *
 * Gamification system for personalized weekly challenges, XP rewards, and badges.
 * Part of Phase 3 Backend Agents implementation.
 */

import { startOfWeek, endOfWeek, differenceInDays, format } from 'date-fns'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Mission {
  id: string
  type: 'weekly' | 'streak' | 'one-time'
  title: string
  description: string
  xpReward: number
  badgeReward?: Badge
  criteria: MissionCriteria
  difficulty: 'easy' | 'medium' | 'hard'
  category: 'logging' | 'nutrition' | 'consistency' | 'cooking'
}

export interface MissionCriteria {
  type: 'meal_count' | 'protein_goal' | 'recipe_cook' | 'streak' | 'weight_log' | 'all_meals_day'
  target: number
  timeframe: 'week' | 'consecutive_days' | 'total'
  metadata?: Record<string, any>
}

export interface UserMission {
  userId: string
  missionId: string
  weekStart: string // ISO date string of Monday
  progress: number
  completed: boolean
  completedAt?: string
  xpAwarded: boolean
  createdAt: string
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlockedAt?: string
}

// ============================================================================
// MISSION DEFINITIONS
// ============================================================================

export const MISSION_CATALOG: Mission[] = [
  // Easy Missions (10-25 XP)
  {
    id: 'log_3_meals',
    type: 'weekly',
    title: 'Meal Logger',
    description: 'Log at least 3 meals this week',
    xpReward: 10,
    difficulty: 'easy',
    category: 'logging',
    criteria: {
      type: 'meal_count',
      target: 3,
      timeframe: 'week'
    }
  },
  {
    id: 'log_weight_once',
    type: 'weekly',
    title: 'Weekly Weigh-In',
    description: 'Log your weight this week',
    xpReward: 15,
    difficulty: 'easy',
    category: 'consistency',
    criteria: {
      type: 'weight_log',
      target: 1,
      timeframe: 'week'
    }
  },
  {
    id: 'cook_1_recipe',
    type: 'weekly',
    title: 'Kitchen Starter',
    description: 'Cook 1 recipe from the app this week',
    xpReward: 20,
    difficulty: 'easy',
    category: 'cooking',
    criteria: {
      type: 'recipe_cook',
      target: 1,
      timeframe: 'week'
    }
  },

  // Medium Missions (30-50 XP)
  {
    id: 'log_all_meals_3_days',
    type: 'weekly',
    title: 'Consistent Logger',
    description: 'Log all 3 meals (breakfast, lunch, dinner) for 3 days this week',
    xpReward: 35,
    difficulty: 'medium',
    category: 'logging',
    criteria: {
      type: 'all_meals_day',
      target: 3,
      timeframe: 'week'
    }
  },
  {
    id: 'log_all_meals_5_days',
    type: 'weekly',
    title: 'Tracking Master',
    description: 'Log all 3 meals for 5 days this week',
    xpReward: 50,
    difficulty: 'medium',
    category: 'logging',
    criteria: {
      type: 'all_meals_day',
      target: 5,
      timeframe: 'week'
    }
  },
  {
    id: 'protein_goal_4_days',
    type: 'weekly',
    title: 'Protein Power',
    description: 'Hit your protein goal for 4 days in a row',
    xpReward: 40,
    difficulty: 'medium',
    category: 'nutrition',
    badgeReward: {
      id: 'protein_master',
      name: 'Protein Master',
      description: 'Hit protein goal 4 days in a row',
      icon: '💪',
      rarity: 'rare'
    },
    criteria: {
      type: 'protein_goal',
      target: 4,
      timeframe: 'consecutive_days'
    }
  },
  {
    id: 'cook_2_recipes',
    type: 'weekly',
    title: 'Home Chef',
    description: 'Cook 2 recipes from the app this week',
    xpReward: 45,
    difficulty: 'medium',
    category: 'cooking',
    badgeReward: {
      id: 'home_chef',
      name: 'Home Chef',
      description: 'Cooked 2 recipes from the app',
      icon: '👨‍🍳',
      rarity: 'rare'
    },
    criteria: {
      type: 'recipe_cook',
      target: 2,
      timeframe: 'week'
    }
  },

  // Hard Missions (60-100 XP)
  {
    id: 'log_all_meals_7_days',
    type: 'weekly',
    title: 'Perfect Week',
    description: 'Log all 3 meals every single day this week',
    xpReward: 100,
    difficulty: 'hard',
    category: 'logging',
    badgeReward: {
      id: 'perfect_week',
      name: 'Perfect Week',
      description: 'Logged all meals for 7 consecutive days',
      icon: '🏆',
      rarity: 'epic'
    },
    criteria: {
      type: 'all_meals_day',
      target: 7,
      timeframe: 'week'
    }
  },
  {
    id: '7_day_streak',
    type: 'streak',
    title: 'Week Warrior',
    description: 'Log at least 1 meal every day for 7 days straight',
    xpReward: 75,
    difficulty: 'hard',
    category: 'consistency',
    badgeReward: {
      id: 'week_warrior',
      name: 'Week Warrior',
      description: '7-day logging streak',
      icon: '🔥',
      rarity: 'epic'
    },
    criteria: {
      type: 'streak',
      target: 7,
      timeframe: 'consecutive_days'
    }
  },
  {
    id: 'cook_5_recipes',
    type: 'weekly',
    title: 'Master Chef',
    description: 'Cook 5 recipes from the app this week',
    xpReward: 80,
    difficulty: 'hard',
    category: 'cooking',
    badgeReward: {
      id: 'master_chef',
      name: 'Master Chef',
      description: 'Cooked 5 recipes in one week',
      icon: '⭐',
      rarity: 'legendary'
    },
    criteria: {
      type: 'recipe_cook',
      target: 5,
      timeframe: 'week'
    }
  }
]

// ============================================================================
// MISSION GENERATION & SELECTION
// ============================================================================

/**
 * Get missions for the current week
 * Returns a personalized set of 3-5 missions based on user level
 */
export function getWeeklyMissions(userLevel: number = 1): Mission[] {
  const missions: Mission[] = []

  // Always include 1 easy mission
  const easyMissions = MISSION_CATALOG.filter(m => m.difficulty === 'easy')
  missions.push(easyMissions[Math.floor(Math.random() * easyMissions.length)])

  // Include 2-3 medium missions
  const mediumMissions = MISSION_CATALOG.filter(m => m.difficulty === 'medium')
  const mediumCount = userLevel >= 3 ? 3 : 2
  for (let i = 0; i < mediumCount && i < mediumMissions.length; i++) {
    const mission = mediumMissions[i]
    if (!missions.find(m => m.id === mission.id)) {
      missions.push(mission)
    }
  }

  // Include 1 hard mission if user is level 3+
  if (userLevel >= 3) {
    const hardMissions = MISSION_CATALOG.filter(m => m.difficulty === 'hard')
    if (hardMissions.length > 0) {
      missions.push(hardMissions[0])
    }
  }

  return missions
}

/**
 * Get the current week's date range
 */
export function getCurrentWeek(): { start: Date; end: Date } {
  const now = new Date()
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(now, { weekStartsOn: 1 }) // Sunday
  }
}

/**
 * Format week identifier (ISO date string of Monday)
 */
export function getWeekIdentifier(date: Date = new Date()): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 })
  return format(monday, 'yyyy-MM-dd')
}

// ============================================================================
// MISSION PROGRESS CALCULATION
// ============================================================================

export interface MealLog {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  loggedAt: string
  aiAnalysis?: {
    protein?: number
    proteinGoal?: number
  }
}

export interface WeightLog {
  weight: number
  loggedAt: string
}

export interface RecipeCompletion {
  recipeId: string
  completedAt: string
}

/**
 * Calculate progress for a mission based on user activity
 */
export function calculateMissionProgress(
  mission: Mission,
  meals: MealLog[],
  weightLogs: WeightLog[],
  recipes: RecipeCompletion[],
  weekStart: Date
): number {
  const { criteria } = mission

  switch (criteria.type) {
    case 'meal_count': {
      // Count meals logged this week
      const weekMeals = meals.filter(m => {
        const mealDate = new Date(m.loggedAt)
        return mealDate >= weekStart && mealDate <= endOfWeek(weekStart, { weekStartsOn: 1 })
      })
      return Math.min(weekMeals.length, criteria.target)
    }

    case 'all_meals_day': {
      // Count days with all 3 meals (breakfast, lunch, dinner)
      const weekMeals = meals.filter(m => {
        const mealDate = new Date(m.loggedAt)
        return mealDate >= weekStart && mealDate <= endOfWeek(weekStart, { weekStartsOn: 1 })
      })

      // Group by day
      const mealsByDay = new Map<string, Set<string>>()
      weekMeals.forEach(meal => {
        const day = format(new Date(meal.loggedAt), 'yyyy-MM-dd')
        if (!mealsByDay.has(day)) {
          mealsByDay.set(day, new Set())
        }
        mealsByDay.get(day)!.add(meal.mealType)
      })

      // Count days with all 3 main meals
      let daysWithAllMeals = 0
      mealsByDay.forEach(mealTypes => {
        if (mealTypes.has('breakfast') && mealTypes.has('lunch') && mealTypes.has('dinner')) {
          daysWithAllMeals++
        }
      })

      return Math.min(daysWithAllMeals, criteria.target)
    }

    case 'protein_goal': {
      // Count consecutive days hitting protein goal
      const weekMeals = meals.filter(m => {
        const mealDate = new Date(m.loggedAt)
        return mealDate >= weekStart && mealDate <= endOfWeek(weekStart, { weekStartsOn: 1 })
      })

      // Group by day and check if daily protein goal met
      const dayProteinMet = new Map<string, boolean>()
      weekMeals.forEach(meal => {
        const day = format(new Date(meal.loggedAt), 'yyyy-MM-dd')
        if (meal.aiAnalysis?.protein && meal.aiAnalysis?.proteinGoal) {
          const currentMet = dayProteinMet.get(day) ?? false
          const thisMealMet = meal.aiAnalysis.protein >= meal.aiAnalysis.proteinGoal
          dayProteinMet.set(day, currentMet || thisMealMet)
        }
      })

      // Find longest consecutive streak of days meeting goal
      const sortedDays = Array.from(dayProteinMet.keys()).sort()
      let maxStreak = 0
      let currentStreak = 0

      for (let i = 0; i < sortedDays.length; i++) {
        if (dayProteinMet.get(sortedDays[i])) {
          currentStreak++
          maxStreak = Math.max(maxStreak, currentStreak)
        } else {
          currentStreak = 0
        }
      }

      return Math.min(maxStreak, criteria.target)
    }

    case 'recipe_cook': {
      // Count recipes completed this week
      const weekRecipes = recipes.filter(r => {
        const recipeDate = new Date(r.completedAt)
        return recipeDate >= weekStart && recipeDate <= endOfWeek(weekStart, { weekStartsOn: 1 })
      })
      return Math.min(weekRecipes.length, criteria.target)
    }

    case 'weight_log': {
      // Count weight logs this week
      const weekWeights = weightLogs.filter(w => {
        const weightDate = new Date(w.loggedAt)
        return weightDate >= weekStart && weightDate <= endOfWeek(weekStart, { weekStartsOn: 1 })
      })
      return Math.min(weekWeights.length, criteria.target)
    }

    case 'streak': {
      // Calculate consecutive days with at least 1 meal
      const sortedMeals = meals
        .map(m => format(new Date(m.loggedAt), 'yyyy-MM-dd'))
        .sort()

      const uniqueDays = Array.from(new Set(sortedMeals))

      // Find longest consecutive streak
      let maxStreak = 0
      let currentStreak = 0
      let lastDate: Date | null = null

      uniqueDays.forEach(dayStr => {
        const day = new Date(dayStr)
        if (lastDate === null) {
          currentStreak = 1
        } else {
          const dayDiff = differenceInDays(day, lastDate)
          if (dayDiff === 1) {
            currentStreak++
          } else {
            currentStreak = 1
          }
        }
        maxStreak = Math.max(maxStreak, currentStreak)
        lastDate = day
      })

      return Math.min(maxStreak, criteria.target)
    }

    default:
      return 0
  }
}

/**
 * Check if a mission is complete
 */
export function isMissionComplete(mission: Mission, progress: number): boolean {
  return progress >= mission.criteria.target
}
