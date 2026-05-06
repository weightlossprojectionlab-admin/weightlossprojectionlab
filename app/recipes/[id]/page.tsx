import { Metadata } from 'next'
import Link from 'next/link'
import { MEAL_SUGGESTIONS, MealSuggestion } from '@/lib/meal-suggestions'
import { notFound } from 'next/navigation'
import { adminDb } from '@/lib/firebase-admin'
import RecipeActions from '@/components/recipes/RecipeActions'
import { mergeRecipeWithMedia } from '@/lib/recipe-merge'
import { JsonLd } from '@/components/seo/JsonLd'
import { recipeSchema } from '@/lib/json-ld'

async function getRecipe(id: string): Promise<MealSuggestion | null> {
  // Fetch both sources in parallel — Firestore overlays let admin
  // edits (regenerated ingredients/steps, uploaded media) take effect
  // on hardcoded recipes. Source-of-truth rules are in mergeRecipeWithMedia.
  const hardcoded = MEAL_SUGGESTIONS.find(r => r.id === id) ?? null

  let firestoreDoc: any = null
  try {
    const doc = await adminDb.collection('recipes').doc(id).get()
    if (doc.exists) {
      firestoreDoc = { id: doc.id, ...doc.data() }
    }
  } catch {
    // Firestore error — fall through with hardcoded only
  }

  return mergeRecipeWithMedia(hardcoded, firestoreDoc)
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

// DISABLED: Static generation causing build timeouts on Netlify
// Will render on-demand instead
// export async function generateStaticParams() {
//   return MEAL_SUGGESTIONS.map((recipe) => ({
//     id: recipe.id
//   }))
// }

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const recipe = await getRecipe(id)

  if (!recipe) {
    return {
      title: 'Recipe Not Found',
    }
  }

  const description = `${recipe.description} - ${recipe.calories} calories, ${recipe.macros?.protein ?? 0}g protein, ready in ${recipe.prepTime} minutes.`

  return {
    title: `${recipe.name} Recipe | Weight Loss Project Lab`,
    description,
    keywords: [
      recipe.name,
      'healthy recipe',
      'nutrition tracking',
      ...recipe.dietaryTags,
      `${recipe.mealType} recipe`,
      'meal prep'
    ].join(', '),
    openGraph: {
      title: recipe.name,
      description,
      type: 'article',
      url: `/recipes/${recipe.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: recipe.name,
      description,
    },
  }
}

export const dynamic = 'force-dynamic'

export default async function RecipeDetailPage({ params }: PageProps) {
  const { id } = await params
  const recipe = await getRecipe(id)

  if (!recipe) {
    notFound()
  }

  // schema.org Recipe rich-result schema. Server-rendered into the page
  // so Google / Bing / AI crawlers (Perplexity, ChatGPT, Gemini) can parse
  // it. Mirrors what's currently rendered to users — when ingredient/step
  // gating lands, the corresponding fields must be omitted to avoid
  // cloaking penalties.
  const ingredientStrings: string[] | undefined = (() => {
    const list: unknown = (recipe as unknown as { ingredients?: unknown }).ingredients
    if (!Array.isArray(list)) return undefined
    const flat = list
      .map((i: unknown) => {
        if (typeof i === 'string') return i
        if (i && typeof i === 'object' && 'ingredientText' in i) {
          return String((i as { ingredientText: unknown }).ingredientText)
        }
        return ''
      })
      .filter(Boolean)
    return flat.length > 0 ? flat : undefined
  })()

  const schema = recipeSchema({
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    imageUrls: recipe.imageUrls,
    imageAlts: recipe.imageAlts,
    mealType: recipe.mealType,
    prepTimeMinutes: recipe.prepTime,
    servingSize: recipe.servingSize,
    calories: recipe.calories,
    macros: recipe.macros,
    dietaryTags: recipe.dietaryTags,
    allergens: recipe.allergens,
    ingredientStrings,
    recipeSteps: recipe.recipeSteps,
    cookingTips: recipe.cookingTips,
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-100">
      <JsonLd data={schema} />
      {/* Marketing Banner */}
      <div className="bg-gradient-to-r from-primary to-accent text-white py-3 px-4 text-center">
        <p className="text-sm font-medium">
          ✨ Get 200+ recipes like this with WPL-powered meal tracking.{' '}
          <Link href="/auth" className="underline font-bold hover:text-primary-light">
            Start Free →
          </Link>
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link href="/recipes" className="inline-flex items-center text-sm text-primary hover:text-primary-hover mb-6">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Browse all recipes
        </Link>

        {/* Recipe Card */}
        <div className="bg-card rounded-lg shadow-xl overflow-hidden">
          {/* Hero Image (imageUrls[0]). Alt text uses per-image imageAlts when
              present (admin-curated for SEO + accessibility); falls back to the
              recipe name when blank. */}
          {recipe.imageUrls && recipe.imageUrls.length > 0 && (
            <div className="relative w-full h-64 md:h-80">
              <img
                src={recipe.imageUrls[0]}
                alt={recipe.imageAlts?.[0]?.trim() || recipe.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Carousel — additional images below the hero (imageUrls[1..4]).
              Horizontally scrollable on small screens, grid on larger. */}
          {recipe.imageUrls && recipe.imageUrls.length > 1 && (
            <div className="px-4 pt-4 pb-2 overflow-x-auto">
              <div className="flex gap-3 min-w-max sm:min-w-0 sm:grid sm:grid-cols-4">
                {recipe.imageUrls.slice(1).map((url: string, i: number) => (
                  <img
                    key={i}
                    src={url}
                    alt={recipe.imageAlts?.[i + 1]?.trim() || `${recipe.name} ${i + 2}`}
                    className="h-24 w-24 sm:h-auto sm:w-full sm:aspect-square object-cover rounded-lg border border-border flex-shrink-0"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Header */}
          <div className="p-8 border-b border-border">
            <h1 className="text-4xl font-bold text-foreground mb-2">{recipe.name}</h1>
            <p className="text-lg text-muted-foreground">{recipe.description}</p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold text-primary">{recipe.calories}</p>
                <p className="text-xs text-muted-foreground">calories</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold text-primary">{recipe.macros?.protein}g</p>
                <p className="text-xs text-muted-foreground">protein</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold text-primary">{recipe.prepTime} min</p>
                <p className="text-xs text-muted-foreground">prep time</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold text-primary">{recipe.servingSize}</p>
                <p className="text-xs text-muted-foreground">serving{recipe.servingSize > 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-8">
            {/* Nutrition */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Nutrition</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between p-3 bg-muted rounded">
                  <span className="text-muted-foreground">Carbs:</span>
                  <span className="font-medium">{recipe.macros?.carbs}g</span>
                </div>
                <div className="flex justify-between p-3 bg-muted rounded">
                  <span className="text-muted-foreground">Fat:</span>
                  <span className="font-medium">{recipe.macros?.fat}g</span>
                </div>
                <div className="flex justify-between p-3 bg-muted rounded">
                  <span className="text-muted-foreground">Fiber:</span>
                  <span className="font-medium">{recipe.macros?.fiber}g</span>
                </div>
              </div>
            </div>

            {/* Dietary Tags */}
            {recipe.dietaryTags.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Dietary Info</h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.dietaryTags.map(tag => (
                    <span key={tag} className="text-sm bg-primary-light dark:bg-purple-900/20 text-primary px-3 py-1.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Allergens */}
            {recipe.allergens.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Allergen Warning</h3>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-200 mb-2">Contains:</p>
                  <div className="flex flex-wrap gap-2">
                    {recipe.allergens.map(allergen => (
                      <span key={allergen} className="text-sm bg-orange-100 text-orange-800 px-3 py-1 rounded-full">
                        {allergen}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Ingredients */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Ingredients</h2>
              <ul className="space-y-2">
                {recipe.ingredients.map((ingredient, idx) => (
                  <li key={idx} className="flex items-start text-foreground">
                    <span className="text-primary mr-3 font-bold">•</span>
                    <span>{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recipe Steps */}
            {recipe.recipeSteps && recipe.recipeSteps.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-4">Instructions</h2>
                <ol className="space-y-4">
                  {recipe.recipeSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start text-foreground">
                      <span className="font-bold text-primary text-xl mr-4 min-w-[32px]">{idx + 1}.</span>
                      <span className="pt-1">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Cooking Tips */}
            {recipe.cookingTips && recipe.cookingTips.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Cooking Tips</h3>
                <div className="bg-secondary-light border border-secondary-light rounded-lg p-4 space-y-3">
                  {recipe.cookingTips.map((tip, idx) => (
                    <p key={idx} className="text-sm text-secondary-dark flex items-start">
                      <span className="text-secondary dark:text-blue-300 mr-2 text-lg">💡</span>
                      <span>{tip}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* No Recipe Available */}
            {(!recipe.recipeSteps || recipe.recipeSteps.length === 0) && (
              <div className="bg-muted rounded-lg p-6 text-center">
                <p className="text-muted-foreground">
                  Full recipe instructions coming soon! In the meantime, use the ingredients list above to recreate this meal.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons. Pass the full MealSuggestion as `recipe`
              so RecipeActions can hand it off to RecipeModal for the
              cooking-session flow (which is shared with /dashboard). */}
          <RecipeActions
            recipeId={recipe.id}
            recipeName={recipe.name}
            ingredients={(recipe.ingredients || []).map((text: string) => ({
              name: text,
              quantity: 1,
            }))}
            calories={recipe.calories || 0}
            prepTime={recipe.prepTime || 30}
            hasSteps={!!recipe.recipeSteps?.length && recipe.recipeSteps.some((s: string) => s.trim().length > 10)}
            recipe={recipe}
          />
        </div>

        {/* Marketing CTA Section */}
        <div className="mt-12 bg-gradient-to-r from-primary to-accent text-white rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Love This Recipe?</h2>
          <p className="text-lg mb-6 opacity-90">
            Track this meal and 200+ more recipes with WPL-powered nutrition analysis
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/auth"
              className="btn bg-card text-primary hover:bg-muted px-8 py-4 text-lg font-bold rounded-lg shadow-lg"
            >
              Start Tracking Free
            </Link>
            <Link
              href="/recipes"
              className="btn bg-transparent border-2 border-white text-white hover:bg-card/10 px-8 py-4 text-lg font-medium rounded-lg"
            >
              Browse More Recipes
            </Link>
          </div>
          <p className="text-sm mt-6 opacity-75">
            ✨ Snap. Analyze. Track. All in 30 seconds.
          </p>
        </div>

        {/* Social Proof */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">Join thousands tracking their nutrition</p>
          <div className="flex flex-col md:flex-row justify-center gap-8 text-sm">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-3xl">⚡</span>
              <span className="text-foreground">30-second meal logging</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-3xl">🎯</span>
              <span className="text-foreground">WPL-powered analysis</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-3xl">📈</span>
              <span className="text-foreground">Real results</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
