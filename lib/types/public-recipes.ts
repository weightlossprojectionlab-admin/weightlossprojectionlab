// Public Recipe Discovery Platform Types
import { MealSuggestion, MealType, DietaryTag, AllergyTag } from '../meal-suggestions'
import { Timestamp } from 'firebase/firestore'

export type RecipeStatus = 'pending' | 'approved' | 'rejected'
export type RecipeDifficulty = 'easy' | 'medium' | 'hard'
export type AspectRatio = '1:1' | '3:4' | '4:3' | '16:9' | '9:16'
export type RecipeSourceType = 'meal_log' | 'custom' | 'template'

/**
 * Public Recipe - Extended from MealSuggestion with Pinterest-style metadata
 */
export interface PublicRecipe extends Omit<MealSuggestion, 'id'> {
  id: string

  // Creator information
  createdBy: string // uid
  createdByName: string
  createdByPhoto?: string
  createdByVerified: boolean

  // Timestamps
  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
  submittedAt: Timestamp | Date

  // Moderation
  status: RecipeStatus
  moderationNotes?: string
  moderatedBy?: string
  moderatedAt?: Timestamp | Date

  // Image metadata (Pinterest-optimized)
  imageUrl: string // Required high-quality image
  imageAspectRatio: AspectRatio
  imageBlurHash?: string // For smooth loading placeholder

  // Engagement metrics
  saves: number
  shares: number
  views: number
  impressions: number
  clickThroughRate: number

  // Discovery algorithm metrics
  popularityScore: number // Calculated score for ranking
  freshnessBoost: number // Boost for new recipes
  savesLast7Days: number // Trending metric

  // Source tracking
  sourceType: RecipeSourceType
  sourceMealLogId?: string // If created from meal log

  // Additional metadata
  tags: string[] // User-added searchable tags
  difficulty: RecipeDifficulty
  cuisine?: string
  isPublic: boolean
  isFeatured: boolean // Admin can feature recipes

  // SEO
  slug: string // URL-friendly slug for /recipe/[slug]
  metaDescription?: string
}

/**
 * Recipe Board - Like Pinterest boards
 */
export interface RecipeBoard {
  id: string
  uid: string
  name: string
  description?: string
  coverImages: string[] // Up to 4 images for cover grid
  recipeIds: string[]
  recipeCount: number
  isPublic: boolean
  saves: number // How many people saved this board
  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
}

/**
 * Recipe Save - Track when users save recipes
 */
export interface RecipeSave {
  id: string
  recipeId: string
  userId: string
  boardId?: string // Optional: which board they saved to
  savedAt: Timestamp | Date
}

/**
 * User Following - Creator follow system
 */
export interface UserFollowing {
  id: string
  followerId: string // Who is following
  followingId: string // Who they follow
  followedAt: Timestamp | Date
}

/**
 * Creator Profile - Extended user profile with creator stats
 */
export interface CreatorProfile {
  uid: string
  displayName: string
  photoURL?: string
  verified: boolean
  bio?: string

  // Stats
  followerCount: number
  followingCount: number
  recipeCount: number
  totalSaves: number
  totalViews: number
  totalShares: number

  // Social links
  socialLinks?: {
    instagram?: string
    tiktok?: string
    youtube?: string
    website?: string
  }

  // Settings
  allowRecipeSharing: boolean
  emailNotifications: boolean

  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
}

/**
 * Membership Tier
 */
export type MembershipTier = 'free' | 'basic' | 'premium'

export interface MembershipPermissions {
  tier: MembershipTier
  recipeViewsPerMonth: number | 'unlimited'
  canSubmitRecipes: boolean
  canSaveFavorites: boolean
  maxBoards: number
  advancedFilters: boolean
  canFollowCreators: boolean
  canDownloadPDF: boolean
  canScaleRecipes: boolean
  canAccessSubstitutions: boolean
  canCreateMealPlans: boolean
  seeAnalytics: boolean
  prioritySupport: boolean
}

/**
 * Recipe View Tracking - For freemium limits
 */
export interface RecipeViewTracking {
  userId: string
  monthKey: string // Format: "YYYY-MM"
  viewedRecipeIds: string[]
  viewCount: number
  lastViewedAt: Timestamp | Date
}

/**
 * Creator Badge
 */
export interface CreatorBadge {
  id: string
  name: string
  description: string
  icon: string
  criteria: {
    minRecipes?: number
    minSaves?: number
    minRating?: number
    minFollowers?: number
    custom?: string
  }
}

/**
 * Recipe Notification
 */
export type NotificationType =
  | 'recipe_saved'
  | 'recipe_shared'
  | 'milestone_reached'
  | 'new_follower'
  | 'recipe_featured'
  | 'recipe_approved'
  | 'recipe_rejected'
  | 'new_recipe_from_following'

export interface RecipeNotification {
  id: string
  userId: string // Recipient
  type: NotificationType
  recipeId?: string
  actorId?: string // Who performed the action
  actorName?: string
  actorPhoto?: string
  message: string
  read: boolean
  createdAt: Timestamp | Date
}

/**
 * Recipe Search Filters
 */
export interface RecipeFilters {
  mealType?: MealType[]
  dietaryTags?: DietaryTag[]
  excludeAllergens?: AllergyTag[]
  minCalories?: number
  maxCalories?: number
  minProtein?: number
  maxProtein?: number
  minCarbs?: number
  maxCarbs?: number
  minFat?: number
  maxFat?: number
  maxPrepTime?: number
  difficulty?: RecipeDifficulty[]
  cuisine?: string[]
  searchQuery?: string
  tags?: string[]
}

/**
 * Recipe Sort Options
 */
export type RecipeSortOption =
  | 'popular' // By popularityScore
  | 'newest' // By createdAt
  | 'trending' // By savesLast7Days
  | 'most_saved' // By saves
  | 'most_viewed' // By views

/**
 * Personalized Recipe Score
 */
export interface RecipeScore {
  recipeId: string
  score: number
  reasons: string[] // Why this recipe is recommended
}

/**
 * User Behavior for Recommendations
 */
export interface UserBehavior {
  userId: string
  savedRecipes: PublicRecipe[]
  viewedRecipes: string[]
  followedCreators: string[]
  preferredMealTypes: MealType[]
  averageCaloriesViewed: number
  lastActive: Timestamp | Date
}
