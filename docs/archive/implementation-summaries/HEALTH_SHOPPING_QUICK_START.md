# Health-Based Shopping Suggestions - Quick Start Guide

## What It Does

The Health-Based Shopping Suggestions feature provides personalized grocery recommendations based on each family member's health data:

- **Smart Suggestions**: AI analyzes vitals, conditions, and goals to recommend foods
- **Safety Warnings**: Alerts about foods to avoid (allergies, health conditions)
- **One-Click Add**: Add suggested items directly to shopping list
- **Member-Specific**: Each family member gets personalized suggestions

## How to Use

### Step 1: Navigate to Member Shopping Page

Visit the shopping page for a specific family member:
```
/shopping?memberId=patient123
```

Or click "View Shopping List" from a patient's profile page.

### Step 2: View Health Suggestions

The **Health-Based Suggestions** card appears automatically below the purchase confirmation section.

You'll see:
- **Latest Vitals** (if available): Blood pressure, glucose, weight
- **Items to Avoid** (if applicable): Critical allergies, health warnings
- **Suggestion Categories**: Grouped by health benefit

### Step 3: Browse Suggestions

Click the category tabs to view different types of suggestions:
- 💓 **For Blood Pressure**: Low-sodium, potassium-rich foods
- 🩸 **For Blood Sugar**: Low-glycemic foods
- ❤️ **For Cholesterol**: Low-fat, high-fiber options
- ⚖️ **For Weight Loss**: High-protein, low-calorie items
- 🌾 **Gluten-Free**: Safe celiac options
- 👶 **For Growing Kids**: Calcium, vitamin D
- 🌱 **Plant-Based**: Vegetarian/vegan proteins

### Step 4: Add Items to Shopping List

Click the **[+]** button next to any suggestion to add it to the household shopping list.

The item is instantly added and the list refreshes.

### Step 5: Refresh Suggestions (Optional)

Click **Refresh** at the bottom of the suggestions card to reload based on the latest health data.

## What Triggers Suggestions?

### Health Vitals
- **High Blood Pressure** (>140/90): Low-sodium, potassium-rich foods
- **High Blood Glucose** (>180 mg/dL): Low-glycemic index foods
- **BMI Changes**: Weight management foods

### Medical Conditions
- **Diabetes**: Sugar-free, whole grains, lean proteins
- **Hypertension**: Low-sodium items
- **Celiac Disease**: Certified gluten-free products
- **Heart Disease**: Omega-3, low saturated fat
- **Anemia**: Iron-rich foods
- **High Cholesterol**: High-fiber, low-fat foods

### Dietary Preferences
- **Vegetarian**: Plant-based proteins (tofu, lentils)
- **Vegan**: Dairy alternatives, B12 sources
- **Keto**: Low-carb, high-fat foods
- **Paleo**: Unprocessed whole foods

### Health Goals
- **Weight Loss**: High-protein, low-calorie, satisfying foods
- **Weight Gain**: Calorie-dense, protein-rich foods
- **Muscle Building**: High-protein foods

### Age-Specific Needs
- **Children (< 18)**: Calcium, vitamin D, age-appropriate nutrition
- **Seniors (>= 65)**: Easy-to-digest, low-sodium, bone-healthy foods

## Understanding the Display

### Suggestion Card Format
```
Product Name                    [+ Add]
High in potassium, lowers BP
✓ Good for blood pressure
✓ High in potassium
Confidence: 95%
```

- **Product Name**: The food item being suggested
- **Reason Text**: Why this item is recommended
- **Benefits**: Key nutritional benefits (green tags)
- **Confidence**: AI confidence score (0-100%)
- **[+ Add] Button**: Add to shopping list

### Warning Card Format
```
⚠️ Items to Avoid
Processed meats: High in sodium, raises BP
```

- **Product Name**: Item to avoid
- **Reason**: Health risk explanation
- **Severity**: Critical (red), Warning (orange), Info (blue)

### Health Summary Format
```
Latest Vitals:
BP: 140/90 ⚠️  Glucose: 110 mg/dL  Weight: 180 lbs
```

- **BP**: Blood Pressure (⚠️ if abnormal)
- **Glucose**: Blood sugar (⚠️ if abnormal)
- **Weight**: Current weight

## Example Scenarios

### Scenario 1: Managing High Blood Pressure

**Patient Data**:
- Latest BP: 150/95 (abnormal)
- Condition: Hypertension

**Suggestions You'll See**:
- 💓 **For Blood Pressure** category
- **Bananas**: High in potassium, lowers BP
- **Spinach**: Rich in magnesium and potassium
- **Salmon**: Omega-3 fatty acids

**Warnings You'll See**:
- ⚠️ Avoid: Processed meats (high sodium)
- ⚠️ Avoid: Canned soups (very high sodium)

### Scenario 2: Managing Diabetes

**Patient Data**:
- Latest Glucose: 200 mg/dL (abnormal)
- Condition: Type 2 Diabetes

**Suggestions You'll See**:
- 🩸 **For Blood Sugar** category
- **Whole Grain Bread**: Low glycemic index
- **Chicken Breast**: High protein, low carbs
- **Broccoli**: Low-carb vegetable, high fiber

**Warnings You'll See**:
- ⚠️ Avoid: Sugary drinks (rapid blood sugar spike)
- ℹ️ Info: Choose whole grain instead of white bread

### Scenario 3: Child Nutrition

**Patient Data**:
- Age: 8 years old
- No specific conditions

**Suggestions You'll See**:
- 👶 **For Growing Kids** category
- **Milk**: Calcium and vitamin D for growing bones
- **Cheese**: Calcium for bone development
- **Oranges**: Vitamin C for immune support

### Scenario 4: Multiple Conditions

**Patient Data**:
- Condition: Diabetes + Hypertension
- Latest BP: 145/92
- Latest Glucose: 180 mg/dL

**Suggestions You'll See**:
- 💓 **For Blood Pressure**
- 🩸 **For Blood Sugar**
- Suggestions address BOTH conditions
- No conflicting recommendations

**Example**:
- **Spinach**: Lowers BP (magnesium, potassium) + Low-carb (blood sugar friendly)
- **Salmon**: Heart-healthy omega-3s + High protein (blood sugar stable)

## Tips & Best Practices

### 1. Keep Health Data Up-to-Date
- Log vitals regularly (especially BP and glucose)
- Update conditions and medications
- Set accurate health goals
- Suggestions improve with better data

### 2. Use Category Tabs
- Explore all categories
- Suggestions are grouped by primary benefit
- Some foods appear in multiple categories

### 3. Check Warnings First
- **Critical warnings** (allergies) are RED
- Always review "Items to Avoid" section
- Dismiss warnings only if you understand them

### 4. Refresh After Changes
- Click Refresh after logging new vitals
- Suggestions auto-refresh every 5 minutes
- Manual refresh clears cache immediately

### 5. Add Multiple Items
- Add all relevant suggestions
- Shopping list deduplicates automatically
- Items are shared across household

## Privacy & Data

- Health data is NOT shared with third parties
- Suggestions are generated client-side
- No PHI (Protected Health Information) in suggestion text
- Cache is cleared on page refresh
- Only household members can view suggestions

## Troubleshooting

### No Suggestions Appearing

**Possible Causes**:
1. Not viewing member-specific shopping page (`/shopping?memberId=...`)
2. Patient has no health data
3. Network error

**Solutions**:
1. Ensure you're on `/shopping?memberId=patient123`
2. Add health vitals, conditions, or goals
3. Check internet connection and retry

### Suggestions Not Relevant

**Possible Causes**:
1. Outdated health data
2. Missing condition information
3. Cache not refreshed

**Solutions**:
1. Log recent vitals
2. Update patient conditions and medications
3. Click "Refresh" button

### "Failed to load suggestions" Error

**Possible Causes**:
1. Patient not found
2. Network error
3. API timeout

**Solutions**:
1. Verify patient ID is correct
2. Check internet connection
3. Refresh the page and try again

### Items Already in List

**Behavior**:
- Clicking [+] on an existing item won't create duplicates
- Shopping system deduplicates by product name and barcode
- Quantities may be combined

## FAQ

**Q: Can I dismiss suggestions I don't want?**
A: Currently suggestions refresh based on health data. You can ignore items by not clicking [+]. Future versions will support dismissing specific suggestions.

**Q: How often do suggestions update?**
A: Automatically every 5 minutes. You can manually refresh anytime.

**Q: Can I see suggestions for multiple family members?**
A: Visit each member's shopping page separately: `/shopping?memberId=patient123`

**Q: What if I disagree with a suggestion?**
A: Suggestions are based on general health guidelines. Always consult your doctor for personalized medical advice. You're free to ignore any suggestion.

**Q: Are suggestions based on real medical research?**
A: Yes, suggestions follow evidence-based nutritional guidelines for common conditions like hypertension, diabetes, and celiac disease.

**Q: Will this replace my doctor's advice?**
A: **NO**. This tool provides general nutrition guidance. Always follow your doctor's specific dietary recommendations.

## Support

For issues or questions:
1. Check the [Full Documentation](./HEALTH_BASED_SHOPPING_SUGGESTIONS.md)
2. Review [Medical Records System](./MEDICAL_RECORDS_SYSTEM.md) for vital tracking
3. Contact support if problem persists

---

Last Updated: 2025-12-06
