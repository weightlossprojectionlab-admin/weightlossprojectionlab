'use client'

import { useState } from 'react'
import { mealLogOperations } from '@/lib/firebase-operations'
import { medicalOperations } from '@/lib/medical-operations'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import type { AIAnalysis, MealType } from '@/types'

interface MealSaveParams {
  mealType: MealType
  photoUrl?: string
  additionalPhotos?: string[]
  aiAnalysis?: AIAnalysis | null
  patientId?: string | null
  patientName?: string
  notes?: string
  onSuccess?: () => void
}

interface UseMealSaveReturn {
  saving: boolean
  saveMeal: (params: MealSaveParams) => Promise<void>
}

/**
 * Hook for unified meal saving (user + patient modes)
 *
 * Handles:
 * - User meal logs via /api/meal-logs
 * - Patient meal logs via medical operations
 * - Success/error notifications
 * - Progress tracking
 * - Mission updates (via callback)
 */
export function useMealSave(): UseMealSaveReturn {
  const [saving, setSaving] = useState(false)

  /**
   * Save meal to Firestore
   * Automatically routes to correct API based on patientId
   */
  const saveMeal = async ({
    mealType,
    photoUrl,
    additionalPhotos,
    aiAnalysis,
    patientId,
    patientName,
    notes,
    onSuccess
  }: MealSaveParams): Promise<void> => {
    setSaving(true)

    try {
      logger.debug('💾 Saving meal log to Firestore...')

      // PATIENT MODE: Use medical operations
      if (patientId) {
        logger.debug('📸 Saving patient meal data with photoUrl:', {
          photoUrl,
          hasPhotoUrl: !!photoUrl,
          photoUrlType: typeof photoUrl
        })

        await medicalOperations.mealLogs.logMeal(patientId, {
          mealType,
          foodItems: aiAnalysis?.foodItems?.map(item => item.name) || [],
          description: aiAnalysis?.foodItems?.map(item => `${item.name} (${item.portion})`).join(', ') || notes || '',
          photoUrl: photoUrl || undefined,
          calories: aiAnalysis?.totalCalories,
          protein: aiAnalysis?.totalMacros?.protein,
          carbs: aiAnalysis?.totalMacros?.carbs,
          fat: aiAnalysis?.totalMacros?.fat,
          fiber: aiAnalysis?.totalMacros?.fiber,
          loggedAt: new Date().toISOString(),
          consumedAt: new Date().toISOString(),
          aiAnalyzed: !!aiAnalysis,
          aiConfidence: aiAnalysis ? 0.9 : undefined,
          tags: []
        })

        logger.debug('✅ Meal logged for patient:', { patientId, patientName, photoUrl })
        toast.success(patientName ? `Meal logged for ${patientName}!` : 'Meal logged for patient!')

      // USER MODE: Use meal log operations
      } else {
        logger.debug('📸 Saving meal data with photoUrl:', {
          photoUrl,
          hasPhotoUrl: !!photoUrl,
          photoUrlType: typeof photoUrl
        })

        const response = await mealLogOperations.createMealLog({
          mealType,
          photoUrl: photoUrl || undefined,
          additionalPhotos,
          aiAnalysis: aiAnalysis || undefined,
          notes,
          loggedAt: new Date().toISOString()
        })

        logger.debug('✅ Meal logged successfully:', {
          mealId: response.data?.id,
          hasPhotoUrl: !!response.data?.photoUrl,
          photoUrl: response.data?.photoUrl,
          fullResponse: response.data
        })

        toast.success('Meal logged successfully!')
      }

      // Trigger success callback (for mission updates, form reset, etc.)
      if (onSuccess) {
        onSuccess()
      }

    } catch (error) {
      logger.error('💥 Save error:', error as Error)
      logger.error('Error details:', new Error(error instanceof Error ? error.message : String(error)))
      toast.error(`Failed to save meal: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
      throw error // Re-throw to allow caller to handle
    } finally {
      setSaving(false)
    }
  }

  return {
    saving,
    saveMeal
  }
}
