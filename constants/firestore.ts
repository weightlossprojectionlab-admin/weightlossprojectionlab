export const COLLECTIONS = {
  USERS: 'users',
  RECIPES: 'recipes',
  PRODUCT_DB: 'product_database',
  PRODUCT_ASSOCIATIONS: 'product_associations',
  SYSTEM: 'system',
  MEAL_LOGS: 'meal_logs',
  WEIGHT_LOGS: 'weight_logs',
  STEP_LOGS: 'step_logs',
  MEAL_TEMPLATES: 'meal_templates',
  COOKING_SESSIONS: 'cooking_sessions',
  QUEUED_RECIPES: 'queued_recipes',
} as const

export type CollectionKey = keyof typeof COLLECTIONS
export type CollectionName = typeof COLLECTIONS[CollectionKey]
