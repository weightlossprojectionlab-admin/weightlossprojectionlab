'use client'

import { useState, useRef } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import type { AIAnalysis, MealType } from '@/types'

interface UseMealAnalysisReturn {
  // State
  aiAnalysis: AIAnalysis | null
  analyzing: boolean
  suggestedMealType: MealType | null

  // Actions
  analyzeMeal: (imageData: string, mealType: MealType) => Promise<AIAnalysis | null>
  clearAnalysis: () => void
  abortAnalysis: () => void
  adjustFoodItemPortion: (itemIndex: number, multiplier: number) => void

  // Refs
  abortControllerRef: React.MutableRefObject<AbortController | null>
}

/**
 * Hook for AI meal analysis and safety checks
 *
 * Handles:
 * - Gemini Vision API analysis
 * - Food item identification
 * - Nutritional estimation
 * - Meal type suggestions
 * - Portion adjustments
 * - Request abortion
 */
export function useMealAnalysis(): UseMealAnalysisReturn {
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [suggestedMealType, setSuggestedMealType] = useState<MealType | null>(null)

  // Ref to abort ongoing analysis requests
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Analyze meal image with Gemini Vision API
   * Returns analysis data or null if failed
   */
  const analyzeMeal = async (imageData: string, mealType: MealType): Promise<AIAnalysis | null> => {
    setAnalyzing(true)

    // Create AbortController for this request
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      logger.debug('🔍 Starting AI analysis...')
      logger.debug('Image data length:', { length: imageData.length })
      logger.debug('Image data prefix:', { prefix: imageData.substring(0, 30) })
      logger.debug('Meal type:', { mealType })

      // Get authentication token
      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }
      const token = await user.getIdToken()

      const response = await fetch('/api/ai/analyze-meal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageData,
          mealType
        }),
        signal: abortController.signal
      })

      logger.debug('Response status:', { status: response.status })
      logger.debug('Response ok:', { ok: response.ok })

      // 502 with code AI_VISION_UNAVAILABLE = upstream provider
      // failed (Gemini quota / outage / parse error). Surface a
      // manual-entry path instead of polluting the meal log with
      // fabricated nutrition values.
      if (response.status === 502) {
        let reason = 'AI vision is temporarily unavailable.'
        try {
          const body = await response.json()
          if (body?.error) reason = body.error
        } catch {
          /* body not JSON; use default */
        }
        logger.warn('AI vision unavailable — prompting manual entry', { reason })
        toast.error(
          `${reason} Please enter the meal manually.`,
          { duration: 6000 },
        )
        return null
      }

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('API error response:', new Error(errorText))
        throw new Error(`Analysis request failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      logger.debug('Analysis result:', result)
      logger.debug('Result keys:', { keys: Object.keys(result) })
      logger.debug('Result.success:', { success: result.success })
      logger.debug('Result.data:', result.data)

      if (result.success && result.data) {
        logger.debug('✅ Analysis successful:', result.data)

        // Honest provider signal — no more mock-data branch.
        const provider = result._diagnostics?.provider
        if (provider === 'openai') {
          toast.success(`✅ Analyzed with OpenAI (Gemini unavailable)`, { duration: 3000 })
        } else {
          toast.success(`✅ Meal analyzed successfully`, { duration: 2000 })
        }

        setAiAnalysis(result.data)
        logger.debug('✅ State updated with aiAnalysis:', result.data)

        // Store AI-suggested meal type if provided
        if (result.data.suggestedMealType) {
          logger.debug('🤖 AI suggested meal type:', result.data.suggestedMealType)
          setSuggestedMealType(result.data.suggestedMealType)
        }

        return result.data
      } else {
        logger.error('❌ Analysis failed:', result.error)
        throw new Error(result.error || 'Analysis failed')
      }

    } catch (error) {
      // Don't show error if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        logger.debug('Analysis request aborted')
        return null
      }

      logger.error('💥 Analysis error:', error as Error)
      logger.error('Error details:', new Error(error instanceof Error ? error.message : String(error)))
      toast.error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or enter manually.`)
      return null
    } finally {
      setAnalyzing(false)
      abortControllerRef.current = null
    }
  }

  /**
   * Adjust portion size for a specific food item
   * Recalculates nutrition totals automatically
   */
  const adjustFoodItemPortion = (itemIndex: number, multiplier: number) => {
    if (!aiAnalysis) return

    const updatedFoodItems = [...aiAnalysis.foodItems]
    const item = updatedFoodItems[itemIndex]

    // Adjust all nutrition values by the multiplier
    const adjustedItem = {
      ...item,
      calories: Math.round(item.calories * multiplier),
      protein: Math.round(item.protein * multiplier),
      carbs: Math.round(item.carbs * multiplier),
      fat: Math.round(item.fat * multiplier),
      fiber: Math.round(item.fiber * multiplier),
      portion: `${multiplier}x ${item.portion}` // Update portion display
    }

    updatedFoodItems[itemIndex] = adjustedItem

    // Recalculate totals
    const totalCalories = updatedFoodItems.reduce((sum, item) => sum + item.calories, 0)
    const totalMacros = {
      protein: updatedFoodItems.reduce((sum, item) => sum + item.protein, 0),
      carbs: updatedFoodItems.reduce((sum, item) => sum + item.carbs, 0),
      fat: updatedFoodItems.reduce((sum, item) => sum + item.fat, 0),
      fiber: updatedFoodItems.reduce((sum, item) => sum + item.fiber, 0)
    }

    // Update analysis with adjusted values
    setAiAnalysis({
      ...aiAnalysis,
      foodItems: updatedFoodItems,
      totalCalories,
      totalMacros
    })

    logger.debug('✅ Portion adjusted:', {
      itemIndex,
      multiplier,
      newCalories: adjustedItem.calories,
      totalCalories
    })
  }

  /**
   * Abort ongoing analysis request
   */
  const abortAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      logger.debug('🛑 Analysis aborted by user')
    }
  }

  /**
   * Clear all analysis data
   */
  const clearAnalysis = () => {
    setAiAnalysis(null)
    setSuggestedMealType(null)
    logger.debug('🧹 Analysis state cleared')
  }

  return {
    // State
    aiAnalysis,
    analyzing,
    suggestedMealType,

    // Actions
    analyzeMeal,
    clearAnalysis,
    abortAnalysis,
    adjustFoodItemPortion,

    // Refs
    abortControllerRef
  }
}
