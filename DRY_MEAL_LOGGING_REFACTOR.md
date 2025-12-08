# DRY Meal Logging Refactor Plan

## Problem
Meal logging code is duplicated between:
- `/app/log-meal/page.tsx` (~2500 lines) - Full featured with photo/AI
- `/components/patients/MealLogForm.tsx` (~100 lines) - Basic manual entry
- No code reuse = maintenance burden, inconsistent UX

## Solution
Extract shared logic into reusable hooks

---

## Hook 1: `hooks/useMealCapture.ts`

**Purpose:** Handle photo capture, compression, Firebase upload

```typescript
export function useMealCapture() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | undefined>()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  const capturedImageRef = useRef<string | null>(null)

  const capturePhoto = async (file: File) => {
    // Convert to base64
    // Store in both state and ref
  }

  const uploadPhoto = async () => {
    // Compress image
    // Check size for dev server
    // Upload to Firebase Storage with retry
    // Return photoUrl
  }

  const clearPhoto = () => {
    setCapturedImage(null)
    capturedImageRef.current = null
    setPhotoUrl(undefined)
  }

  return {
    capturedImage,
    photoUrl,
    uploading,
    uploadProgress,
    capturePhoto,
    uploadPhoto,
    clearPhoto
  }
}
```

**Extracted from:** `app/log-meal/page.tsx` lines 450-1120

---

## Hook 2: `hooks/useMealAnalysis.ts`

**Purpose:** AI analysis and safety checks

```typescript
export function useMealAnalysis() {
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [safetyWarnings, setSafetyWarnings] = useState<any[]>([])

  const analyzeMeal = async (imageData: string, mealType: string) => {
    setAnalyzing(true)
    try {
      // Call /api/ai/analyze-meal
      const analysis = await fetch('/api/ai/analyze-meal', {...})
      setAiAnalysis(analysis)

      // Call /api/ai/meal-safety
      const safety = await fetch('/api/ai/meal-safety', {...})
      setSafetyWarnings(safety.warnings)

      return analysis
    } finally {
      setAnalyzing(false)
    }
  }

  const clearAnalysis = () => {
    setAiAnalysis(null)
    setSafetyWarnings([])
  }

  return {
    aiAnalysis,
    analyzing,
    safetyWarnings,
    analyzeMeal,
    clearAnalysis
  }
}
```

**Extracted from:** `app/log-meal/page.tsx` lines 430-880

---

## Hook 3: `hooks/useMealSave.ts`

**Purpose:** Unified save for user and patient meals

```typescript
export function useMealSave() {
  const [saving, setSaving] = useState(false)

  const saveMeal = async ({
    mealType,
    photoUrl,
    aiAnalysis,
    patientId, // Optional - if provided, save to patient
  }: MealSaveParams) => {
    setSaving(true)
    try {
      if (patientId) {
        // Save to /api/patients/{id}/meal-logs
        await medicalOperations.mealLogs.logMeal(patientId, {...})
      } else {
        // Save to /api/meal-logs
        await mealLogOperations.createMealLog({...})
      }

      toast.success('Meal logged successfully!')
    } catch (error) {
      toast.error('Failed to save meal')
      throw error
    } finally {
      setSaving(false)
    }
  }

  return { saving, saveMeal }
}
```

**Extracted from:** `app/log-meal/page.tsx` lines 950-1250

---

## Refactored `/app/log-meal/page.tsx`

**Before:** ~2500 lines
**After:** ~500 lines

```typescript
'use client'

import { useMealCapture } from '@/hooks/useMealCapture'
import { useMealAnalysis } from '@/hooks/useMealAnalysis'
import { useMealSave } from '@/hooks/useMealSave'

export default function LogMealPage() {
  const { capturedImage, photoUrl, uploading, capturePhoto, uploadPhoto, clearPhoto } = useMealCapture()
  const { aiAnalysis, analyzing, analyzeMeal, clearAnalysis } = useMealAnalysis()
  const { saving, saveMeal } = useMealSave()

  const handleCapture = async (file: File) => {
    await capturePhoto(file)
  }

  const handleAnalyze = async () => {
    if (!capturedImage) return
    await analyzeMeal(capturedImage, selectedMealType)
  }

  const handleSave = async () => {
    // Upload photo first
    const url = await uploadPhoto()

    // Save meal
    await saveMeal({
      mealType: selectedMealType,
      photoUrl: url,
      aiAnalysis
    })

    // Cleanup
    clearPhoto()
    clearAnalysis()
  }

  return (
    // UI components
  )
}
```

---

## Updated `/components/patients/MealLogForm.tsx`

**Before:** Manual entry only, no photo/AI
**After:** Full featured, same as user mode

```typescript
'use client'

import { useMealCapture } from '@/hooks/useMealCapture'
import { useMealAnalysis } from '@/hooks/useMealAnalysis'
import { useMealSave } from '@/hooks/useMealSave'

export function MealLogForm({ patientId }: { patientId: string }) {
  const { capturedImage, photoUrl, uploading, capturePhoto, uploadPhoto } = useMealCapture()
  const { aiAnalysis, analyzing, analyzeMeal } = useMealAnalysis()
  const { saving, saveMeal } = useMealSave()

  const handleSave = async () => {
    const url = await uploadPhoto()

    await saveMeal({
      mealType: selectedMealType,
      photoUrl: url,
      aiAnalysis,
      patientId // ← Triggers patient mode
    })
  }

  // Same UI as /log-meal
}
```

---

## Benefits

✅ **DRY:** ~2000 lines of duplicated code eliminated
✅ **Consistent UX:** Same features in user and family modes
✅ **Testable:** Each hook can be tested independently
✅ **Maintainable:** Fix once, works everywhere
✅ **Reusable:** Can use in dashboard, quick log, etc.
✅ **Type-safe:** Shared types prevent mismatches

---

## Migration Steps

1. ✅ Create `hooks/useMealCapture.ts` (photo logic)
2. ✅ Create `hooks/useMealAnalysis.ts` (AI logic)
3. ✅ Create `hooks/useMealSave.ts` (save logic)
4. ✅ Test hooks in isolation
5. ✅ Refactor `/log-meal/page.tsx` to use hooks
6. ✅ Test user meal logging still works
7. ✅ Update `/components/patients/MealLogForm.tsx`
8. ✅ Test patient meal logging with photos
9. ✅ Remove old duplicated code
10. ✅ Update documentation

---

## Risk Mitigation

- **Backwards compatibility:** Keep old code until new hooks proven
- **Feature flags:** Toggle new implementation
- **Incremental rollout:** User mode first, then patients
- **Comprehensive testing:** Unit tests for hooks, E2E for flows

---

## Timeline Estimate

- Hook creation: 2-3 hours
- /log-meal refactor: 1-2 hours
- MealLogForm update: 1 hour
- Testing: 2 hours
- **Total: 6-8 hours**

---

## Files to Create

- `hooks/useMealCapture.ts` (~200 lines)
- `hooks/useMealAnalysis.ts` (~150 lines)
- `hooks/useMealSave.ts` (~100 lines)

## Files to Modify

- `app/log-meal/page.tsx` (reduce from 2500 to 500 lines)
- `components/patients/MealLogForm.tsx` (expand from 100 to 300 lines)

## Net Result

**Code reduction:** ~2000 lines
**Maintainability:** Significantly improved
**Feature parity:** User and patient modes identical
