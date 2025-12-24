# Cross-User Recipe Recommendation System

## Overview

The admin system now uses Firebase data from **all users** to power intelligent recipe suggestions. This system aggregates shopping and inventory data across the entire user base to create community-driven recipe recommendations while maintaining user privacy.

## ✅ What's Been Implemented

### 1. Cross-User Recipe Analyzer (`lib/cross-user-recipe-analyzer.ts`)

Core library that analyzes data across all users:

- **`fetchAllShoppingItems()`** - Retrieves all shopping_items from all users
- **`analyzeTrendingIngredients()`** - Identifies popular ingredients across households
- **`analyzeRecipeViability()`** - Calculates how many households can make a specific recipe
- **`getCommunityInsights()`** - Generates comprehensive community statistics
- **`findMostViableRecipes()`** - Finds recipes most users can actually make

### 2. Admin API Endpoint (`app/api/admin/recipes/community-insights/route.ts`)

Admin-only endpoint for viewing and triggering community analysis:

**GET** `/api/admin/recipes/community-insights`
- `?type=overview` - Full community statistics
- `?type=trending` - Trending ingredients list
- `?type=viable-recipes` - Recipes most households can make
- `?type=recipe-viability&recipeId=xxx` - Check specific recipe

**POST** `/api/admin/recipes/community-insights`
- Triggers background analysis
- Caches results in `system/community_insights_cache`

### 3. Enhanced ML Recipe Generator (`lib/ml-recipe-generator.ts`)

**BEFORE**: Only used product associations
**AFTER**: Now integrates cross-user inventory data

Enhancements:
- ✅ Analyzes trending ingredients from all users' inventories
- ✅ Prioritizes recipe generation using popular ingredients
- ✅ Marks recipes that use "community favorite" ingredients
- ✅ Adds community metadata to recipe descriptions

### 4. Public Recipe Recommendations API (`app/api/recipes/recommendations/route.ts`)

User-facing endpoint (privacy-safe, uses aggregated data):

**GET** `/api/recipes/recommendations`

**Types:**

1. **`?type=trending`** (Public)
   - Recipes using trending ingredients across community
   - No authentication required
   - Shows: "Uses X trending ingredients popular in our community"

2. **`?type=popular`** (Public)
   - Recipes that most households can make
   - Based on community inventory availability
   - Shows: "X% of households can make this recipe"

3. **`?type=personalized`** (Authenticated)
   - Personalized to user's inventory
   - Combines user's items + community trends
   - Shows: "You have all ingredients" or "Missing X ingredients"

## Data Flow

```
┌─────────────────────────────────────┐
│   All Users' Shopping Items DB      │
│  (shopping_items collection)        │
└──────────────┬──────────────────────┘
               │
               ├─► Cross-User Recipe Analyzer
               │   • Aggregate trending ingredients
               │   • Calculate recipe viability
               │   • Generate community insights
               │
               ├─► ML Recipe Generator (Enhanced)
               │   • Prioritize trending ingredients
               │   • Generate recipes using popular items
               │
               └─► Recipe Recommendations API
                   • Trending recipes
                   • Popular recipes
                   • Personalized suggestions
```

## Privacy & Security

### What's Safe ✅
- **Aggregated statistics** - "50% of users have milk"
- **Recipe viability** - "30 households can make this"
- **Trending ingredients** - "Chicken is popular this week"
- **Community patterns** - "Users who buy X also buy Y"

### What's Protected 🔒
- **Individual shopping lists** - Never exposed to other users
- **Personal inventory** - Only user sees their own items
- **Purchase history** - Not shared between users

### How It Works
1. Admin uses **Firebase Admin SDK** (bypasses security rules)
2. Data is **aggregated** before being exposed
3. No individual user data is shown to other users
4. Public API only shows **community-level statistics**

## Usage Examples

### Admin: Get Community Insights

```typescript
// Get trending ingredients
GET /api/admin/recipes/community-insights?type=trending&limit=20

// Response:
{
  "trending": [
    {
      "barcode": "123",
      "productName": "Chicken Breast",
      "householdCount": 45,
      "percentageOfHouseholds": 67.2,
      "inStockCount": 38
    }
  ]
}
```

### Admin: Trigger ML Recipe Generation

```typescript
// Generate recipes using cross-user data
POST /api/admin/ml/generate-recipes
{
  "limit": 50
}

// System will:
// 1. Analyze trending ingredients across all users
// 2. Generate recipes prioritizing popular items
// 3. Mark recipes using "community favorites"
```

### User: Get Recipe Recommendations

```typescript
// Get trending recipes (no auth required)
GET /api/recipes/recommendations?type=trending&limit=10

// Get personalized recommendations (auth required)
GET /api/recipes/recommendations?type=personalized&limit=10

// Response includes:
{
  "recommendations": [
    {
      "id": "recipe-123",
      "name": "Chicken Stir Fry",
      "recommendationReason": "Uses 3 trending ingredients popular in our community",
      "trendingIngredients": ["Chicken", "Broccoli", "Soy Sauce"],
      "communityScore": 3
    }
  ],
  "type": "trending",
  "basedOn": "community-wide ingredient trends"
}
```

## Firebase Collections Used

### Read Access (All Users)
- `shopping_items` - Kitchen inventory and shopping lists
- `recipes` - Global recipe database
- `product_associations` - ML-generated product pairings
- `product_database` - Global product catalog

### Write Access (Admin Only)
- `system/community_insights_cache` - Cached analysis results
- `system/community_insights_status` - Background job status
- `system/ml_recipe_generation_status` - Recipe generation status

## Admin Dashboard Integration

The admin can now:
1. View community inventory trends
2. See which ingredients are most popular
3. Identify recipes most users can make
4. Generate ML recipes optimized for community inventory
5. Monitor recipe generation status

## Next Steps

Potential enhancements:
- [ ] Add temporal analysis (trending this week vs last week)
- [ ] Seasonal ingredient tracking
- [ ] Recipe success rate tracking (which recipes users complete)
- [ ] Household clustering (similar dietary preferences)
- [ ] Geographic trends (regional ingredient availability)
- [ ] Dietary restriction analysis across community

## Testing

To test the system:

1. **Populate test data:**
   ```bash
   # Add shopping items for multiple test users
   # Run product association analysis
   POST /api/admin/ml/analyze-associations
   ```

2. **Generate recipes:**
   ```bash
   # Generate recipes using cross-user data
   POST /api/admin/ml/generate-recipes
   ```

3. **View insights:**
   ```bash
   # Get community overview
   GET /api/admin/recipes/community-insights?type=overview
   ```

4. **Test recommendations:**
   ```bash
   # Get trending recipes
   GET /api/recipes/recommendations?type=trending&limit=10
   ```

## Technical Notes

- Uses Firebase Admin SDK for unrestricted data access
- Implements efficient batch queries and aggregation
- Caches results to reduce computation overhead
- Background processing for long-running analyses
- Privacy-safe aggregation before public exposure

---

**Status:** ✅ Fully Implemented and Wired Up
**Date:** 2025-12-05
**Files Modified:** 4 new files created, 1 existing file enhanced
