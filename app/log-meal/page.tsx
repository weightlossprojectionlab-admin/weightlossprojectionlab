'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { mealLogOperations, useMealLogsRealtime, mealTemplateOperations, cookingSessionOperations, userProfileOperations } from '@/lib/firebase-operations'
import { uploadMealPhoto } from '@/lib/storage-upload'
import { useConfirm } from '@/hooks/useConfirm'
import { auth } from '@/lib/firebase'
import { MEAL_SUGGESTIONS } from '@/lib/meal-suggestions'
import { formatFileSize } from '@/lib/image-compression'
import { shareMeal, shareToPlatform, getPlatformInfo } from '@/lib/share-utils'
import { SharePreviewModal } from '@/components/social/SharePreviewModal'
import { MealCardSkeleton, TemplateCardSkeleton, SummaryCardSkeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/Spinner'
import { queueMeal } from '@/lib/offline-queue'
import { registerBackgroundSync } from '@/lib/sync-manager'
import { useMissions } from '@/hooks/useMissions'
import { simplifyProduct } from '@/lib/openfoodfacts-api'
import { lookupBarcodeWithCache } from '@/lib/cached-product-lookup'
import type { AIAnalysis, MealTemplate, UserProfile, UserPreferences, MealSafetyCheck } from '@/types'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { logger } from '@/lib/logger'
import { medicalOperations } from '@/lib/medical-operations'

// Dynamic imports for heavy dependencies (reduces initial bundle size)
// BarcodeScanner uses html5-qrcode library (~50kB)
const BarcodeScanner = dynamic(
  () => import('@/components/BarcodeScanner').then(mod => ({ default: mod.BarcodeScanner })),
  { ssr: false }
)

// Helper function to detect meal type based on current time (fallback when no schedule)
const detectMealTypeFromTime = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 15) return 'lunch'
  if (hour >= 15 && hour < 21) return 'dinner'
  return 'snack'
}

// Helper function to detect meal type using personalized schedule
const detectMealTypeWithSchedule = (mealSchedule?: {
  breakfastTime: string
  lunchTime: string
  dinnerTime: string
  hasSnacks: boolean
}): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
  if (!mealSchedule) {
    return detectMealTypeFromTime()
  }

  const now = new Date()
  const currentTime = now.getHours() + (now.getMinutes() / 60)

  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours + (minutes / 60)
  }

  const breakfastTime = parseTime(mealSchedule.breakfastTime)
  const lunchTime = parseTime(mealSchedule.lunchTime)
  const dinnerTime = parseTime(mealSchedule.dinnerTime)

  // ±2 hour windows
  const WINDOW = 2

  // In breakfast window
  if (currentTime >= (breakfastTime - WINDOW) && currentTime <= (breakfastTime + WINDOW)) {
    return 'breakfast'
  }
  // In lunch window
  if (currentTime >= (lunchTime - WINDOW) && currentTime <= (lunchTime + WINDOW)) {
    return 'lunch'
  }
  // In dinner window or after
  if (currentTime >= (dinnerTime - WINDOW)) {
    return 'dinner'
  }
  // Before breakfast
  if (currentTime < (breakfastTime - WINDOW)) {
    return 'breakfast'
  }
  // Between breakfast and lunch
  if (currentTime < (lunchTime - WINDOW)) {
    return 'lunch'
  }
  // Between lunch and dinner
  return 'dinner'
}

function LogMealContent() {
  const searchParams = useSearchParams()
  const patientIdParam = searchParams.get('patientId')

  const [userProfile, setUserProfile] = useState<{ profile?: UserProfile; preferences?: UserPreferences } | null>(null)
  const [patientProfile, setPatientProfile] = useState<any>(null)
  const [loadingPatient, setLoadingPatient] = useState(!!patientIdParam)
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(detectMealTypeFromTime())
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const capturedImageRef = useRef<string | null>(null) // Ref to preserve image across renders
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [fromRecipe, setFromRecipe] = useState(false)
  const [recipeSessionId, setRecipeSessionId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null)
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null)
  const [aiSuggestedMealType, setAiSuggestedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | null>(null)
  const [showMealTypeSuggestion, setShowMealTypeSuggestion] = useState(false)
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    description: string
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    notes: string
  }>({ description: '', mealType: 'breakfast', notes: '' })
  const [filterMealType, setFilterMealType] = useState<'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>([])
  const [duplicateMeal, setDuplicateMeal] = useState<{ id: string; description: string; mealType: string } | null>(null)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedMealIds, setSelectedMealIds] = useState<Set<string>>(new Set())
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [editingFoodItemIndex, setEditingFoodItemIndex] = useState<number | null>(null)
  const [portionMultiplier, setPortionMultiplier] = useState(1.0)
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null)
  const [sharingMealId, setSharingMealId] = useState<string | null>(null)
  const [shareModalData, setShareModalData] = useState<{ meal: any; imageBlob: Blob; caption: string } | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null)
  const [usingTemplateId, setUsingTemplateId] = useState<string | null>(null)
  const [updatingMealId, setUpdatingMealId] = useState<string | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [loadingBarcode, setLoadingBarcode] = useState(false)
  const [mealSafetyCheck, setMealSafetyCheck] = useState<MealSafetyCheck | null>(null)
  const [checkingSafety, setCheckingSafety] = useState(false)
  const [showSafetyWarning, setShowSafetyWarning] = useState(false)
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([])
  const [uploadingAdditional, setUploadingAdditional] = useState(false)
  const [manualEntryForm, setManualEntryForm] = useState({
    foodItems: [''],
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    notes: ''
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const fileReaderRef = useRef<FileReader | null>(null)
  const capturedImageRef = useRef<string | null>(null) // Ref to preserve image data across renders

  const { confirm, ConfirmDialog } = useConfirm()

  // Use real-time listener for meal logs with filters
  const { mealLogs: mealHistory, loading: loadingHistory, error: historyError} = useMealLogsRealtime({
    patientId: patientIdParam,
    limitCount: 30,
    mealType: filterMealType !== 'all' ? filterMealType : undefined
  })

  // Check if a meal of this type already exists today
  const checkForDuplicateMeal = (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    // Snacks are unlimited
    if (mealType === 'snack') return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const existingMeal = mealHistory?.find(meal => {
      const mealDate = new Date(meal.loggedAt)
      return meal.mealType === mealType &&
             mealDate >= today &&
             mealDate < tomorrow
    })

    return existingMeal || null
  }

  // Weekly missions for progress tracking
  const { checkProgress } = useMissions(auth.currentUser?.uid)

  // Check for duplicate meal on page load
  useEffect(() => {
    if (!loadingHistory && mealHistory) {
      const existingMeal = checkForDuplicateMeal(selectedMealType)
      if (existingMeal) {
        setDuplicateMeal({
          id: existingMeal.id,
          description: existingMeal.description || 'Untitled meal',
          mealType: selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)
        })
        setShowDuplicateModal(true)
      }
    }
  }, [loadingHistory, mealHistory, selectedMealType])

  // Client-side filtering for search query (includes description, food items, and notes)
  const filteredMeals = searchQuery
    ? mealHistory.filter(meal => {
        const query = searchQuery.toLowerCase()
        return (
          // Search in description
          meal.description?.toLowerCase().includes(query) ||
          // Search in food items (from foodItems array)
          meal.foodItems?.some((item: string) => item.toLowerCase().includes(query)) ||
          // Search in notes
          meal.notes?.toLowerCase().includes(query)
        )
      })
    : mealHistory

  // Calculate today's totals
  const todaysMeals = mealHistory.filter(meal => {
    const mealDate = new Date(meal.loggedAt)
    const today = new Date()
    return mealDate.toDateString() === today.toDateString()
  })

  const todaysSummary = todaysMeals.reduce((acc, meal) => ({
    calories: acc.calories + (meal.calories || 0),
    protein: acc.protein + (meal.protein || 0),
    carbs: acc.carbs + (meal.carbs || 0),
    fat: acc.fat + (meal.fat || 0),
    mealCount: acc.mealCount + 1
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 })

  const mealTypes = [
    { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
    { id: 'lunch', label: 'Lunch', emoji: '☀️' },
    { id: 'dinner', label: 'Dinner', emoji: '🌙' },
    { id: 'snack', label: 'Snack', emoji: '🍎' },
  ] as const

  // Load patient profile if patientId is provided
  useEffect(() => {
    const loadPatient = async () => {
      if (!patientIdParam) {
        setLoadingPatient(false)
        return
      }

      try {
        const patient = await medicalOperations.patients.getPatient(patientIdParam)
        setPatientProfile(patient)
        logger.info('Loaded patient for meal logging:', { patientId: patientIdParam, patientName: patient.name })
      } catch (error) {
        logger.error('Failed to load patient:', error as Error)
        toast.error('Failed to load family member information')
      } finally {
        setLoadingPatient(false)
      }
    }

    loadPatient()
  }, [patientIdParam])

  // Load user profile for personalized meal schedule
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profile = await userProfileOperations.getUserProfile()
        if (profile) {
          setUserProfile(profile)
          // Update meal type with personalized schedule
          if (profile.preferences?.mealSchedule) {
            const detectedType = detectMealTypeWithSchedule(profile.preferences.mealSchedule)
            setSelectedMealType(detectedType)
          }
        }
      } catch (error) {
        logger.error('Failed to load user profile:', error as Error)
        // Silently fail - user can still log meals with time-based detection
      }
    }

    loadUserProfile()
  }, [])

  // Show error toast if real-time listener fails
  useEffect(() => {
    if (historyError) {
      logger.error('Real-time listener error:', historyError)
      toast.error('Failed to load meal history. Please refresh the page.')
    }
  }, [historyError])

  // Detect if coming from completed cooking session
  useEffect(() => {
    const isFromRecipe = searchParams.get('fromRecipe') === 'true'
    const sessionId = searchParams.get('sessionId')
    const recipeId = searchParams.get('recipeId')
    const mealType = searchParams.get('mealType') as 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
    const servings = searchParams.get('servings')

    if (isFromRecipe && sessionId && recipeId) {
      setFromRecipe(true)
      setRecipeSessionId(sessionId)

      if (mealType) {
        setSelectedMealType(mealType)
      }

      // Load the cooking session to get exact nutrition data
      cookingSessionOperations.getCookingSession(sessionId).then((session: any) => {
        const recipe = MEAL_SUGGESTIONS.find(r => r.id === recipeId)

        if (session && recipe) {
          // Pre-fill AI analysis with exact recipe data
          const analysis: AIAnalysis = {
            foodItems: session.scaledIngredients.map((ing: string) => ({
              name: ing,
              portion: '',
              calories: session.scaledCalories,
              protein: 0,
              carbs: 0,
              fat: 0,
              fiber: 0,
              usdaVerified: true,
              source: 'usda' as const
            })),
            totalCalories: session.scaledCalories,
            totalMacros: session.scaledMacros,
            confidence: 100,
            suggestions: [`Cooked from recipe: ${recipe.name}`],
            isMockData: false,
            usdaValidation: ['Recipe-based nutrition data']
          }

          setAiAnalysis(analysis)
          toast.success(`Ready to log your ${recipe.name}!`, { duration: 3000 })
        }
      }).catch(error => {
        logger.error('Error loading cooking session:', error as Error)
        toast.error('Failed to load recipe data')
      })
    }
  }, [searchParams])

  // Load meal templates
  const loadMealTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const response = await mealTemplateOperations.getMealTemplates()
      if (response.success) {
        setMealTemplates(response.data || [])
      }
    } catch (error) {
      logger.error('Failed to load templates:', error as Error)
      toast.error('Failed to load templates')
    } finally {
      setLoadingTemplates(false)
    }
  }

  // Load templates when showing template panel
  useEffect(() => {
    if (showTemplates && mealTemplates.length === 0) {
      loadMealTemplates()
    }
  }, [showTemplates])

  // Cleanup on component unmount only
  useEffect(() => {
    return () => {
      // Abort any pending fetch requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Abort FileReader if still reading
      if (fileReaderRef.current) {
        fileReaderRef.current.abort()
      }

      // Revoke current object URL to free memory
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl)
      }
    }
  }, [imageObjectUrl]) // Depend on imageObjectUrl to revoke the correct URL

  // Keyboard support for lightbox (ESC to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedPhotoUrl) {
        setSelectedPhotoUrl(null)
      }
    }

    if (selectedPhotoUrl) {
      window.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when lightbox is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [selectedPhotoUrl])

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      logger.debug('No file selected')
      return
    }

    logger.debug('📸 File selected:', {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      lastModified: file.lastModified
    })

    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large. Please select an image under 10MB.')
      return
    }

    // Clean up previous object URL to prevent memory leak
    if (imageObjectUrl) {
      URL.revokeObjectURL(imageObjectUrl)
    }

    try {
      logger.debug('🔄 Converting image to base64 for AI analysis...')

      // Create object URL for preview
      const objectUrl = URL.createObjectURL(file)
      setImageObjectUrl(objectUrl)

      // Convert to base64 for AI analysis (NO compression - AI needs quality)
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64Data = event.target?.result as string
        logger.debug('✅ Image converted to base64, length:', { length: base64Data.length })
        setCapturedImage(base64Data)
        capturedImageRef.current = base64Data // Also store in ref for persistence
        logger.debug('📸 Image stored in both state and ref')

        // Start AI analysis with high-quality image
        analyzeImage(base64Data)
      }
      reader.onerror = (error) => {
        logger.error('❌ FileReader error:', new Error('FileReader error'))
        toast.error('Failed to read image file')
      }
      reader.readAsDataURL(file)

    } catch (error) {
      logger.error('❌ Image capture error:', error as Error)
      toast.error('Failed to process image. Please try again.')
    }
  }

  const handleAdditionalPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) {
      return
    }

    // Check if adding these photos would exceed limit
    const remainingSlots = 4 - additionalPhotos.length
    if (files.length > remainingSlots) {
      toast.error(`You can only add ${remainingSlots} more photo${remainingSlots !== 1 ? 's' : ''} (max 4 total)`)
      return
    }

    // Validate and compress each file
    setUploadingAdditional(true)
    const newPhotos: string[] = []

    try {
      for (const file of files) {
        // Validate file is an image
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`)
          continue
        }

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`)
          continue
        }

        // Compress image using existing compression library
        const { compressImage } = await import('@/lib/image-compression')
        const compressed = await compressImage(file)

        newPhotos.push(compressed.base64DataUrl)
      }

      // Add to state
      setAdditionalPhotos(prev => [...prev, ...newPhotos])
      toast.success(`Added ${newPhotos.length} photo${newPhotos.length !== 1 ? 's' : ''}`)
    } catch (error) {
      logger.error('Failed to process additional photos:', error as Error)
      toast.error('Failed to process some photos')
    } finally {
      setUploadingAdditional(false)
      // Reset the file input
      e.target.value = ''
    }
  }

  const removeAdditionalPhoto = (index: number) => {
    setAdditionalPhotos(prev => prev.filter((_, i) => i !== index))
    toast.success('Photo removed')
  }

  const analyzeImage = async (imageData: string) => {
    setAnalyzing(true)

    // Create AbortController for this request
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      logger.debug('🔍 Starting AI analysis...')
      logger.debug('Image data length:', { length: imageData.length })
      logger.debug('Image data prefix:', { prefix: imageData.substring(0, 30) })
      logger.debug('Meal type:', { mealType: selectedMealType })

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
          mealType: selectedMealType
        }),
        signal: abortController.signal
      })

      logger.debug('Response status:', { status: response.status })
      logger.debug('Response ok:', { ok: response.ok })

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
        setAiAnalysis(result.data)
        logger.debug('✅ State updated with aiAnalysis:', result.data)

        // Automatically set meal type from AI suggestion
        if (result.data.suggestedMealType) {
          logger.debug('🤖 AI suggested meal type:', result.data.suggestedMealType)
          setSelectedMealType(result.data.suggestedMealType)
          setAiSuggestedMealType(result.data.suggestedMealType)
        } else {
          // Fallback to personalized schedule or time-based detection if AI doesn't suggest
          const timeBased = userProfile?.preferences?.mealSchedule
            ? detectMealTypeWithSchedule(userProfile.preferences.mealSchedule)
            : detectMealTypeFromTime()
          logger.debug('⏰ Using schedule-based meal type:', { mealType: timeBased })
          setSelectedMealType(timeBased)
        }
      } else {
        logger.error('❌ Analysis failed:', result.error)
        throw new Error(result.error || 'Analysis failed')
      }

    } catch (error) {
      // Don't show error if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        logger.debug('Analysis request aborted')
        return
      }

      logger.error('💥 Analysis error:', error as Error)
      logger.error('Error details:', new Error(error instanceof Error ? error.message : String(error)))
      toast.error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or enter manually.`)
    } finally {
      setAnalyzing(false)
      abortControllerRef.current = null
    }
  }

  const handleBarcodeScan = async (barcode: string) => {
    logger.debug('📊 Barcode scanned:', { barcode })
    setLoadingBarcode(true)

    try {
      // Lookup product with cache-first strategy
      const response = await lookupBarcodeWithCache(barcode)
      const product = simplifyProduct(response)

      if (!product.found) {
        toast.error(`Product not found for barcode: ${barcode}`)
        return
      }

      // Enable manual entry mode
      setShowManualEntry(true)

      // Pre-fill the manual entry form with product data
      setManualEntryForm({
        foodItems: [product.name + (product.brand ? ` (${product.brand})` : '')],
        calories: product.calories.toString(),
        protein: product.protein.toString(),
        carbs: product.carbs.toString(),
        fat: product.fat.toString(),
        fiber: '',
        notes: `Scanned barcode: ${barcode}${product.servingSize ? ` | Serving: ${product.servingSize}` : ''}${product.quantity ? ` | Package: ${product.quantity}` : ''}`
      })

      toast.success(`Found: ${product.name}`)
    } catch (error) {
      logger.error('Barcode lookup error:', error as Error)
      toast.error('Failed to lookup product. Please try again or enter manually.')
    } finally {
      setLoadingBarcode(false)
    }
  }

  const adjustFoodItemPortion = async (itemIndex: number, multiplier: number) => {
    if (!aiAnalysis) return

    const updatedFoodItems = [...aiAnalysis.foodItems]
    const item = updatedFoodItems[itemIndex]
    const originalItem = { ...item }

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

    setAiAnalysis({
      ...aiAnalysis,
      foodItems: updatedFoodItems,
      totalCalories,
      totalMacros
    })

    // Track the correction for AI training
    trackAICorrection('portion', {
      foodItem: originalItem.name,
      originalPortion: originalItem.portion,
      originalCalories: originalItem.calories,
      adjustedPortion: adjustedItem.portion,
      adjustedCalories: adjustedItem.calories,
      multiplier
    })

    setEditingFoodItemIndex(null)
    setPortionMultiplier(1.0)
    toast.success('Portion adjusted!')
  }

  const trackAICorrection = async (correctionType: string, correctionData: any) => {
    try {
      const user = auth.currentUser
      if (!user) return

      // Store correction in Firestore for future AI training
      const correction = {
        userId: user.uid,
        correctionType,
        timestamp: new Date().toISOString(),
        photoUrl: capturedImage,
        originalAnalysis: aiAnalysis,
        correction: correctionData
      }

      logger.debug('📊 Tracking AI correction:', correction)

      // TODO: Save to Firestore aiCorrections collection
      // For now, just log it
      // await addDoc(collection(db, 'aiCorrections'), correction)
    } catch (error) {
      logger.error('Failed to track correction:', error as Error)
      // Don't show error to user - this is background tracking
    }
  }

  const saveManualEntry = async () => {
    // Validate form
    const calories = parseFloat(manualEntryForm.calories)
    const protein = parseFloat(manualEntryForm.protein)
    const carbs = parseFloat(manualEntryForm.carbs)
    const fat = parseFloat(manualEntryForm.fat)
    const fiber = parseFloat(manualEntryForm.fiber) || 0

    if (!calories || calories <= 0) {
      toast.error('Please enter valid calories')
      return
    }

    if (!protein || !carbs || !fat) {
      toast.error('Please enter all macronutrients')
      return
    }

    const foodItems = manualEntryForm.foodItems.filter(item => item.trim() !== '')
    if (foodItems.length === 0) {
      toast.error('Please enter at least one food item')
      return
    }

    setSaving(true)

    try {
      logger.debug('💾 Saving manual entry...')

      // Create AIAnalysis object from manual form data
      const manualAnalysis: AIAnalysis = {
        foodItems: foodItems.map(item => ({
          name: item,
          portion: 'As entered',
          calories: Math.round(calories / foodItems.length),
          protein: Math.round(protein / foodItems.length),
          carbs: Math.round(carbs / foodItems.length),
          fat: Math.round(fat / foodItems.length),
          fiber: Math.round(fiber / foodItems.length)
        })),
        totalCalories: calories,
        totalMacros: { protein, carbs, fat, fiber },
        confidence: 100, // Manual entries are 100% confident
        isMockData: false
      }

      // Check if offline - queue instead of saving
      if (!navigator.onLine) {
        logger.debug('📡 Offline detected, queuing manual entry...')

        const user = auth.currentUser
        if (!user) {
          toast.error('Please sign in to log meals')
          return
        }

        // For self-logging: patientId, ownerUserId, and loggedBy are all the same user
        const userId = user.uid
        const patientId = patientIdParam || userId // Use patientId param or self
        const ownerUserId = userId // User owns their own data
        const loggedBy = userId // User is logging for themselves

        await queueMeal(
          {
            mealType: selectedMealType,
            aiAnalysis: manualAnalysis,
            loggedAt: new Date().toISOString(),
            notes: manualEntryForm.notes || undefined
          },
          patientId,
          ownerUserId,
          loggedBy
        )

        await registerBackgroundSync()
        toast.success('Meal queued! Will sync when back online.')
        logger.debug('✅ Manual entry queued for offline sync')

        // Check mission progress
        if (checkProgress) {
          await checkProgress()
        }

        // Reset form
        setShowManualEntry(false)
        setManualEntryForm({
          foodItems: [''],
          calories: '',
          protein: '',
          carbs: '',
          fat: '',
          fiber: '',
          notes: ''
        })

        return
      }

      // Online - proceed with normal save
      const response = await mealLogOperations.createMealLog({
        mealType: selectedMealType,
        photoUrl: undefined,
        aiAnalysis: manualAnalysis,
        loggedAt: new Date().toISOString(),
        notes: manualEntryForm.notes || undefined
      })

      logger.debug('✅ Manual entry saved:', response.data)
      toast.success('Meal logged successfully!')

      // Check mission progress
      if (checkProgress) {
        await checkProgress()
      }

      // Reset form
      setShowManualEntry(false)
      setManualEntryForm({
        foodItems: [''],
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        fiber: '',
        notes: ''
      })

    } catch (error) {
      logger.error('💥 Save error:', error as Error)
      toast.error(`Failed to save meal: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const addFoodItemField = () => {
    setManualEntryForm({
      ...manualEntryForm,
      foodItems: [...manualEntryForm.foodItems, '']
    })
  }

  const removeFoodItemField = (index: number) => {
    const newFoodItems = manualEntryForm.foodItems.filter((_, i) => i !== index)
    setManualEntryForm({
      ...manualEntryForm,
      foodItems: newFoodItems.length > 0 ? newFoodItems : ['']
    })
  }

  const updateFoodItem = (index: number, value: string) => {
    const newFoodItems = [...manualEntryForm.foodItems]
    newFoodItems[index] = value
    setManualEntryForm({
      ...manualEntryForm,
      foodItems: newFoodItems
    })
  }

  const checkMealSafety = async (mealData: AIAnalysis): Promise<MealSafetyCheck | null> => {
    try {
      setCheckingSafety(true)
      logger.debug('🔍 Checking meal safety...')

      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        logger.warn('No auth token for safety check')
        return null
      }

      const response = await fetch('/api/ai/meal-safety', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meal: {
            foodItems: mealData.foodItems,
            totalCalories: mealData.totalCalories,
            totalMacros: mealData.totalMacros
          }
        })
      })

      if (!response.ok) {
        throw new Error('Safety check failed')
      }

      const result = await response.json()
      logger.debug('✅ Safety check completed', {
        isSafe: result.isSafe,
        severity: result.severity,
        warningsCount: result.warnings?.length || 0
      })

      return {
        isSafe: result.isSafe,
        warnings: result.warnings || [],
        severity: result.severity || 'safe',
        nutrientBreakdown: result.nutrientBreakdown,
        confidence: result.confidence || 100
      }
    } catch (error) {
      logger.error('Safety check error:', error as Error)
      // Don't block meal logging if safety check fails
      return null
    } finally {
      setCheckingSafety(false)
    }
  }

  const saveMeal = async (overrideSafety: boolean = false) => {
    setSaving(true)

    try {
      logger.debug('💾 Starting meal save...', {
        hasCapturedImage: !!capturedImage,
        hasCapturedImageRef: !!capturedImageRef.current,
        hasAiAnalysis: !!aiAnalysis,
        selectedMealType
      })

      // Check meal safety if we have AI analysis and haven't overridden
      if (aiAnalysis && !overrideSafety) {
        const safetyCheck = await checkMealSafety(aiAnalysis)

        if (safetyCheck && (!safetyCheck.isSafe || safetyCheck.severity === 'caution' || safetyCheck.severity === 'critical')) {
          setMealSafetyCheck(safetyCheck)
          setShowSafetyWarning(true)
          setSaving(false)
          return // Stop saving and show warning modal
        }
      }

      // Check if offline - queue instead of saving
      if (!navigator.onLine) {
        logger.debug('📡 Offline detected, queuing meal for later sync...')
        setUploadProgress('Queuing for offline sync...')

        const user = auth.currentUser
        if (!user) {
          toast.error('Please sign in to log meals')
          setSaving(false)
          return
        }

        // For self-logging: patientId, ownerUserId, and loggedBy are all the same user
        const userId = user.uid
        const patientId = patientIdParam || userId // Use patientId param or self
        const ownerUserId = userId // User owns their own data
        const loggedBy = userId // User is logging for themselves

        // Queue meal with photo data URL (no upload needed when offline)
        await queueMeal(
          {
            mealType: selectedMealType,
            photoDataUrl: capturedImage || undefined,
            aiAnalysis: aiAnalysis || undefined,
            loggedAt: new Date().toISOString()
          },
          patientId,
          ownerUserId,
          loggedBy
        )

        // Register background sync
        await registerBackgroundSync()

        toast.success('Meal queued! Will sync when back online.')
        logger.debug('✅ Meal queued for offline sync')

        // Check mission progress (offline meal still counts)
        if (checkProgress) {
          await checkProgress()
        }

        // Clean up and reset form
        if (imageObjectUrl) {
          URL.revokeObjectURL(imageObjectUrl)
          setImageObjectUrl(null)
        }
        setCapturedImage(null)
        capturedImageRef.current = null // Clear ref as well
        setAiAnalysis(null)
        setAdditionalPhotos([])

        return
      }

      // Online - proceed with normal save
      let photoUrl: string | undefined = undefined

      // CRITICAL: Use ref as source of truth (state may be stale due to React batching)
      const imageToUpload = capturedImageRef.current || capturedImage

      // DEBUG: Log state vs ref to diagnose state loss
      logger.debug('🔍 Image availability check:', {
        hasStateImage: !!capturedImage,
        hasRefImage: !!capturedImageRef.current,
        usingImage: !!imageToUpload,
        stateLength: capturedImage?.length || 0,
        refLength: capturedImageRef.current?.length || 0
      })

      // Upload photo to Firebase Storage if we have one
      if (imageToUpload) {
        setUploadProgress('Compressing image...')
        logger.debug('🗜️ Compressing image before upload...', {
          source: capturedImageRef.current ? 'ref' : 'state',
          imageLength: imageToUpload.length
        })

        try {
          // Convert base64 to blob for compression
          const base64Response = await fetch(imageToUpload)
          const blob = await base64Response.blob()
          const file = new File([blob], 'meal-photo.jpg', { type: 'image/jpeg' })

          // Dynamically import image compression (browser-image-compression library ~30kB)
          const { compressImage } = await import('@/lib/image-compression')

          // Compress image for storage
          const compressed = await compressImage(file)
          logger.debug('✅ Compressed:', {
            original: formatFileSize(compressed.originalSize),
            compressed: formatFileSize(compressed.compressedSize)
          })

          setUploadProgress('Uploading photo...')

          // Verify auth state before upload
          const currentUser = auth.currentUser
          logger.debug('📤 Uploading compressed photo to Storage...', {
            userAuthenticated: !!currentUser,
            userId: currentUser?.uid,
            userEmail: currentUser?.email,
            emailVerified: currentUser?.emailVerified
          })

          if (!currentUser) {
            throw new Error('User not authenticated - please sign in again')
          }

          // Upload compressed image with 30s timeout (increased for slower connections)
          photoUrl = await Promise.race([
            uploadMealPhoto(compressed.base64DataUrl),
            new Promise<string>((_, reject) =>
              setTimeout(() => reject(new Error('Upload timeout after 30s')), 30000)
            )
          ])
          logger.debug('✅ Photo uploaded:', { photoUrl })
        } catch (uploadError) {
          // Comprehensive error capture for debugging
          const errorInfo = {
            message: (uploadError as any)?.message || 'No message',
            name: (uploadError as any)?.name || 'Unknown',
            code: (uploadError as any)?.code,
            isTimeoutError: (uploadError as Error)?.message?.includes('timeout'),
            errorType: Object.prototype.toString.call(uploadError),
            errorKeys: Object.keys(uploadError || {}),
            rawError: String(uploadError)
          }

          console.error('❌ PHOTO UPLOAD FAILED - FULL ERROR:', errorInfo)
          logger.error('❌ Photo upload failed:', uploadError as Error, errorInfo)

          // Continue saving even if photo upload fails
          const displayMessage = errorInfo.isTimeoutError
            ? 'Upload timed out - please check your internet connection'
            : errorInfo.message || 'Unknown error'
          toast.error(`Photo upload failed: ${displayMessage}`)
        }
      }

      // Upload additional photos if any
      let additionalPhotoUrls: string[] = []
      if (additionalPhotos.length > 0) {
        setUploadProgress(`Uploading additional photos (0/${additionalPhotos.length})...`)
        logger.debug(`📤 Uploading ${additionalPhotos.length} additional photos...`)

        try {
          // Upload all additional photos in parallel
          const uploadPromises = additionalPhotos.map(async (photoData, index) => {
            try {
              const url = await uploadMealPhoto(photoData)
              logger.debug(`✅ Additional photo ${index + 1} uploaded`)
              setUploadProgress(`Uploading additional photos (${index + 1}/${additionalPhotos.length})...`)
              return url
            } catch (error) {
              logger.error(`❌ Failed to upload additional photo ${index + 1}:`, error as Error)
              return null
            }
          })

          const results = await Promise.all(uploadPromises)
          additionalPhotoUrls = results.filter((url): url is string => url !== null)
          logger.debug(`✅ Uploaded ${additionalPhotoUrls.length}/${additionalPhotos.length} additional photos`)
        } catch (error) {
          logger.error('❌ Additional photos upload failed:', error as Error)
          // Continue saving even if additional photos fail
        }
      }

      // Save to Firebase using real API
      setUploadProgress('Saving meal data...')
      logger.debug('💾 Saving meal log to Firestore...')

      // If logging for a patient, use patient meal logs
      if (patientIdParam && patientProfile) {
        // CRITICAL DEBUG: Log photoUrl value right before API call (patient path)
        logger.debug('📸 Saving patient meal data with photoUrl:', {
          photoUrl,
          hasPhotoUrl: !!photoUrl,
          capturedImageExists: !!capturedImage,
          photoUrlType: typeof photoUrl
        })

        await medicalOperations.mealLogs.logMeal(patientIdParam, {
          mealType: selectedMealType,
          foodItems: aiAnalysis?.foodItems?.map(item => item.name) || [],
          description: aiAnalysis?.foodItems?.map(item => `${item.name} (${item.portion})`).join(', '),
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
        logger.debug('✅ Meal logged for patient:', { patientId: patientIdParam, patientName: patientProfile.name, photoUrl })
        toast.success(`Meal logged for ${patientProfile.name}!`)
      } else {
        // Otherwise use regular user meal logs (note: additionalPhotos not supported in MealLog type)
        // CRITICAL DEBUG: Log photoUrl value right before API call
        logger.debug('📸 Saving meal data with photoUrl:', {
          photoUrl,
          hasPhotoUrl: !!photoUrl,
          capturedImageExists: !!capturedImage,
          photoUrlType: typeof photoUrl
        })

        const response = await mealLogOperations.createMealLog({
          mealType: selectedMealType,
          photoUrl: photoUrl || undefined,
          // additionalPhotos field removed - MealLog type only supports single photoUrl
          aiAnalysis: aiAnalysis || undefined,
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

      // Check mission progress after saving meal
      if (checkProgress) {
        await checkProgress()
      }

      // No need to refresh - real-time listener will update automatically

      // Clean up and reset form
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl)
        setImageObjectUrl(null)
      }
      setCapturedImage(null)
      capturedImageRef.current = null // Clear ref as well
      setAiAnalysis(null)
      setAdditionalPhotos([])

    } catch (error) {
      logger.error('💥 Save error:', error as Error)
      logger.error('Error details:', new Error(error instanceof Error ? error.message : String(error)))
      toast.error(`Failed to save meal: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
    } finally {
      setSaving(false)
      setUploadProgress('')
    }
  }

  const startEditingMeal = (meal: any) => {
    setEditingMealId(meal.id)
    setEditForm({
      description: meal.description || '',
      mealType: meal.mealType,
      notes: meal.notes || ''
    })
  }

  const cancelEditing = () => {
    setEditingMealId(null)
    setEditForm({ description: '', mealType: 'breakfast', notes: '' })
  }

  const saveEditedMeal = async (mealId: string) => {
    setUpdatingMealId(mealId)
    try {
      await mealLogOperations.updateMealLog(mealId, {
        description: editForm.description || undefined,
        mealType: editForm.mealType,
        notes: editForm.notes || undefined
      })
      toast.success('Meal updated successfully!')
      setEditingMealId(null)
      setEditForm({ description: '', mealType: 'breakfast', notes: '' })
      // No need to refresh - real-time listener will update automatically
    } catch (error) {
      logger.error('Failed to update meal:', error as Error)
      toast.error(`Failed to update meal: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUpdatingMealId(null)
    }
  }

  const deleteMeal = async (mealId: string, mealType: string) => {
    const confirmed = await confirm({
      title: 'Delete Meal',
      message: `Are you sure you want to delete this ${mealType} entry? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    })

    if (!confirmed) return

    setDeletingMealId(mealId)

    try {
      if (patientIdParam) {
        await medicalOperations.mealLogs.deleteMealLog(patientIdParam, mealId)
      } else {
        await mealLogOperations.deleteMealLog(mealId)
      }
      toast.success('Meal deleted successfully!')

      // No need to refresh - real-time listener will update automatically
    } catch (error) {
      logger.error('Failed to delete meal:', error as Error)
      toast.error(`Failed to delete meal: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDeletingMealId(null)
    }
  }

  const shareMealHandler = async (meal: any) => {
    setSharingMealId(meal.id)

    try {
      const result = await shareMeal({
        description: meal.description,
        mealType: meal.mealType,
        photoUrl: meal.photoUrl,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        loggedAt: meal.loggedAt,
        foodItems: meal.foodItems
      })

      // Mobile: Image was downloaded, show success
      if (result.isMobile) {
        toast.success('Image downloaded! Caption copied to clipboard.')
      } else {
        // Desktop: Show share modal
        setShareModalData({
          meal,
          imageBlob: result.imageBlob,
          caption: result.caption
        })
      }
    } catch (error) {
      logger.error('Failed to share meal:', error as Error)
      toast.error('Failed to generate share card')
    } finally {
      setSharingMealId(null)
    }
  }

  const handlePlatformShare = async (platform: 'facebook' | 'twitter' | 'pinterest' | 'instagram' | 'tiktok') => {
    if (!shareModalData) return

    try {
      await shareToPlatform(platform, {
        description: shareModalData.meal.description,
        mealType: shareModalData.meal.mealType,
        photoUrl: shareModalData.meal.photoUrl,
        calories: shareModalData.meal.calories,
        protein: shareModalData.meal.protein,
        carbs: shareModalData.meal.carbs,
        fat: shareModalData.meal.fat,
        loggedAt: shareModalData.meal.loggedAt,
        foodItems: shareModalData.meal.foodItems
      }, shareModalData.imageBlob)

      const platformInfo = getPlatformInfo(platform)
      if (platformInfo.supportsWebShare) {
        toast.success(`Opening ${platformInfo.name}...`)
      } else {
        toast.success(`Image downloaded for ${platformInfo.name}! Caption copied to clipboard.`)
      }

      // Close modal after a short delay
      setTimeout(() => setShareModalData(null), 500)
    } catch (error) {
      logger.error('Failed to share to platform:', error as Error)
      toast.error('Failed to share')
    }
  }

  const useTemplate = async (template: MealTemplate) => {
    setUsingTemplateId(template.id)
    try {
      // Record template usage
      await mealTemplateOperations.recordTemplateUsage(template.id)

      // Create meal log from template
      await mealLogOperations.createMealLog({
        mealType: template.mealType,
        aiAnalysis: {
          foodItems: template.foodItems as any,
          totalCalories: template.calories,
          totalMacros: template.macros,
          confidence: 100,
          isMockData: true
        },
        notes: template.notes,
        loggedAt: new Date().toISOString()
      })

      toast.success(`Logged ${template.name}!`)
      setShowTemplates(false)
      // Refresh templates to update usage count
      loadMealTemplates()
    } catch (error) {
      logger.error('Failed to use template:', error as Error)
      toast.error(`Failed to log meal: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUsingTemplateId(null)
    }
  }

  const saveAsTemplate = async () => {
    if (!aiAnalysis || !templateName.trim()) {
      toast.error('Please enter a template name')
      return
    }

    setSavingTemplate(true)
    try {
      await mealTemplateOperations.createMealTemplate({
        name: templateName.trim(),
        mealType: selectedMealType,
        foodItems: aiAnalysis.foodItems as any,
        calories: aiAnalysis.totalCalories,
        macros: aiAnalysis.totalMacros,
        notes: undefined
      })

      toast.success('Template saved successfully!')
      setShowSaveTemplate(false)
      setTemplateName('')
      loadMealTemplates()
    } catch (error) {
      logger.error('Failed to save template:', error as Error)
      toast.error(`Failed to save template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSavingTemplate(false)
    }
  }

  const deleteTemplate = async (templateId: string, templateName: string) => {
    const confirmed = await confirm({
      title: 'Delete Template',
      message: `Are you sure you want to delete "${templateName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    })

    if (!confirmed) return

    setDeletingTemplateId(templateId)
    try {
      await mealTemplateOperations.deleteMealTemplate(templateId)
      toast.success('Template deleted successfully!')
      loadMealTemplates()
    } catch (error) {
      logger.error('Failed to delete template:', error as Error)
      toast.error(`Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDeletingTemplateId(null)
    }
  }

  const toggleMealSelection = (mealId: string) => {
    const newSelection = new Set(selectedMealIds)
    if (newSelection.has(mealId)) {
      newSelection.delete(mealId)
    } else {
      newSelection.add(mealId)
    }
    setSelectedMealIds(newSelection)
  }

  const selectAllMeals = () => {
    const allIds = new Set(filteredMeals.map(meal => meal.id))
    setSelectedMealIds(allIds)
  }

  const deselectAllMeals = () => {
    setSelectedMealIds(new Set())
  }

  const deleteSelectedMeals = async () => {
    if (selectedMealIds.size === 0) return

    const confirmed = await confirm({
      title: 'Delete Selected Meals',
      message: `Are you sure you want to delete ${selectedMealIds.size} meal${selectedMealIds.size !== 1 ? 's' : ''}? This action cannot be undone.`,
      confirmText: 'Delete All',
      cancelText: 'Cancel',
      variant: 'danger'
    })

    if (!confirmed) return

    const toastId = toast.loading(`Deleting ${selectedMealIds.size} meals...`)

    try {
      // Delete all selected meals in parallel
      const deletePromises = Array.from(selectedMealIds).map(mealId =>
        patientIdParam
          ? medicalOperations.mealLogs.deleteMealLog(patientIdParam, mealId)
          : mealLogOperations.deleteMealLog(mealId)
      )

      await Promise.all(deletePromises)

      toast.success(`${selectedMealIds.size} meal${selectedMealIds.size !== 1 ? 's' : ''} deleted successfully!`, { id: toastId })
      setSelectedMealIds(new Set())
      setMultiSelectMode(false)
    } catch (error) {
      logger.error('Failed to delete meals:', error as Error)
      toast.error(`Failed to delete meals: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId })
    }
  }

  const handleExportCSV = async () => {
    if (filteredMeals.length === 0) {
      toast.error('No meals to export')
      return
    }

    // Dynamically import export utilities (only loaded when user clicks export)
    const { exportToCSV } = await import('@/lib/export-utils')

    const dateRange = searchQuery || filterMealType !== 'all' ? 'filtered-' : ''
    const filename = `meal-logs-${dateRange}${new Date().toISOString().split('T')[0]}.csv`

    exportToCSV(filteredMeals as any, filename)
    toast.success(`Exported ${filteredMeals.length} meals to CSV`)
    setShowExportMenu(false)
  }

  const handleExportPDF = async () => {
    if (filteredMeals.length === 0) {
      toast.error('No meals to export')
      return
    }

    // Dynamically import export utilities (only loaded when user clicks export)
    const { exportToPDF } = await import('@/lib/export-utils')

    const user = auth.currentUser
    const userName = user?.displayName || user?.email || 'User'

    const dateRange = searchQuery || filterMealType !== 'all' ? 'filtered-' : ''
    const filename = `meal-logs-${dateRange}${new Date().toISOString().split('T')[0]}.pdf`

    await exportToPDF(filteredMeals as any, userName, filename)
    toast.success('Opening PDF preview...')
    setShowExportMenu(false)
  }

  return (
    <main className="min-h-screen bg-card">
      <PageHeader
        title={patientProfile ? `Log Meal for ${patientProfile.name}` : "Log Meal"}
        subtitle={patientProfile ? `Logging meal for family member` : undefined}
        backHref={patientIdParam ? `/patients/${patientIdParam}` : "/dashboard"}
      />

      <div className="container-narrow py-6 space-y-6">
        {/* Camera/Photo Section */}
        <div className="card">
          <h2 className="mb-4">Take Photo</h2>

            {!capturedImage && !showManualEntry && (
              <div className="space-y-4">
                <label className="btn btn-primary w-full cursor-pointer">
                  📸 Take Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraCapture}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => setShowBarcodeScanner(true)}
                  className="btn btn-secondary w-full"
                  disabled={loadingBarcode}
                  aria-label="Scan barcode"
                >
                  {loadingBarcode ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner size="sm" />
                      Looking up product...
                    </span>
                  ) : (
                    '🔍 Scan Barcode'
                  )}
                </button>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="btn btn-secondary w-full"
                  aria-label="Use saved meal template"
                >
                  ⭐ Use Saved Template
                </button>
                <button
                  onClick={() => setShowManualEntry(true)}
                  className="btn btn-secondary w-full"
                  aria-label="Enter meal details manually"
                >
                  ✏️ Enter Manually
                </button>
              </div>
            )}

            {capturedImage && (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={imageObjectUrl || capturedImage}
                    alt="Captured meal"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  {analyzing && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <div className="text-white text-center">
                        <Spinner size="lg" className="text-white mx-auto mb-2" />
                        <p>Analyzing with AI...</p>
                      </div>
                    </div>
                  )}
                </div>

                {!analyzing && !aiAnalysis && (
                  <label className="btn btn-secondary w-full cursor-pointer">
                    🔄 Retake Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleCameraCapture}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}

            {/* Manual Entry Form */}
            {showManualEntry && (
              <div className="space-y-4 mt-4">
                <div className="bg-indigo-100 dark:bg-indigo-900/20 border border-accent rounded-lg p-4">
                  <p className="text-sm text-accent-dark">
                    💡 Enter meal details manually (useful when you can't take a photo or prefer manual tracking)
                  </p>
                </div>

                {/* Food Items */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Food Items
                  </label>
                  {manualEntryForm.foodItems.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => updateFoodItem(index, e.target.value)}
                        placeholder="e.g., Grilled chicken breast"
                        className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {manualEntryForm.foodItems.length > 1 && (
                        <button
                          onClick={() => removeFoodItemField(index)}
                          className="text-error hover:text-error-dark"
                          aria-label="Remove food item"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addFoodItemField}
                    className="text-sm text-primary hover:text-primary-hover font-medium"
                  >
                    + Add another food item
                  </button>
                </div>

                {/* Calories */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Total Calories *
                  </label>
                  <input
                    type="number"
                    value={manualEntryForm.calories}
                    onChange={(e) => setManualEntryForm({ ...manualEntryForm, calories: e.target.value })}
                    placeholder="e.g., 450"
                    min="0"
                    step="1"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                {/* Macros Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Protein (g) *
                    </label>
                    <input
                      type="number"
                      value={manualEntryForm.protein}
                      onChange={(e) => setManualEntryForm({ ...manualEntryForm, protein: e.target.value })}
                      placeholder="30"
                      min="0"
                      step="0.1"
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Carbs (g) *
                    </label>
                    <input
                      type="number"
                      value={manualEntryForm.carbs}
                      onChange={(e) => setManualEntryForm({ ...manualEntryForm, carbs: e.target.value })}
                      placeholder="40"
                      min="0"
                      step="0.1"
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Fat (g) *
                    </label>
                    <input
                      type="number"
                      value={manualEntryForm.fat}
                      onChange={(e) => setManualEntryForm({ ...manualEntryForm, fat: e.target.value })}
                      placeholder="15"
                      min="0"
                      step="0.1"
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Fiber (g)
                    </label>
                    <input
                      type="number"
                      value={manualEntryForm.fiber}
                      onChange={(e) => setManualEntryForm({ ...manualEntryForm, fiber: e.target.value })}
                      placeholder="5"
                      min="0"
                      step="0.1"
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={manualEntryForm.notes}
                    onChange={(e) => setManualEntryForm({ ...manualEntryForm, notes: e.target.value })}
                    placeholder="Add any additional notes about this meal..."
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={saveManualEntry}
                    disabled={saving}
                    className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center space-x-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Saving...</span>
                      </span>
                    ) : (
                      '💾 Save Meal'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowManualEntry(false)
                      setManualEntryForm({
                        foodItems: [''],
                        calories: '',
                        protein: '',
                        carbs: '',
                        fat: '',
                        fiber: '',
                        notes: ''
                      })
                    }}
                    disabled={saving}
                    className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

        {/* Meal Templates Panel */}
        {showTemplates && (
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-foreground">Meal Templates</h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-muted-foreground hover:text-muted-foreground"
              >
                ✕
              </button>
            </div>

            {loadingTemplates ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <TemplateCardSkeleton key={i} />
                ))}
              </div>
            ) : mealTemplates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-2">No templates saved yet</p>
                <p className="text-xs text-muted-foreground">Log a meal with AI analysis and save it as a template!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {mealTemplates.map((template) => {
                  const mealTypeEmoji = mealTypes.find(t => t.id === template.mealType)?.emoji || '🍽️'
                  return (
                    <div
                      key={template.id}
                      className="border border-border rounded-lg p-4 hover:border-primary transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-lg">{mealTypeEmoji}</span>
                            <span className="font-medium text-foreground">{template.name}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{template.calories} cal</span>
                            <span>P: {template.macros.protein}g</span>
                            <span>C: {template.macros.carbs}g</span>
                            <span>F: {template.macros.fat}g</span>
                          </div>
                          {template.usageCount > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">Used {template.usageCount} time{template.usageCount !== 1 ? 's' : ''}</p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteTemplate(template.id, template.name)}
                          disabled={deletingTemplateId === template.id}
                          className="text-error hover:text-error-dark ml-2 disabled:opacity-50 flex items-center justify-center min-w-[24px]"
                          aria-label="Delete template"
                        >
                          {deletingTemplateId === template.id ? <Spinner size="sm" className="text-error" /> : '🗑️'}
                        </button>
                      </div>
                      <div className="mb-2">
                        <p className="text-xs text-muted-foreground">
                          {template.foodItems.join(', ')}
                        </p>
                      </div>
                      <button
                        onClick={() => useTemplate(template)}
                        disabled={usingTemplateId === template.id}
                        className={`w-full bg-primary text-white px-3 py-2 rounded text-sm hover:bg-primary-hover inline-flex items-center justify-center space-x-2 ${usingTemplateId === template.id ? 'cursor-wait opacity-60' : ''}`}
                      >
                        {usingTemplateId === template.id && <Spinner size="sm" />}
                        <span>{usingTemplateId === template.id ? 'Loading...' : 'Use This Template'}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* AI Analysis Results */}
        {aiAnalysis && (
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-foreground">AI Analysis</h2>
            </div>

            <div className="space-y-4">
              {/* Detected Meal Type - Editable */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">
                      {mealTypes.find(t => t.id === selectedMealType)?.emoji || '🍽️'}
                    </span>
                    <div>
                      <p className="text-xs text-muted-foreground">Detected Meal Type</p>
                      <p className="text-lg font-semibold text-foreground capitalize">{selectedMealType}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMealTypeSuggestion(!showMealTypeSuggestion)}
                    className="text-sm text-primary hover:text-primary-hover font-medium"
                  >
                    {showMealTypeSuggestion ? 'Cancel' : 'Change'}
                  </button>
                </div>

                {/* Meal Type Selector (shown when editing) */}
                {showMealTypeSuggestion && (
                  <div className="mt-4 pt-4 border-t border-indigo-200">
                    <div className="grid grid-cols-4 gap-2">
                      {mealTypes.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => {
                            const previousType = selectedMealType
                            setSelectedMealType(type.id)
                            setShowMealTypeSuggestion(false)
                            toast.success(`Changed to ${type.label}`)

                            // Track meal type correction if AI suggested something different
                            if (aiSuggestedMealType && aiSuggestedMealType !== type.id) {
                              trackAICorrection('mealType', {
                                aiSuggested: aiSuggestedMealType,
                                userSelected: type.id,
                                previousType
                              })
                            }
                          }}
                          className={`p-2 rounded-lg border-2 transition-colors ${
                            selectedMealType === type.id
                              ? 'border-primary bg-primary-light dark:bg-purple-900/20 text-primary-hover'
                              : 'border-border hover:border-primary bg-card'
                          }`}
                        >
                          <div className="flex flex-col items-center space-y-1">
                            <span className="text-xl">{type.emoji}</span>
                            <span className="text-xs font-medium">{type.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Individual Food Items */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">Food Items</h3>
                <div className="space-y-2">
                  {aiAnalysis.foodItems.map((item, index) => (
                    <div key={index} className="bg-muted rounded-lg p-3 border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.portion}</p>
                        </div>
                        <button
                          className="text-xs text-primary hover:text-primary-hover font-medium"
                          onClick={() => {
                            if (editingFoodItemIndex === index) {
                              setEditingFoodItemIndex(null)
                              setPortionMultiplier(1.0)
                            } else {
                              setEditingFoodItemIndex(index)
                              setPortionMultiplier(1.0)
                            }
                          }}
                        >
                          {editingFoodItemIndex === index ? 'Cancel' : 'Edit'}
                        </button>
                      </div>

                      {/* Portion Adjustment Controls */}
                      {editingFoodItemIndex === index && (
                        <div className="mb-3 p-3 bg-card rounded border border-indigo-200">
                          <p className="text-xs text-foreground mb-2 font-medium">Adjust Portion Size</p>
                          <div className="flex items-center space-x-2 mb-3">
                            <button
                              onClick={() => setPortionMultiplier(0.5)}
                              className={`px-2 py-1 text-xs rounded ${portionMultiplier === 0.5 ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}
                            >
                              ½
                            </button>
                            <button
                              onClick={() => setPortionMultiplier(0.75)}
                              className={`px-2 py-1 text-xs rounded ${portionMultiplier === 0.75 ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}
                            >
                              ¾
                            </button>
                            <button
                              onClick={() => setPortionMultiplier(1.0)}
                              className={`px-2 py-1 text-xs rounded ${portionMultiplier === 1.0 ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}
                            >
                              1x
                            </button>
                            <button
                              onClick={() => setPortionMultiplier(1.5)}
                              className={`px-2 py-1 text-xs rounded ${portionMultiplier === 1.5 ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}
                            >
                              1.5x
                            </button>
                            <button
                              onClick={() => setPortionMultiplier(2.0)}
                              className={`px-2 py-1 text-xs rounded ${portionMultiplier === 2.0 ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}
                            >
                              2x
                            </button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="range"
                              min="0.25"
                              max="3"
                              step="0.25"
                              value={portionMultiplier}
                              onChange={(e) => setPortionMultiplier(parseFloat(e.target.value))}
                              className="flex-1"
                            />
                            <span className="text-sm font-medium text-foreground w-12">{portionMultiplier}x</span>
                          </div>
                          <button
                            onClick={() => adjustFoodItemPortion(index, portionMultiplier)}
                            className="w-full mt-3 bg-primary text-white px-3 py-2 rounded text-sm hover:bg-primary-hover"
                          >
                            Apply Adjustment
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-5 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Cal</span>
                          <p className="font-semibold text-primary">{item.calories}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">P</span>
                          <p className="font-medium text-foreground">{item.protein}g</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">C</span>
                          <p className="font-medium text-foreground">{item.carbs}g</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">F</span>
                          <p className="font-medium text-foreground">{item.fat}g</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fi</span>
                          <p className="font-medium text-foreground">{item.fiber}g</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-foreground">Total Nutrition</h3>
                  <span className="text-xs bg-success-light text-success-dark px-2 py-1 rounded-full">
                    {aiAnalysis.confidence}% confidence
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Total Calories</span>
                    <p className="text-2xl font-bold text-success">{aiAnalysis.totalCalories}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Protein</span>
                      <p className="font-semibold text-foreground">{aiAnalysis.totalMacros.protein}g</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Carbs</span>
                      <p className="font-semibold text-foreground">{aiAnalysis.totalMacros.carbs}g</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fat</span>
                      <p className="font-semibold text-foreground">{aiAnalysis.totalMacros.fat}g</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fiber</span>
                      <p className="font-semibold text-foreground">{aiAnalysis.totalMacros.fiber}g</p>
                    </div>
                  </div>
                </div>
              </div>

              {aiAnalysis.suggestions && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">AI Suggestions</h3>
                  <ul className="text-sm text-success space-y-1">
                    {aiAnalysis.suggestions.map((suggestion: string, index: number) => (
                      <li key={index}>💡 {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Additional Photos Section */}
              <div className="bg-accent-light dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-foreground">
                    Additional Photos (Optional)
                  </h3>
                  <span className="text-xs bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full">
                    {additionalPhotos.length}/4
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Add up to 4 extra photos for different angles or social media posts
                </p>

                {/* Thumbnail Grid */}
                {additionalPhotos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {additionalPhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={`Additional photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-border"
                        />
                        <button
                          onClick={() => removeAdditionalPhoto(index)}
                          className="absolute top-1 right-1 bg-error text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove photo"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add More Photos Button */}
                {additionalPhotos.length < 4 && (
                  <label className={`btn btn-secondary w-full cursor-pointer ${uploadingAdditional ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploadingAdditional ? (
                      <span className="flex items-center justify-center space-x-2">
                        <Spinner size="sm" />
                        <span>Processing...</span>
                      </span>
                    ) : (
                      <>📷 Add More Photos ({4 - additionalPhotos.length} remaining)</>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handleAdditionalPhotos}
                      className="hidden"
                      disabled={uploadingAdditional || saving}
                    />
                  </label>
                )}
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex space-x-3">
                  <button
                    onClick={() => saveMeal()}
                    disabled={saving}
                    className="btn btn-primary flex-1"
                    aria-label="Save meal log"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center space-x-2">
                        <Spinner size="sm" className="text-white" />
                        <span>{uploadProgress || 'Saving...'}</span>
                      </span>
                    ) : (
                      '✓ Save Meal'
                    )}
                  </button>
                  <label className={`btn btn-secondary cursor-pointer ${saving ? 'opacity-50 pointer-events-none' : ''}`}>
                    🔄 Retake
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleCameraCapture}
                      className="hidden"
                      disabled={saving}
                    />
                  </label>
                </div>

                {!showSaveTemplate ? (
                  <button
                    onClick={() => setShowSaveTemplate(true)}
                    disabled={saving}
                    className="w-full text-sm text-primary hover:text-primary-hover py-2"
                  >
                    ⭐ Save as Template
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template name (e.g., 'My Breakfast')"
                      className="w-full px-3 py-2 border border-border rounded text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && saveAsTemplate()}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={saveAsTemplate}
                        disabled={savingTemplate}
                        className={`flex-1 bg-primary text-white px-3 py-2 rounded text-sm hover:bg-primary-hover inline-flex items-center justify-center space-x-2 ${savingTemplate ? 'cursor-wait opacity-60' : ''}`}
                      >
                        {savingTemplate && <Spinner size="sm" />}
                        <span>{savingTemplate ? 'Saving...' : 'Save Template'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowSaveTemplate(false)
                          setTemplateName('')
                        }}
                        className="flex-1 bg-muted text-foreground px-3 py-2 rounded text-sm hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Today's Summary */}
        {todaysSummary.mealCount > 0 && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 shadow-sm border border-indigo-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-foreground">Today's Summary</h2>
              <span className="text-sm text-muted-foreground">{todaysSummary.mealCount} meal{todaysSummary.mealCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Total Calories</div>
                <div className="text-2xl font-bold text-primary">{Math.round(todaysSummary.calories)}</div>
              </div>
              <div className="bg-card rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Protein</div>
                <div className="text-2xl font-bold text-success">{Math.round(todaysSummary.protein)}g</div>
              </div>
              <div className="bg-card rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Carbs</div>
                <div className="text-2xl font-bold text-warning">{Math.round(todaysSummary.carbs)}g</div>
              </div>
              <div className="bg-card rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Fat</div>
                <div className="text-2xl font-bold text-warning">{Math.round(todaysSummary.fat)}g</div>
              </div>
            </div>
          </div>
        )}

        {/* Meal History */}
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-foreground">Recent Meals</h2>
            {mealHistory.length > 0 && !multiSelectMode && (
              <div className="flex items-center space-x-2 relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="text-sm text-primary hover:text-primary-hover"
                >
                  📥 Export
                </button>

                {showExportMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowExportMenu(false)}
                    />
                    <div className="absolute right-0 top-8 z-20 bg-card border border-border rounded-lg shadow-lg py-2 min-w-[120px]">
                      <button
                        onClick={handleExportCSV}
                        className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                      >
                        📄 CSV
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                      >
                        📑 PDF
                      </button>
                    </div>
                  </>
                )}

                <button
                  onClick={() => setMultiSelectMode(true)}
                  className="text-sm text-primary hover:text-primary-hover"
                >
                  Select
                </button>
              </div>
            )}
          </div>

          {/* Multi-select actions */}
          {multiSelectMode && (
            <div className="mb-4 p-3 bg-primary-light dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-foreground">
                    {selectedMealIds.size} selected
                  </span>
                  {selectedMealIds.size < filteredMeals.length ? (
                    <button
                      onClick={selectAllMeals}
                      className="text-xs text-primary hover:text-primary-hover"
                    >
                      Select All
                    </button>
                  ) : (
                    <button
                      onClick={deselectAllMeals}
                      className="text-xs text-primary hover:text-primary-hover"
                    >
                      Deselect All
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {selectedMealIds.size > 0 && (
                    <button
                      onClick={deleteSelectedMeals}
                      className="text-sm bg-error text-white px-3 py-1 rounded hover:bg-error-dark"
                    >
                      Delete ({selectedMealIds.size})
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMultiSelectMode(false)
                      setSelectedMealIds(new Set())
                    }}
                    className="text-sm bg-muted text-foreground px-3 py-1 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter Controls */}
          <div className="space-y-3 mb-4">
            {/* Search Bar */}
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ingredients, or notes..."
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Meal Type Filter */}
            <div className="flex space-x-2 overflow-x-auto">
              <button
                onClick={() => setFilterMealType('all')}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                  filterMealType === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {mealTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFilterMealType(type.id)}
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                    filterMealType === type.id
                      ? 'bg-primary text-white'
                      : 'bg-muted text-foreground hover:bg-gray-200'
                  }`}
                >
                  {type.emoji} {type.label}
                </button>
              ))}
            </div>

            {/* Results Count */}
            {(searchQuery || filterMealType !== 'all') && (
              <p className="text-xs text-muted-foreground">
                {filteredMeals.length} meal{filteredMeals.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

          {loadingHistory ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <MealCardSkeleton key={i} />
              ))}
            </div>
          ) : mealHistory.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-20 h-20 mx-auto mb-4 bg-primary-light dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                <span className="text-4xl">🍽️</span>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No meals logged yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                Start tracking your nutrition journey by logging your first meal. Take a photo or enter details manually!
              </p>
              <div className="space-y-2 text-xs text-muted-foreground max-w-sm mx-auto">
                <div className="flex items-center space-x-2">
                  <span className="flex-shrink-0">📸</span>
                  <p className="text-left">Snap a photo and let AI analyze your meal</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="flex-shrink-0">🎯</span>
                  <p className="text-left">Track calories, protein, carbs, and fat automatically</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="flex-shrink-0">📊</span>
                  <p className="text-left">View daily summaries and nutrition insights</p>
                </div>
              </div>
            </div>
          ) : filteredMeals.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-20 h-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <span className="text-4xl">🔍</span>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No meals found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                No meals match your search criteria.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setFilterMealType('all')
                }}
                className="text-sm text-primary hover:text-primary-hover font-medium"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredMeals.map((meal) => {
                const mealTypeEmoji = mealTypes.find(t => t.id === meal.mealType)?.emoji || '🍽️'
                const isExpanded = expandedMealId === meal.id
                const isDeleting = deletingMealId === meal.id
                const isEditing = editingMealId === meal.id
                const mealDate = new Date(meal.loggedAt)
                const isToday = mealDate.toDateString() === new Date().toDateString()
                const timeStr = mealDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                const dateStr = isToday ? 'Today' : mealDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

                const isSelected = selectedMealIds.has(meal.id)

                return (
                  <div
                    key={meal.id}
                    className={`border border-border rounded-lg p-4 hover:border-primary transition-colors ${
                      isDeleting ? 'opacity-50' : ''
                    } ${isSelected ? 'border-primary bg-primary-light dark:bg-purple-900/20' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Checkbox for multi-select mode */}
                      {multiSelectMode && (
                        <div className="flex-shrink-0 pt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleMealSelection(meal.id)}
                            className="w-5 h-5 text-primary rounded border-border focus:ring-primary"
                          />
                        </div>
                      )}

                      <div
                        className="flex items-start space-x-3 flex-1 cursor-pointer"
                        onClick={() => !multiSelectMode && setExpandedMealId(isExpanded ? null : meal.id)}
                      >
                        {meal.photoUrl && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedPhotoUrl(meal.photoUrl ?? null)
                            }}
                            className="relative group/photo flex-shrink-0"
                          >
                            <img
                              src={meal.photoUrl}
                              alt={`${meal.mealType} photo`}
                              className="w-16 h-16 object-cover rounded-lg cursor-pointer transition-all group-hover/photo:ring-2 group-hover/photo:ring-indigo-400 group-hover/photo:scale-105"
                            />
                            {/* additionalPhotos removed - MealLog type only supports single photoUrl */}
                            <div className="absolute inset-0 bg-black/0 group-hover/photo:bg-black/20 rounded-lg transition-all flex items-center justify-center">
                              <span className="text-white opacity-0 group-hover/photo:opacity-100 transition-opacity text-xl">🔍</span>
                            </div>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {meal.description && (
                            <div className="font-semibold text-foreground mb-1">{meal.description}</div>
                          )}
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xl">{mealTypeEmoji}</span>
                            <span className="font-medium text-foreground capitalize text-sm">{meal.mealType}</span>
                            <span className="text-xs text-muted-foreground">• {dateStr} at {timeStr}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="font-semibold text-primary">{meal.calories || 0} cal</span>
                            {(meal.protein || meal.carbs || meal.fat) && (
                              <>
                                <span className="text-muted-foreground">P: {meal.protein || 0}g</span>
                                <span className="text-muted-foreground">C: {meal.carbs || 0}g</span>
                                <span className="text-muted-foreground">F: {meal.fat || 0}g</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons - hide in multi-select mode */}
                      {!multiSelectMode && (
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              shareMealHandler(meal)
                            }}
                            disabled={isDeleting || isEditing || sharingMealId === meal.id}
                            className="text-success hover:text-success-dark disabled:opacity-50 flex items-center justify-center min-w-[24px]"
                            aria-label="Share meal"
                            title="Share to social media"
                          >
                            {sharingMealId === meal.id ? (
                              <Spinner size="sm" className="text-success" />
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditingMeal(meal)
                            }}
                            disabled={isDeleting || isEditing || sharingMealId === meal.id}
                            className="text-accent hover:text-accent-dark disabled:opacity-50"
                            aria-label="Edit meal"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteMeal(meal.id, meal.mealType)
                            }}
                            disabled={isDeleting || isEditing || sharingMealId === meal.id}
                            className="text-error hover:text-error-dark disabled:opacity-50 flex items-center justify-center min-w-[24px]"
                            aria-label="Delete meal"
                          >
                            {isDeleting ? (
                              <Spinner size="sm" className="text-error" />
                            ) : (
                              '🗑️'
                            )}
                          </button>
                          <button
                            onClick={() => setExpandedMealId(isExpanded ? null : meal.id)}
                            className="text-muted-foreground hover:text-muted-foreground"
                            disabled={isEditing}
                          >
                            {isExpanded ? '▲' : '▼'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Edit Form */}
                    {isEditing && (
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">Description (Optional)</label>
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="e.g., Chicken Rice Bowl"
                            className="w-full px-3 py-2 border border-border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-2">Meal Type</label>
                          <div className="grid grid-cols-4 gap-2">
                            {mealTypes.map((type) => (
                              <button
                                key={type.id}
                                onClick={() => setEditForm({ ...editForm, mealType: type.id })}
                                className={`p-2 rounded border text-xs ${
                                  editForm.mealType === type.id
                                    ? 'border-primary bg-primary-light dark:bg-purple-900/20 text-primary-hover'
                                    : 'border-border hover:border-border'
                                }`}
                              >
                                <div className="flex flex-col items-center space-y-1">
                                  <span className="text-lg">{type.emoji}</span>
                                  <span className="text-xs">{type.label}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">Notes (Optional)</label>
                          <textarea
                            value={editForm.notes}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded text-sm"
                            rows={2}
                            placeholder="Add notes about this meal..."
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => saveEditedMeal(meal.id)}
                            disabled={updatingMealId === meal.id}
                            className={`flex-1 bg-primary text-white px-3 py-2 rounded text-sm hover:bg-primary-hover inline-flex items-center justify-center space-x-2 ${updatingMealId === meal.id ? 'cursor-wait opacity-60' : ''}`}
                          >
                            {updatingMealId === meal.id && <Spinner size="sm" />}
                            <span>{updatingMealId === meal.id ? 'Saving...' : 'Save Changes'}</span>
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="flex-1 bg-muted text-foreground px-3 py-2 rounded text-sm hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {isExpanded && !isEditing && (
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        {/* additionalPhotos section removed - MealLog type only supports single photoUrl */}

                        {meal.foodItems && meal.foodItems.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-foreground mb-1">Foods</h4>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {meal.foodItems.map((item: string, idx: number) => (
                                <li key={idx}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {meal.notes && (
                          <div>
                            <h4 className="text-xs font-medium text-foreground mb-1">Notes</h4>
                            <p className="text-xs text-muted-foreground">{meal.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Meal Safety Warning Modal */}
      {showSafetyWarning && mealSafetyCheck && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg max-w-lg w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {mealSafetyCheck.severity === 'critical' ? '🚨' :
                 mealSafetyCheck.severity === 'caution' ? '⚠️' : 'ℹ️'}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {mealSafetyCheck.severity === 'critical' ? 'Critical Health Warning' :
                   mealSafetyCheck.severity === 'caution' ? 'Dietary Caution' : 'Health Notice'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  This meal may not be suitable for your health profile
                </p>
              </div>
            </div>

            {/* Warnings List */}
            <div className={`p-4 rounded-lg border ${
              mealSafetyCheck.severity === 'critical'
                ? 'bg-error-light dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-warning-light border-warning-light'
            }`}>
              <ul className="space-y-2">
                {mealSafetyCheck.warnings.map((warning, idx) => (
                  <li key={idx} className={`text-sm flex items-start gap-2 ${
                    mealSafetyCheck.severity === 'critical'
                      ? 'text-red-800 dark:text-red-300'
                      : 'text-warning-dark dark:text-yellow-300'
                  }`}>
                    <span className="flex-shrink-0 mt-0.5">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Nutrient Breakdown (if available) */}
            {mealSafetyCheck.nutrientBreakdown && Object.keys(mealSafetyCheck.nutrientBreakdown).length > 0 && (
              <div className="p-4 rounded-lg bg-background border border-border">
                <p className="text-xs font-medium text-foreground mb-2">Nutrient Analysis:</p>
                <div className="space-y-1">
                  {Object.entries(mealSafetyCheck.nutrientBreakdown).map(([nutrient, data]: [string, any]) => (
                    <div key={nutrient} className="flex justify-between text-xs text-muted-foreground">
                      <span className="capitalize">{nutrient}:</span>
                      <span className={data.percentage > 30 ? 'text-error font-semibold' : ''}>
                        {data.amount}{data.unit || ''} / {data.limit}{data.unit || ''} ({Math.round(data.percentage)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confidence Score */}
            <div className="text-xs text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
              <span>AI Confidence:</span>
              <span className="font-medium">{mealSafetyCheck.confidence}%</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowSafetyWarning(false)
                  setMealSafetyCheck(null)
                }}
                className="btn btn-outline flex-1"
              >
                Go Back & Edit
              </button>
              <button
                onClick={async () => {
                  setShowSafetyWarning(false)
                  setMealSafetyCheck(null)
                  // Proceed with saving, bypassing safety check
                  await saveMeal(true)
                }}
                className={`btn flex-1 ${
                  mealSafetyCheck.severity === 'critical'
                    ? 'bg-error hover:bg-red-700 text-white'
                    : 'btn-primary'
                }`}
              >
                {mealSafetyCheck.severity === 'critical' ? 'Log Anyway' : 'Proceed'}
              </button>
            </div>

            {mealSafetyCheck.severity === 'critical' && (
              <p className="text-xs text-muted-foreground text-center">
                Logging this meal may trigger admin review
              </p>
            )}
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {selectedPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhotoUrl(null)}
        >
          <div className="relative max-w-5xl w-full">
            <button
              onClick={() => setSelectedPhotoUrl(null)}
              className="absolute -top-12 right-0 bg-card/10 hover:bg-card/20 text-white w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
              aria-label="Close photo"
            >
              ✕
            </button>
            <img
              src={selectedPhotoUrl}
              alt="Meal photo enlarged"
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Share Modal (Desktop) */}
      {shareModalData && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setShareModalData(null)}
        >
          <div
            className="bg-card rounded-2xl max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Share to Social Media</h3>
                <button
                  onClick={() => setShareModalData(null)}
                  className="text-muted-foreground hover:text-muted-foreground transition-colors"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Platform Buttons */}
            <div className="p-6 space-y-3">
              {(['facebook', 'twitter', 'pinterest', 'instagram', 'tiktok'] as const).map((platform) => {
                const info = getPlatformInfo(platform)
                return (
                  <button
                    key={platform}
                    onClick={() => handlePlatformShare(platform)}
                    className="w-full flex items-center space-x-4 p-4 rounded-lg border-2 border-border hover:border-border hover:bg-muted transition-all group"
                  >
                    <span className="text-3xl">{info.icon}</span>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-foreground group-hover:text-foreground">{info.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {info.supportsWebShare ? 'Open in new window' : 'Download image + copy caption'}
                      </p>
                    </div>
                    <span className="text-muted-foreground group-hover:text-muted-foreground">→</span>
                  </button>
                )
              })}
            </div>

            {/* Footer Note */}
            <div className="px-6 py-4 bg-muted rounded-b-2xl">
              <p className="text-xs text-muted-foreground text-center">
                💡 For Instagram & TikTok: Image will be downloaded. Paste the caption from your clipboard!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onScan={handleBarcodeScan}
        onClose={() => setShowBarcodeScanner(false)}
      />

      {/* Duplicate Meal Modal */}
      {showDuplicateModal && duplicateMeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-foreground dark:text-white mb-4">
              {duplicateMeal.mealType} Already Logged
            </h3>
            <p className="text-muted-foreground mb-4">
              You've already logged <span className="font-semibold">{duplicateMeal.description}</span> as your {duplicateMeal.mealType.toLowerCase()} today.
            </p>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-6">
              You can only log one {duplicateMeal.mealType.toLowerCase()} per day. Choose an option below:
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  // Delete existing meal and allow new entry
                  try {
                    if (patientIdParam) {
                      await medicalOperations.mealLogs.deleteMealLog(patientIdParam, duplicateMeal.id)
                    } else {
                      await mealLogOperations.deleteMealLog(duplicateMeal.id)
                    }
                    toast.success('Previous meal deleted. You can now log a new one.')
                    setShowDuplicateModal(false)
                    setDuplicateMeal(null)
                  } catch (error) {
                    toast.error('Failed to delete existing meal')
                  }
                }}
                className="btn btn-primary w-full"
              >
                🔄 Replace Existing Meal
              </button>
              <button
                onClick={() => {
                  // Navigate to edit the existing meal
                  setExpandedMealId(duplicateMeal.id)
                  setShowDuplicateModal(false)
                  setDuplicateMeal(null)
                  // Scroll to the meal
                  setTimeout(() => {
                    document.getElementById(`meal-${duplicateMeal.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }, 100)
                  toast('Scroll down to edit your existing meal')
                }}
                className="btn btn-secondary w-full"
              >
                ✏️ Edit Existing Meal
              </button>
              <button
                onClick={() => {
                  // Change to snack (always allowed)
                  setSelectedMealType('snack')
                  setShowDuplicateModal(false)
                  setDuplicateMeal(null)
                  toast.success('Changed to Snack - you can log unlimited snacks')
                }}
                className="btn btn-secondary w-full"
              >
                🍎 Log as Snack Instead
              </button>
              <button
                onClick={() => {
                  // Dismiss modal and allow logging anyway
                  setShowDuplicateModal(false)
                  setDuplicateMeal(null)
                }}
                className="btn btn-ghost w-full"
              >
                Continue Anyway
              </button>
              <button
                onClick={() => {
                  // Go back to dashboard
                  window.location.href = '/dashboard'
                }}
                className="btn btn-outline w-full text-sm"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog />
    </main>
  )
}

export default function LogMealPage() {
  return (
    <AuthGuard>
      <LogMealContent />
    </AuthGuard>
  )
}
