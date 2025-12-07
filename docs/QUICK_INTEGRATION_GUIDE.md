# Quick Integration Guide: Nutrition-Vitals Feedback Loop

**Get the bidirectional feedback loop running in 30 minutes**

---

## Step 1: Verify Prerequisites (5 min)

Check that you have:
- [ ] Vitals tracking working (`VitalSign` type, `useVitals` hook)
- [ ] Shopping list working (`ShoppingItem` type)
- [ ] Meal logging working (`MealLog` type)
- [ ] AI suggestions working (`HealthBasedSuggestion` from `lib/ai-shopping-suggestions.ts`)

## Step 2: Update Shopping Items Type (2 min)

**File:** `types/shopping.ts`

Add these fields to `ShoppingItem`:
```typescript
interface ShoppingItem {
  // ... existing fields ...

  // NEW: Link to AI suggestion
  wasAISuggested?: boolean
  suggestionId?: string
  suggestedForVital?: {
    type: VitalType
    value: number
    date: Date
  }
}
```

## Step 3: Update Meal Logs Type (2 min)

**File:** `types/medical.ts`

Add these fields to `MealLog`:
```typescript
interface MealLog {
  // ... existing fields ...

  // NEW: Link to shopping items
  shoppingItemIds?: string[]
  consumedFrom?: string[] // Product names consumed
}
```

## Step 4: Track Purchases (5 min)

**File:** Your shopping component (e.g., `app/shopping/page.tsx`)

```typescript
import { trackShoppingImpact } from '@/lib/nutrition-vitals-correlation'

// When marking item as purchased
async function handlePurchase(item: ShoppingItem) {
  // Update item status
  await updateShoppingItem(item.id, {
    needed: false,
    inStock: true,
    lastPurchased: new Date()
  })

  // NEW: Track if it was an AI suggestion
  if (item.wasAISuggested && item.suggestionId) {
    try {
      await trackShoppingImpact(
        patientId,
        userId,
        item,
        item.suggestion // HealthBasedSuggestion object
      )
    } catch (error) {
      // Silent fail - don't block user
      console.warn('Failed to track shopping impact', error)
    }
  }
}
```

## Step 5: Track Consumption (5 min)

**File:** Your meal logging component

```typescript
import { trackConsumption } from '@/lib/nutrition-vitals-correlation'

// When logging a meal
async function handleMealSubmit(mealData: Partial<MealLog>) {
  // Save meal log
  const mealLog = await saveMealLog(patientId, mealData)

  // NEW: Link meal to shopping items
  try {
    // Fetch recent purchases (last 30 days)
    const recentPurchases = await fetchShoppingItems(patientId, {
      since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    })

    // Track consumption
    await trackConsumption(patientId, userId, mealLog, recentPurchases)
  } catch (error) {
    console.warn('Failed to track consumption', error)
  }
}
```

## Step 6: Trigger Correlation Analysis (5 min)

**File:** Your vitals logging component

```typescript
import { correlateNutritionWithVitals } from '@/lib/nutrition-vitals-correlation'

// When logging a vital
async function handleVitalSubmit(vitalData: Omit<VitalSign, 'id'>) {
  // Save vital
  const vital = await saveVital(patientId, vitalData)

  // NEW: Run correlation analysis (async - don't block UI)
  setTimeout(async () => {
    try {
      const correlation = await correlateNutritionWithVitals(
        patientId,
        userId,
        vital.type,
        30 // Analyze last 30 days
      )

      if (correlation) {
        // Optionally show a notification
        showNotification({
          title: 'Health Insight Available',
          message: correlation.insights[0],
          type: 'success'
        })
      }
    } catch (error) {
      // Silent fail
      console.warn('Correlation analysis failed', error)
    }
  }, 500) // Delay to not block UI
}
```

## Step 7: Add Dashboard Widget (5 min)

**File:** `app/dashboard/page.tsx` or main dashboard

```typescript
import { HealthProgressTracker } from '@/components/health/HealthProgressTracker'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Existing dashboard content */}

      {/* NEW: Health Progress Widget */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Your Health Progress</h2>
        <HealthProgressTracker
          patientId={patientId}
          userId={userId}
          period="weekly"
        />
      </section>
    </div>
  )
}
```

## Step 8: Add Insights to Vitals Page (5 min)

**File:** `app/patients/[patientId]/vitals/page.tsx`

```typescript
import { NutritionImpactInsights } from '@/components/health/NutritionImpactInsights'

export default function VitalsPage({ params }: { params: { patientId: string } }) {
  const [selectedVitalType, setSelectedVitalType] = useState<VitalType>('blood_pressure')

  return (
    <div className="space-y-6">
      {/* Existing vitals chart */}

      {/* NEW: Nutrition Impact Insights */}
      <NutritionImpactInsights
        patientId={params.patientId}
        userId={userId}
        vitalType={selectedVitalType}
        timeRangeDays={30}
        showPrediction={true}
      />
    </div>
  )
}
```

## Step 9: Test the Flow (5 min)

### Test Scenario: High Blood Pressure

1. **Log high BP:** 145/95 mmHg
   - Should trigger AI suggestions

2. **View suggestions:** Bananas, Spinach, Salmon
   - Check shopping list for "Healthy Choice" badges

3. **Purchase items:** Mark bananas and spinach as purchased
   - Check Firebase: `suggestion_effectiveness` collection should have records

4. **Log meals:** "Banana smoothie", "Spinach salad"
   - Check Firebase: `consumption_events` collection should have records

5. **Wait or manually advance:** Add a new BP reading 14 days later
   - Log BP: 135/85 mmHg (improved!)

6. **View insights:** Check dashboard or vitals page
   - Should show: "Your BP improved 7% after eating more potassium-rich foods"

---

## Firestore Setup

### Security Rules

Add to `firestore.rules`:

```
// Nutrition-vitals correlations
match /nutrition_vitals_correlations/{patientId}/correlations/{correlationId} {
  allow read: if isOwnerOrCaregiverOf(patientId);
  allow write: if isOwnerOf(patientId);
}

// Health outcomes
match /health_outcomes/{patientId}/outcomes/{outcomeId} {
  allow read: if isOwnerOrCaregiverOf(patientId);
  allow write: if isOwnerOf(patientId);
}

// Suggestion effectiveness
match /suggestion_effectiveness/{patientId}/suggestions/{suggestionId} {
  allow read: if isOwnerOrCaregiverOf(patientId);
  allow write: if isOwnerOf(patientId);
}

// Consumption events
match /consumption_events/{patientId}/events/{eventId} {
  allow read: if isOwnerOrCaregiverOf(patientId);
  allow write: if isOwnerOf(patientId);
}
```

### Indexes

Add to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "correlations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "patientId", "order": "ASCENDING" },
        { "fieldPath": "generatedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "patientId", "order": "ASCENDING" },
        { "fieldPath": "consumedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## Troubleshooting

### "No correlation data available"

**Cause:** Not enough data yet

**Fix:**
- Need ≥2 vitals, ≥3 meals, ≥1 purchase, ≥14 days
- Check data exists in Firestore
- Check date ranges match

### "Insufficient confidence"

**Cause:** Small sample size or high variance

**Fix:**
- Encourage more consistent logging
- Wait for more data (need ≥10 data points for high confidence)
- This is normal for early users

### Correlations not updating

**Cause:** Async processing not triggered

**Fix:**
- Check browser console for errors
- Verify Firebase permissions
- Check network tab for failed requests
- Run correlation manually:
  ```typescript
  await correlateNutritionWithVitals(patientId, userId, 'blood_pressure', 30)
  ```

---

## Next Steps

1. **Add API routes** for server-side processing
2. **Set up cron jobs** for weekly report generation
3. **Add email notifications** when insights are ready
4. **Integrate with notifications** system
5. **Add export** functionality (PDF reports)

---

## Support

Questions? Check:
- [Full Documentation](./NUTRITION_VITALS_FEEDBACK_LOOP.md)
- [Type Definitions](../types/health-outcomes.ts)
- [Example Implementation](../components/health/HealthProgressTracker.tsx)

---

**Estimated Time:** 30-40 minutes
**Difficulty:** Intermediate
**Prerequisites:** Working vitals, shopping, and meal logging
