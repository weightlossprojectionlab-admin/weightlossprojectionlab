# Medical Recipe System Documentation

## Overview

The Medical Recipe System provides personalized, medically-safe recipe suggestions for family members based on:
- **Medical conditions** (CKD, diabetes, hypertension, cancer, heart disease)
- **Current vitals** (blood pressure, blood sugar trends, weight)
- **Medications** (prescribedFor conditions, drug-food interactions)
- **Kitchen inventory** (household stock, expiring items)
- **Dietary restrictions** from health questionnaires

## Architecture

### Data Flow
```
Patient Medical Profile → Medical Constraints → Recipe Safety Filter → Inventory Matching → Personalized Suggestions
        ↓                        ↓                      ↓                      ↓                    ↓
  Conditions                Safety Rules         Safe Recipes         Availability %      Sorted by Priority
  Medications              Nutrient Limits      Remove Unsafe         Expiring Items      (Safety + Stock)
  Vitals
  Documents
```

## Core Components

### 1. Medical Recipe Engine (`lib/medical-recipe-engine.ts`)

**Purpose**: Core safety filtering logic based on medical conditions.

**Key Functions**:
- `buildMedicalConstraints()` - Build constraints from patient data
- `evaluateRecipeSafety()` - Score recipe against medical constraints
- `filterSafeRecipes()` - Return only medically-safe recipes

**Constraint Types**:
```typescript
interface MedicalRecipeConstraints {
  // Kidney Disease
  sodiumLimitMg?: number
  potassiumLimitMg?: number
  phosphorusLimitMg?: number
  proteinLimitG?: number

  // Diabetes
  carbLimitG?: number
  sugarLimitG?: number
  requiresLowGI?: boolean

  // Heart Disease
  saturatedFatLimitG?: number
  cholesterolLimitMg?: number

  // Cancer Treatment
  requiresSoftFoods?: boolean
  avoidStrongFlavors?: boolean

  // Allergies
  allergens: string[]
}
```

**Safety Scoring**:
- 100 = Completely safe
- 60-99 = Safe with warnings
- <60 = Unsafe, should not suggest

### 2. Member Recipe Engine (`lib/member-recipe-engine.ts`)

**Purpose**: Combine medical safety with inventory availability.

**Key Functions**:
- `getMemberRecipeSuggestions()` - Main engine, returns personalized recipes
- `calculateInventoryAvailability()` - Match ingredients to household stock
- `calculatePriorityScore()` - Combine safety (60%) + availability (30%) + urgency (10%)

**DRY Reuse**:
- ✅ `getMealSuggestions()` from `meal-suggestions.ts`
- ✅ `filterSafeRecipes()` from `medical-recipe-engine.ts`
- ✅ Existing inventory operations

**Output**:
```typescript
interface MemberRecipeSuggestion extends MealSuggestion {
  safetyResult: {
    isSafe: boolean
    warnings: string[]
    score: number // 0-100
    badges: RecipeSafetyBadge[]
  }
  inventoryAvailability: {
    percentage: number // % of ingredients in stock
    missingIngredients: string[]
    expiringIngredients: Array<{name: string, daysUntilExpiry: number}>
  }
  priorityScore: number // Overall ranking
  urgency: 'critical' | 'high' | 'medium' | 'low'
}
```

### 3. Enhanced Recipe Page (`app/recipes/page.tsx`)

**Features**:
- Member context banner (shows health conditions + inventory count)
- Medical safety badges on recipes
- Inventory availability progress bars
- Expiring ingredients alerts
- Safety warnings display

**Query Parameter Support**:
```
/recipes                  → All recipes (public)
/recipes?memberId=xyz     → Personalized for member xyz
```

**Member Banner** (DRY - same pattern as shopping page):
```tsx
{memberId && memberProfile && (
  <div className="bg-gradient-to-r from-green-600 to-blue-600">
    <p>Personalized Recipes for {memberProfile.name}</p>
    <p>Filtered for {conditions.length} health condition(s)</p>
  </div>
)}
```

**Safety Badges**:
- ✅ Safe for CKD
- ✅ Diabetes-Friendly
- ✅ Low Sodium
- ⚠️ High Potassium
- ⚠️ Check Medication Interactions

**Inventory Indicators**:
- Green bar (80-100%): Ready to cook
- Yellow bar (50-79%): Most ingredients available
- Gray bar (<50%): Many items needed
- 🔥 Expiring soon alert

### 4. Recipe Quick Action (`app/patients/[patientId]/page.tsx`)

**Added to Patient Quick Actions sidebar**:
```tsx
<Link href={`/recipes?memberId=${patientId}`}>
  <span>🍽️</span>
  <span>Recipe Menu</span>
</Link>
```

**Location**: Right after "🛒 Shopping List" button (DRY pattern)

## Medical Safety Rules

### Chronic Kidney Disease (CKD)

**Stage 4-5 Constraints**:
- Sodium: <1500mg/day (500mg/meal)
- Potassium: <2000mg/day (667mg/meal)
- Phosphorus: <1000mg/day (333mg/meal)
- Protein: 0.6-0.8g/kg body weight

**Rejected Foods**:
- High potassium: Bananas, potatoes, tomatoes, oranges
- High phosphorus: Dairy, nuts, beans, soda
- High sodium: Processed foods, canned soups

**Badges**:
- "✓ CKD-Safe" - Passes all kidney-safe thresholds
- "⚠️ High Potassium" - Exceeds 80% of daily limit

### Diabetes (Type 1, Type 2, Pre-diabetes)

**Constraints**:
- Carbs: <45g/meal
- Sugar: <15g/meal
- Requires Low GI foods
- Minimum 5g fiber/meal

**Rejected Foods**:
- High GI: White rice, white bread, sugary foods
- High sugar: Desserts, sweetened beverages

**Vitals Integration**:
- If recent blood sugar >140mg/dL → stricter carb limits (30g/meal)

**Badges**:
- "✓ Diabetes-Friendly" - Low GI, controlled carbs
- "⚠️ May Spike Blood Sugar" - High GI detected

### Hypertension / Heart Disease

**Constraints**:
- Sodium: <1500mg/day
- Saturated fat: <13g/day
- Cholesterol: <200mg/day
- Trans fat: 0g

**Vitals Integration**:
- If recent BP >140/90 → extra strict sodium (<1200mg/day)

**Badges**:
- "✓ Heart-Healthy" - Low sodium, low sat fat
- "⚠️ High Sodium" - Exceeds 80% of limit

### Cancer (Active Treatment)

**Constraints Based on Questionnaire**:
- Poor appetite → High calorie, soft foods
- Nausea → Bland foods (crackers, rice, applesauce)
- Metallic taste → Plastic utensils, citrus foods
- Weight loss >5% → High protein, high calorie
- Immunocompromised → No raw foods

**Rejected Foods**:
- Greasy, spicy, strong-smelling (if nausea)
- Raw salads, sushi (if immunocompromised)
- Hard/crunchy (if mouth sores)

## Integration Points

### Data Sources

1. **Patient Profile** (`PatientProfile`)
   - `healthConditions[]` - List of conditions
   - `goals.targetWeight` - Weight management
   - `goals.dailyCalorieGoal` - Calorie budget

2. **Medications** (`PatientMedication[]`)
   - `prescribedFor` - Infer conditions from meds
   - `name` - Check for drug-food interactions

3. **Vitals** (`VitalSign[]`)
   - Blood pressure trends → Sodium restrictions
   - Blood sugar trends → Carb restrictions
   - Weight trends → Calorie adjustments

4. **Health Questionnaires** (`lib/health-condition-questions.ts`)
   - CKD: GFR, dialysis status, sodium/potassium limits
   - Diabetes: Insulin regimen, A1C
   - Cancer: Treatment status, appetite, nausea
   - Stored in user profile

5. **Documents** (`PatientDocument[]`)
   - Lab results with nutrition restrictions
   - **Future**: OCR parse GFR, A1C, lipid panel

6. **Household Inventory** (`ShoppingItem[]`)
   - Current stock for availability matching
   - Expiration dates for urgency scoring

### API Calls

**Patient Data Fetch**:
```typescript
const profile = await medicalOperations.getPatientProfile(memberId)
const medications = await medicalOperations.getPatientMedications(memberId)
const vitals = await medicalOperations.getPatientVitals(memberId, { limit: 50 })
```

**Recipe Generation**:
```typescript
const suggestions = await getMemberRecipeSuggestions({
  patient: profile,
  medications,
  recentVitals: vitals,
  householdInventory: inventoryItems,
  mealType: 'dinner',
  availableRecipes: recipes, // From Firestore
  prioritizeExpiring: true
})
```

## User Experience

### For Members with Health Conditions

1. **Navigate to patient page** → Click "🍽️ Recipe Menu"
2. **Member banner appears** → "Personalized for [Name]"
3. **Recipes show safety badges**:
   - ✅ "Safe for CKD Stage 3"
   - ✅ "92% in stock"
   - 🔥 "Uses 2 expiring items"
4. **Warnings display**:
   - ⚠️ "High sodium (80% of your limit)"
   - ⚠️ "Contains high potassium - consult doctor"
5. **Unsafe recipes hidden** - Only medically-safe suggestions shown

### For Members without Conditions

- Generic recipe browsing
- Inventory availability still shown
- Expiring ingredients highlighted
- Prompt to "Complete Health Profile for safer suggestions"

### For Public Users (No Login)

- All recipes shown
- No medical filtering
- No inventory availability
- Marketing CTA: "Start Free →"

## DRY (Don't Repeat Yourself) Principles

### Reused Components
- ✅ `RecipeSuggestions.tsx` - Display logic
- ✅ `RecipeCardWithAvailability.tsx` - Card layout
- ✅ `RecipeAvailabilityBadge.tsx` - Inventory badges
- ✅ `RecipeImageCarousel.tsx` - Image display
- ✅ `ConfirmModal` - Confirmations
- ✅ `MedicationScanner` pattern - For future receipt scanner

### Reused Hooks
- ✅ `useRecipes()` - Fetch from Firestore
- ✅ `useShopping()` - Household inventory
- ✅ `usePatientPermissions()` - Access control
- ✅ `useRecipeAvailability()` - Availability scoring

### Reused Logic
- ✅ `getMealSuggestions()` - Base filtering
- ✅ `generateProductKey()` - Deduplication
- ✅ Household shopping operations
- ✅ Health questionnaire responses

### Shared Patterns
- ✅ Member context banner (same as shopping page)
- ✅ Quick Action buttons (same as shopping list)
- ✅ URL parameter filtering (`?memberId=`)
- ✅ Safety badge styling (consistent colors)

## Future Enhancements

### Document Nutrition Parser (Pending)
- OCR parse lab results for GFR, A1C, lipid panel
- Auto-set sodium, potassium, protein limits
- Store in `PatientProfile.goals` or new `nutritionRestrictions` field

### Receipt Scanner (Pending)
- Reuse `MedicationScanner.tsx` OCR pattern
- Bulk add items to household inventory
- Link receipts to inventory for expiration tracking

### Meal-to-Vitals Loop (Pending)
- Log meal with recipe nutrients
- Prompt vitals check 2h post-meal
- Analyze correlation (high sodium → elevated BP)
- Adjust future recipe suggestions based on response

### Medication Interaction Checker
- "Avoid grapefruit with statins"
- "Limit vitamin K with warfarin"
- Drug-food interaction warnings on recipes

## Testing Scenarios

### CKD Patient (Stage 4)
```
Profile: Stage 4 CKD, dialysis 3x/week
Questionnaire: Sodium 1200mg, Potassium 2000mg
Expected: Only low-sodium, low-potassium recipes
Badges: "✓ CKD-Safe", "Low Sodium", "Low Potassium"
Rejected: Banana recipes, tomato-based dishes
```

### Diabetes Patient (Type 2)
```
Profile: Type 2 Diabetes, on metformin
Vitals: Recent blood sugar 165mg/dL (elevated)
Expected: Low GI, <30g carbs/meal
Badges: "✓ Diabetes-Friendly", "Low Carb"
Rejected: White rice, sugary desserts
```

### Hypertension + High Cholesterol
```
Profile: Hypertension, high LDL
Vitals: BP 145/95 (elevated)
Medications: Lisinopril (for BP), Atorvastatin (for cholesterol)
Expected: <1200mg sodium, <13g sat fat
Badges: "✓ Heart-Healthy"
Rejected: Processed meats, fried foods
```

### Cancer Patient (Active Chemo)
```
Questionnaire: Poor appetite, frequent nausea
Expected: Soft, bland, calorie-dense foods
Badges: "✓ Gentle on Stomach"
Rejected: Spicy curries, raw salads
```

## Performance Considerations

- **Caching**: Medical constraints cached per session
- **Lazy Loading**: Recipes loaded in batches
- **Firestore Indexes**: Required for filtering by mealType + availability
- **Safety Calculation**: Run client-side (no API calls)
- **Inventory Matching**: Simple string matching (fast)

## Security

- **RBAC**: Reuses existing patient permission checks
- **Data Privacy**: Medical data never leaves user's account
- **Firestore Rules**: Family members can only access shared patients
- **Client-Side Filtering**: Medical constraints built from user's own data

## Deployment Notes

1. **No new Firestore collections** - Uses existing structure
2. **No schema migrations** - Extends `MealSuggestion` type only
3. **Backward compatible** - Works without medical data
4. **Progressive enhancement** - Better with more health data
5. **Mobile responsive** - All badges/banners adapt to screen size

## Success Metrics

- **Safety**: Zero unsafe recipes shown to high-risk patients
- **Relevance**: >80% of suggestions use available inventory
- **Urgency**: Expiring items used within 3 days
- **Engagement**: Increased recipe page visits from patient pages
- **Health Outcomes**: Improved vitals correlation with recipe usage
