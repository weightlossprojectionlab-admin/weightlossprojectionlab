'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MEAL_SUGGESTIONS, MealType, DietaryTag } from '@/lib/meal-suggestions'

export default function RecipeIndexPage() {
  const [selectedMealType, setSelectedMealType] = useState<MealType | 'all'>('all')
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<DietaryTag[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Filter recipes
  const filteredRecipes = MEAL_SUGGESTIONS.filter(recipe => {
    // Filter by meal type
    if (selectedMealType !== 'all' && recipe.mealType !== selectedMealType) {
      return false
    }

    // Filter by dietary tags
    if (selectedDietaryTags.length > 0) {
      const hasAllTags = selectedDietaryTags.every(tag =>
        recipe.dietaryTags.includes(tag)
      )
      if (!hasAllTags) return false
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        recipe.name.toLowerCase().includes(query) ||
        recipe.description.toLowerCase().includes(query) ||
        recipe.ingredients.some(ing => ing.toLowerCase().includes(query))
      )
    }

    return true
  })

  const toggleDietaryTag = (tag: DietaryTag) => {
    setSelectedDietaryTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-health-bg to-primary-light">
      {/* Marketing Banner */}
      <div className="bg-gradient-to-r from-primary to-accent text-white py-3 px-4 text-center">
        <p className="text-sm font-medium">
          ✨ Track these recipes with AI-powered meal analysis.{' '}
          <Link href="/auth" className="underline font-bold hover:text-primary-light">
            Start Free →
          </Link>
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Healthy Recipe Collection
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Browse 28 delicious, macro-friendly recipes. Track them automatically with our AI-powered app.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-background rounded-lg shadow-lg p-6 mb-8">
          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search recipes, ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Meal Type Filter */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Meal Type</h3>
            <div className="flex flex-wrap gap-2">
              {(['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedMealType(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedMealType === type
                      ? 'bg-primary text-white'
                      : 'bg-muted text-foreground hover:bg-muted-hover'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Dietary Tags Filter */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Dietary Preferences</h3>
            <div className="flex flex-wrap gap-2">
              {(['vegan', 'vegetarian', 'keto', 'paleo', 'gluten-free', 'dairy-free', 'high-protein', 'low-carb'] as DietaryTag[]).map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleDietaryTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedDietaryTags.includes(tag)
                      ? 'bg-primary text-white'
                      : 'bg-muted text-foreground hover:bg-muted-hover'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-muted-foreground mb-6">
          {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''} found
        </p>

        {/* Recipe Grid */}
        {filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map(recipe => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="bg-background rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Recipe Card */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-foreground mb-2">{recipe.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {recipe.description}
                  </p>

                  {/* Quick Stats */}
                  <div className="flex justify-between text-xs text-muted-foreground mb-4">
                    <span>{recipe.calories} cal</span>
                    <span>{recipe.macros.protein}g protein</span>
                    <span>{recipe.prepTime} min</span>
                  </div>

                  {/* Dietary Tags */}
                  {recipe.dietaryTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recipe.dietaryTags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-xs bg-primary-light text-primary px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {recipe.dietaryTags.length > 3 && (
                        <span className="text-xs text-muted-foreground px-2 py-1">
                          +{recipe.dietaryTags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-background rounded-lg shadow-lg p-12 text-center">
            <p className="text-muted-foreground text-lg">No recipes found. Try adjusting your filters.</p>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-primary to-accent text-white rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Tracking?</h2>
          <p className="text-lg mb-6 opacity-90">
            Snap a photo of any meal and get instant nutrition analysis
          </p>
          <Link
            href="/auth"
            className="inline-block btn bg-white text-primary hover:bg-gray-100 px-8 py-4 text-lg font-bold rounded-lg shadow-lg"
          >
            Start Your Journey
          </Link>
          <p className="text-sm mt-6 opacity-75">
            ✨ Free forever • No credit card required
          </p>
        </div>
      </div>
    </main>
  )
}
