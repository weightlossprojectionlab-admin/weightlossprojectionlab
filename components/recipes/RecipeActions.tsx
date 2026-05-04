'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { ShareIcon, ClipboardDocumentCheckIcon, SparklesIcon, FireIcon } from '@heroicons/react/24/outline'
import { RecipeIntegrationButton } from '@/components/shopping/RecipeIntegrationButton'
import { shareViaWebAPI, isWebShareSupported, generateShareContent } from '@/lib/social-share-utils'
import toast from 'react-hot-toast'
import type { RecipeIngredient } from '@/lib/shopping-diff'
import type { MealSuggestion } from '@/lib/meal-suggestions'

// Defer-load RecipeModal — it's heavy (image gen, share menus, timers)
// and only used when the user clicks Start Cooking, which is rare on
// the public recipe page. Mirrors how the dashboard loads it.
const RecipeModal = dynamic(
  () => import('@/components/ui/RecipeModal').then((mod) => ({ default: mod.RecipeModal })),
  { ssr: false }
)

interface RecipeActionsProps {
  recipeId: string
  recipeName: string
  ingredients: RecipeIngredient[]
  calories: number
  prepTime: number
  hasSteps?: boolean

  /**
   * Full recipe payload — passed straight to RecipeModal when the user
   * clicks Start Cooking. RecipeModal owns the cooking-session creation
   * (duplicate-click guard, missing-ingredients block, recipe scaling,
   * step-timer construction). Optional so legacy callers without a
   * full MealSuggestion still render the other action buttons.
   */
  recipe?: MealSuggestion
}

export default function RecipeActions({
  recipeId,
  recipeName,
  ingredients,
  calories,
  prepTime,
  hasSteps = true,
  recipe,
}: RecipeActionsProps) {
  const { isAdmin } = useAdminAuth()
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [showCookingModal, setShowCookingModal] = useState(false)

  const handleShare = async () => {
    const content = generateShareContent({
      type: 'recipe',
      data: { id: recipeId, name: recipeName, calories, prepTime }
    })

    if (isWebShareSupported()) {
      await shareViaWebAPI(content)
      return
    }

    try {
      await navigator.clipboard.writeText(content.url || window.location.href)
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleGenerateSteps = async () => {
    setGenerating(true)
    try {
      // Generate steps via AI
      const res = await fetch('/api/recipes/generate-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe: {
            name: recipeName,
            ingredients: ingredients.map(i => i.name || (i as any).originalText || ''),
            servingSize: 1,
          }
        })
      })

      if (!res.ok) throw new Error('Failed to generate')
      const data = await res.json()

      // Save to Firestore via admin API
      const { getAdminAuthToken } = await import('@/lib/admin/api')
      const { getCSRFToken } = await import('@/lib/csrf')
      const token = await getAdminAuthToken()
      await fetch(`/api/admin/recipes/${recipeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': getCSRFToken()
        },
        body: JSON.stringify({
          recipeSteps: data.recipeSteps || [],
          cookingTips: data.cookingTips || [],
          requiresCooking: data.requiresCooking ?? true,
        })
      })

      toast.success('Recipe generated!')
      window.location.reload()
    } catch {
      toast.error('Failed to generate recipe steps')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-3 mt-8">
      <RecipeIntegrationButton
        recipeId={recipeId}
        recipeName={recipeName}
        ingredients={ingredients}
        className="flex-1 min-w-[140px] justify-center py-3"
      />
      {recipe && (
        <button
          onClick={() => setShowCookingModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium"
          title="Start a cooking session — RecipeModal handles missing-ingredient checks, scaling, and inventory deduction on completion"
        >
          <FireIcon className="h-5 w-5" />
          Start Cooking
        </button>
      )}
      <button
        onClick={handleShare}
        className="flex items-center gap-2 px-6 py-3 bg-card border-2 border-border text-foreground rounded-lg hover:border-primary hover:text-primary transition-colors font-medium"
      >
        {copied ? (
          <ClipboardDocumentCheckIcon className="h-5 w-5 text-green-500" />
        ) : (
          <ShareIcon className="h-5 w-5" />
        )}
        {copied ? 'Copied!' : 'Share'}
      </button>
      {isAdmin && (
        <button
          onClick={handleGenerateSteps}
          disabled={generating}
          className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors font-medium"
        >
          <SparklesIcon className="h-5 w-5" />
          {generating ? 'Generating...' : 'Regenerate Recipe'}
        </button>
      )}

      {/* RecipeModal renders inline; it owns the cooking-session
          creation flow including missing-ingredients block, recipe
          scaling, and the redirect to /cooking/{id}. */}
      {recipe && (
        <RecipeModal
          suggestion={recipe}
          isOpen={showCookingModal}
          onClose={() => setShowCookingModal(false)}
        />
      )}
    </div>
  )
}
