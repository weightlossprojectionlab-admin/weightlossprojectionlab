# Product Requirements Document (PRD)
## Weight Loss Project Lab

**Version:** 1.6.1
**Last Updated:** October 22, 2025
**Author:** Product Team
**Status:** Active Development

---

## Executive Summary

### Product Vision
Weight Loss Project Lab is an AI-powered nutrition tracking application that simplifies meal logging through computer vision and intelligent automation. By leveraging Google's Gemini AI, we enable users to track their nutritional intake with minimal friction—just snap a photo and let AI do the analysis.

### Target Audience
- **Primary:** Health-conscious individuals (ages 25-45) actively managing their weight
- **Secondary:** Fitness enthusiasts tracking macronutrients for performance goals
- **Tertiary:** People with dietary restrictions needing accurate nutrition monitoring

### Key Success Metrics
- **User Engagement:** Daily active users logging ≥2 meals/day
- **AI Accuracy:** ≥85% confidence in calorie estimation
- **Retention:** 60%+ weekly retention rate
- **Performance:** <2s meal analysis response time
- **Data Quality:** ≥90% of logged meals include photo evidence

---

## Problem Statement

### Current Pain Points
1. **Manual Entry Friction:** Traditional calorie counting apps require tedious manual data entry
2. **Database Dependency:** Users must search through massive food databases to find matches
3. **Estimation Errors:** Users struggle to accurately estimate portion sizes
4. **Time Investment:** 5-10 minutes per meal entry discourages consistent tracking
5. **Context Loss:** Single-device tracking doesn't support users' multi-device lifestyles

### User Needs
- **Speed:** Log meals in <30 seconds
- **Accuracy:** Automated calorie and macro calculations
- **Convenience:** Mobile-first experience with photo capture
- **Intelligence:** AI-powered suggestions for healthier choices
- **Persistence:** Cross-device sync with real-time updates

---

## Product Overview

### Solution
A progressive web application that combines:
- **Computer Vision AI** for automatic meal recognition and nutritional analysis
- **Firebase Backend** for real-time data synchronization across devices
- **Smart Templates** for frequently eaten meals
- **Intelligent Suggestions** based on meal composition and timing

### Value Proposition
**"Snap. Analyze. Track. All in 30 seconds."**

Traditional meal tracking: 📸 → 🔍 Search → ⌨️ Manual Entry → 💾 Save (5-10 min)
Weight Loss Project Lab: 📸 → 🤖 AI Analysis → ✓ Confirm (30 sec)

### Competitive Advantages
1. **Zero Manual Entry:** AI analyzes photos automatically
2. **Contextual Intelligence:** Time-based meal type detection
3. **Real-Time Sync:** Firebase-powered cross-device updates
4. **Offline First:** Service workers enable offline logging
5. **Template System:** One-tap logging for repeated meals

---

## Features & Functionality

### 1. Meal Logging with AI Analysis

#### 1.1 Photo Capture
**User Story:** *As a user, I want to take a photo of my meal and have it analyzed automatically.*

**Functionality:**
- Native camera access via `capture="environment"`
- Image compression (< 1MB) before upload
- Preview confirmation before analysis
- Retake option available

**Technical Specs:**
- Image compression using `browser-image-compression` library
- Max input: 10MB, compressed to <1MB
- Supported formats: JPEG, PNG, WEBP
- Resolution: Auto-scaled to max 1920px

**AI Analysis Pipeline:**
```
Photo → Compression → Firebase Storage → Gemini Vision API → Structured JSON
```

**AI Response Structure:**
```json
{
  "foodItems": ["Grilled chicken breast (7 oz)", "Brown rice (1 cup)", ...],
  "estimatedCalories": 520,
  "macros": {
    "protein": 45,
    "carbs": 58,
    "fat": 12,
    "fiber": 4
  },
  "confidence": 85,
  "suggestions": [
    "Great protein source! Consider adding leafy greens for micronutrients.",
    "Balanced macros for post-workout recovery."
  ],
  "suggestedMealType": "lunch"
}
```

#### 1.2 Meal Type Detection
**User Story:** *As a user, I want the app to automatically suggest the correct meal type based on the time of day.*

**Functionality:**
- **Time-Based Auto-Selection:**
  - 5am-11am → Breakfast 🌅
  - 11am-3pm → Lunch ☀️
  - 3pm-9pm → Dinner 🌙
  - 9pm-5am → Snack 🍎

- **AI-Based Validation:**
  - Gemini analyzes food composition
  - Suggests alternative meal type if mismatch detected
  - User can accept or reject suggestion

**Business Rules:**
- Time-based selection runs on page load
- AI suggestion only shown if different from user's selection
- User's manual selection always takes precedence
- Meal type buttons disabled during AI analysis to prevent aborts

#### 1.3 Manual Entry
**User Story:** *As a user, I want to manually enter meal details when I can't take a photo.*

**Status:** ⚠️ Partially Implemented (UI only, save logic pending)

**Planned Functionality:**
- Free-text food items input
- Calorie counter (manual)
- Macro breakdown (protein, carbs, fat)
- Notes field

### 2. Meal Templates

#### 2.1 Save as Template
**User Story:** *As a user, I want to save frequently eaten meals as templates for quick logging.*

**Functionality:**
- Convert any AI-analyzed meal to a template
- User-defined template names
- Automatic capture of calories and macros
- Template usage tracking

#### 2.2 Use Template
**User Story:** *As a user, I want to log a meal with one tap using a saved template.*

**Functionality:**
- Browse saved templates
- See template metadata (calories, macros, usage count)
- One-tap to log from template
- Auto-increments usage count

#### 2.3 Template Management
- View all templates sorted by usage frequency
- Delete unused templates
- See "last used" timestamps

**Data Model:**
```typescript
interface MealTemplate {
  id: string
  userId: string
  name: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  foodItems: string[]
  calories: number
  macros: MacroNutrients
  notes?: string
  usageCount: number
  lastUsed?: Date
  createdAt: Date
}
```

### 3. Meal History & Management

#### 3.1 Real-Time Meal Feed
**User Story:** *As a user, I want to see my meal history update instantly across all my devices.*

**Functionality:**
- Firebase Firestore `onSnapshot` listener
- Real-time updates on save/edit/delete
- Limit: 30 most recent meals
- Photo thumbnails (16x16 grid)
- Expandable detail view

#### 3.2 Search & Filter
**User Story:** *As a user, I want to search my meal history by food items or meal type.*

**Functionality:**
- **Text Search:** Filter by food items or notes
- **Meal Type Filter:** Breakfast, Lunch, Dinner, Snack, All
- **Results Count:** Shows "X meals found"
- **Clear Filters:** Reset to full history

**Technical Implementation:**
- Firestore filtered queries for meal type
- Client-side filtering for text search (Firestore lacks full-text search)

#### 3.3 Edit Meal
**User Story:** *As a user, I want to edit meal details if the AI made a mistake.*

**Functionality:**
- Inline editing (no page navigation)
- Editable fields:
  - Meal type (breakfast/lunch/dinner/snack)
  - Notes
- Save/Cancel buttons
- Real-time sync on save

**Constraints:**
- Cannot edit AI-detected food items or macros
- Photo cannot be replaced (delete + re-log instead)

#### 3.4 Delete Operations

**Single Delete:**
- Confirmation modal
- Deletes Firestore document + Firebase Storage photo
- Real-time UI update via listener

**Batch Delete:**
- Multi-select mode toggle
- Checkbox selection UI
- Select All / Deselect All
- Bulk delete with progress indicator
- Confirmation: "Delete X meals?"
- Parallel deletion via `Promise.all()`

### 4. Daily Summary Dashboard

**User Story:** *As a user, I want to see my total calories and macros for today at a glance.*

**Functionality:**
- **Auto-calculated Totals:**
  - Total calories
  - Total protein (g)
  - Total carbs (g)
  - Total fat (g)
  - Meal count

**Display:**
- Gradient card (indigo to purple)
- 2x2 grid layout
- Only shown if ≥1 meal logged today
- Updates in real-time

**Calculation Logic:**
```typescript
const todaysMeals = mealHistory.filter(meal => {
  const mealDate = new Date(meal.loggedAt)
  const today = new Date()
  return mealDate.toDateString() === today.toDateString()
})

const summary = todaysMeals.reduce((acc, meal) => ({
  calories: acc.calories + (meal.totalCalories || 0),
  protein: acc.protein + (meal.macros?.protein || 0),
  carbs: acc.carbs + (meal.macros?.carbs || 0),
  fat: acc.fat + (meal.macros?.fat || 0),
  mealCount: acc.mealCount + 1
}), { calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 })
```

### 5. Data Export

#### 5.1 CSV Export
**User Story:** *As a user, I want to export my meal data to CSV for analysis in Excel.*

**Functionality:**
- Exports current filtered view
- Filename includes date: `meal-logs-2025-10-19.csv`
- Includes: Date, Time, Meal Type, Calories, Protein, Carbs, Fat, Fiber, Food Items

#### 5.2 PDF Export
**User Story:** *As a user, I want to export a formatted PDF report of my meals.*

**Functionality:**
- Professional formatting with header
- Includes user name
- Table view with all meal details
- Filename includes date: `meal-logs-2025-10-19.pdf`

**Technical:**
- Uses `jsPDF` and `jsPDF-AutoTable`
- Opens in new tab for print/download

### 6. User Experience Features

#### 6.1 Empty States
**Onboarding Experience:**

**No Meals Logged:**
- Large icon (🍽️) in circular background
- Heading: "No meals logged yet"
- Subtext: "Start tracking your nutrition journey..."
- 3 benefit bullets with icons
- Friendly, encouraging tone

**No Search Results:**
- Search icon (🔍)
- Heading: "No meals found"
- "Clear filters" button

#### 6.2 Loading States
**Meal Analysis:**
- Spinner with "Analyzing with AI..." overlay during analysis
- Spinner for meal history loading
- Loading toast for image compression

**Authentication Loading (Personalized Messages):**
**User Story:** *As a user, I want entertaining and personalized loading messages during authentication that make waiting feel less boring and more engaging.*

**Functionality:**
- Dynamic, rotating funny loading messages during Firebase Auth initialization
- Messages rotate every 3 seconds for continuous entertainment
- Zero cost implementation using pre-generated message library
- Personalized based on user journey status

**Message Categories (1,000+ messages total):**
1. **New Users** (onboarding not completed)
   - Examples: "Setting up your weight loss command center...", "Loading your transformation toolkit..."
   - Welcoming, encouraging tone for first-time visitors

2. **First-Timers** (just completed onboarding, low activity)
   - Examples: "Loading your fresh start...", "Day 1 energy initializing..."
   - Fresh start energy for newly onboarded users

3. **Streakers** (active streak > 0)
   - Examples: "Your {streak}-day streak is still alive...", "Day {streak} of being awesome..."
   - Celebrates consistency with dynamic streak count
   - Reinforces positive behavior and commitment

4. **Comeback Kids** (had streak, but it broke)
   - Examples: "Welcome back! The scale missed you...", "Comeback mode activated..."
   - Encouraging, non-judgmental tone for returning users
   - Emphasizes courage of returning after break

5. **Power Users** (high level/missions/activity)
   - Examples: "Loading your empire of progress...", "Champion mode activated..."
   - Celebrates achievement and elite status
   - Reinforces sense of accomplishment

6. **Weekend Warriors** (Saturday/Sunday)
   - Examples: "Weekend mode detected...", "Cheat day detector initializing..."
   - Playful acknowledgment of weekend challenges
   - Maintains accountability with humor

7. **Generic** (fallback hilarious messages)
   - Examples: "Hiding the scale...", "Googling 'does thinking burn calories?'...", "Calculating burpees per pizza slice..."
   - Relatable weight loss journey humor
   - Self-deprecating, honest about challenges
   - Makes users feel understood and not alone

**Technical Implementation:**
- **File:** `lib/auth-loading-messages.json` - 1,000 pre-written messages across 7 categories
- **Selector:** `lib/auth-message-selector.ts` - Smart category selection based on user data
- **Component:** `components/auth/AuthGuard.tsx` - Displays rotating messages during auth loading
- **Personalization Logic:**
  - Priority 1: New users → newUser category
  - Priority 2: Power users (level ≥5, missions ≥10, logs ≥50) → powerUser category
  - Priority 3: Active streakers (currentStreak > 0) → streaker category (with dynamic {streak} replacement)
  - Priority 4: Comeback kids (longestStreak > 0, currentStreak = 0) → comebackKid category
  - Priority 5: First-timers (onboarding done, low activity) → firstTimer category
  - Priority 6: Weekend (Sat/Sun) → weekendWarrior category
  - Default: generic category
- **Message Rotation:** Auto-rotates every 3 seconds while loading (similar to Claude AI)
- **Cost:** $0 (no API calls, pre-generated content)
- **User Data Used:** `onboardingCompleted`, `currentStreak`, `longestStreak`, `level`, `missionsCompleted`, `weightLogsCount`, `mealLogsCount`

**Benefits:**
- **Engagement:** Transforms boring wait time into entertaining experience
- **Personalization:** Makes users feel understood and recognized for their journey
- **Retention:** Humor and relatability build emotional connection with app
- **Delight:** Unexpected personality adds memorable brand differentiation
- **Motivation:** Streak reinforcement and comeback encouragement drive continued use
- **No Cost:** Zero API costs, instant performance

#### 6.3 Error Handling
- Toast notifications for all errors
- Fallback to manual entry if AI fails
- Retry options
- Graceful degradation (save meal even if photo upload fails)

### 7. Onboarding Experience

**User Story:** *As a new user, I want a guided setup experience to personalize my health tracking journey.*

#### 7.1 User Profile Setup (Step 1)
**Functionality:**
- **Birthday Input:** Month/Day/Year dropdowns for easy date selection
  - Eliminates tedious calendar scrolling
  - Smart day validation (February = 28/29 days, accounts for leap years)
  - COPPA compliance (minimum age 13)
  - Age range: 13-120 years
  - Automatic age calculation displayed below inputs
  - Privacy notice explaining data usage

- **Gender Selection:** Inclusive options with emoji icons
  - Male 👨
  - Female 👩
  - Other 🧑
  - Prefer not to say 😊

- **Measurement Units:** Imperial or Metric
  - Imperial: lbs, feet/inches
  - Metric: kg, centimeters

- **Height Input:** Split inputs for better UX
  - **Imperial:** Two side-by-side inputs
    - Feet (3-8 range)
    - Inches (0-11 range)
    - Example: `[5] ft [10] in`
    - Auto-converts to total inches for storage
  - **Metric:** Single centimeters input
    - Range: 90-240 cm
    - Example: `[173] cm`

**Age-Based Features:**
- Age-appropriate health warnings
- Safe calorie range calculations
- Personalized recommendations

#### 7.2 Current State Assessment (Step 2)
**Functionality:**
- Current weight input
- Activity level selection (5 levels):
  - Sedentary 🛋️ - Little to no exercise
  - Lightly Active 🚶 - 1-3 days/week
  - Moderately Active 🏃 - 3-5 days/week
  - Very Active 🏋️ - 6-7 days/week
  - Extremely Active 🏅 - Athlete level

#### 7.3 Goal Setting (Step 3)
**Functionality:**
- **Primary Goal Selection:**
  - Lose Weight 📉
  - Maintain Weight ⚖️
  - Gain Muscle 💪
  - Get Healthier ❤️

- **Target Weight:** Numeric input with unit display
- **Weekly Weight Loss Goal:** Slider (0.5-2 lbs/week)
- **Weight Loss Projection Card:**
  - Estimated time to goal (weeks/months)
  - Target date calculation
  - Total weight to lose display

#### 7.4 Daily Targets (Step 4)
**Functionality:**
- **Daily Calorie Goal:** Calculated from BMR, TDEE, and weight loss goal
  - Age-appropriate safety limits applied
  - Warning toasts if adjusted for safety
  - User can manually adjust within safe range

- **Daily Steps Goal:** Default 10,000 steps
- **Macro Distribution:** Auto-calculated based on goal type
  - Protein (grams)
  - Carbs (grams)
  - Fat (grams)

**Calculation Logic:**
1. Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor equation
2. Calculate TDEE (Total Daily Energy Expenditure) based on activity level
3. Adjust for weight loss goal (500 cal deficit per pound/week)
4. Apply age-appropriate safety limits
5. Calculate macro targets based on goal type

#### 7.5 Preferences (Step 5)
**Functionality:**
- **Dietary Preferences:** Multi-select checkboxes
  - Vegan, Vegetarian, Keto, Paleo, Gluten-Free, Dairy-Free, Low-Carb, Mediterranean

- **Food Allergies:** Multi-select with warning styling
  - Peanuts, Tree Nuts, Dairy, Eggs, Shellfish, Soy, Wheat/Gluten, Fish

- **Health Conditions:** Free-text textarea
  - Comma-separated list
  - Used for safer AI recommendations

#### 7.6 Notifications & Reminders (Step 6)
**Functionality:**
- **Enable Notifications:** Toggle switch
- **Meal Reminder Times:** Time pickers (conditional on notifications enabled)
  - Breakfast 🌅 - Default: 8:00 AM
  - Lunch ☀️ - Default: 12:00 PM
  - Dinner 🌙 - Default: 6:00 PM

- **Weight Check-in Frequency:**
  - Daily 📅
  - Weekly 📊 (recommended)
  - Bi-weekly 🗓️
  - Monthly 📆

- **Completion Card:** Success message and CTA

**Design System Integration:**
- All inputs use semantic CSS classes (`.form-input`, `.btn`, `.card`)
- Color variables adapt to light/dark mode preferences
- Consistent button styles (`.btn-primary`, `.btn-success`, `.btn-outline`)
- Progress bar with percentage display

**Data Persistence:**
- All onboarding data saved to Firestore user profile
- `onboardingCompleted: true` flag set on completion
- Dashboard checks for completion and redirects if needed

### 8. Automatic Step Tracking

**User Story:** *As a user, I want my steps counted automatically in the background without manual entry.*

#### 8.1 Step Tracking Architecture
**Philosophy:** Manual step entry is impractical - users cannot accurately track steps throughout the day. Step tracking must be fully automatic using device motion sensors.

**Implementation:**
- **Global Context Provider:** `StepTrackingProvider` wraps entire app
- **Sensor Integration:** Uses device accelerometer/pedometer via `useStepCounter` hook
- **Background Tracking:** Counts steps continuously when enabled
- **Auto-Save Mechanisms:**
  - Saves to Firebase at midnight (checks every 60s)
  - Saves before page unload
  - User can manually save anytime

**Technical Flow:**
```
Device Motion Sensor
  ↓
useStepCounter hook (sensor logic)
  ↓
StepTrackingProvider (app-wide state)
  ↓
useStepTracking() hook (components consume)
  ↓
Firebase stepLogs collection (persistence)
```

#### 8.2 User Enabling/Disabling
**Locations:**
1. **Settings Page:** Toggle switch in "App Settings" section
2. **Log Steps Page:** Primary enable/disable button
3. **Dashboard:** Prompt card when disabled

**UX Features:**
- One-time enable: tracking runs continuously in background
- Clear visual feedback: pulsing green dot when active
- Live step count displayed on dashboard and log-steps page
- Preference saved to localStorage (future: Firebase user profile)

#### 8.3 Real-Time Activity Feed
**User Story:** *As a user, I want to check my step history like a social media feed to stay motivated.*

**Functionality:**
- **Recent Activity Section:** Shows last 7 days of step logs
- **Smart Date Formatting:** "Today", "Yesterday", "X days ago"
- **Goal Progress:** Color-coded percentage
  - Green: 100%+ (goal reached ✓)
  - Blue: 75-99% (close to goal)
  - Orange: Below 75%
- **Loading & Empty States:** Spinner while fetching, helpful prompts if no data
- **Real-Time Updates:** Fetches from Firebase `stepLogs` collection

**Engagement Strategy:**
Users frequently check the activity feed like social media/email to see progress accumulate throughout the day. This creates habit-forming engagement.

#### 8.4 Dashboard Integration
**Display:**
- **Activity Card:** Shows today's real-time step count
- **Live Indicator:** Pulsing green dot when tracking active
- **Progress Bar:** Visual representation of goal progress
- **Conditional CTA:**
  - If disabled: Blue prompt box with "Enable tracking →"
  - If enabled: "View step details →" link

**Design Decisions:**
- Removed "Log Steps" quick action button (redundant with Activity card)
- Removed duplicate links when tracking disabled
- Single source of truth for step tracking access

#### 8.5 Data Model
```typescript
interface StepLog {
  id: string
  userId: string
  steps: number
  date: string // YYYY-MM-DD format
  source: 'device' | 'sensor' | 'manual' | 'healthkit' | 'googlefit'
  loggedAt: Timestamp
  goal?: number
  notes?: string
}
```

**Firestore Location:**
```
users/{userId}/stepLogs/{stepLogId}
```

#### 8.6 Manual Entry Removed
**Decision:** Manual step entry completely removed from log-steps page.

**Rationale:**
- Impossible for users to accurately count steps throughout the day
- Manual entry would just be guesses/estimates
- Defeats the purpose of automatic tracking
- Creates confusion and bad data quality

**Result:** Log-steps page is 100% focused on automatic tracking with enable/disable controls.

### 9. Recipe Cooking Mode

**User Story:** *As a user, I want to cook recipes from meal suggestions with guided step-by-step instructions, automatic timers, and seamless meal logging when I'm done.*

#### 9.1 Problem Statement

Recipe suggestions are only useful if users actually cook them. Traditional recipe apps have several pain points:
- Users need to manually scale recipes for different serving sizes
- Ingredients don't account for dietary restrictions or allergies
- Users struggle to track cooking steps and timers while cooking
- After cooking, users still need to manually log the meal with AI (inaccurate)
- No connection between recipe browsing and actual meal tracking

#### 9.2 Solution Overview

A comprehensive recipe cooking system that:
1. **Personalizes recipes** based on onboarding preferences (dietary restrictions, allergies)
2. **Scales recipes** automatically for any serving size (1-8 servings)
3. **Suggests ingredient substitutions** filtered by user preferences
4. **Guides cooking** with step-by-step instructions and automatic timers
5. **Integrates with meal logging** for exact nutrition tracking (no AI guessing)

#### 9.3 Recipe Scaling & Personalization

**User Story:** *As a user, I want to adjust recipe serving sizes and see all ingredients automatically recalculated.*

**Functionality:**
- **Serving Size Adjuster:** Buttons to increase/decrease servings (1-8 range)
- **Real-Time Recalculation:** All ingredients, macros, and calories scale automatically
- **Fraction Handling:** Intelligent conversion of measurements
  - "1/2 cup" → "1 cup" when doubled
  - "1 1/2 cups" → "3 cups" when doubled
  - Decimal to fraction display ("0.75 cups" → "3/4 cup")
- **Prep Time Scaling:** Logarithmic scaling (2x servings ≈ 1.3x time)
- **Reset Option:** Return to original serving size

**Technical Implementation:**
- **Ingredient Parser:** Regex-based parsing to extract quantities, units, and ingredient names
- **Recipe Scaler:** Mathematical scaling with fraction conversions
- **Supported Units:** 30+ cooking units (cups, tbsp, tsp, oz, lbs, grams, ml, etc.)
- **Memoization:** React useMemo for performance optimization

**Code Files:**
- `lib/ingredient-parser.ts` - Parse ingredient strings, handle fractions
- `lib/recipe-scaler.ts` - Scale entire recipes including macros and prep time

#### 9.4 Ingredient Substitutions

**User Story:** *As a user, I want ingredient substitution suggestions that respect my dietary preferences and allergies.*

**Functionality:**
- **300+ Substitution Database:** Comprehensive ingredient alternatives
  - Dairy (milk, yogurt, cheese, butter)
  - Protein (chicken, eggs, beef, salmon)
  - Grains (rice, pasta, bread, oats)
  - Sweeteners (sugar, honey)
  - Nuts/Seeds, Vegetables, Oils/Fats

- **Smart Filtering:**
  - **Allergen Exclusion:** Never show substitutions containing user's allergens
  - **Dietary Preference Matching:** Prioritize substitutions matching user preferences
  - **Fallback:** Show top 3 alternatives even if no preference match

- **Substitution Display:**
  - Expandable ingredient cards
  - Shows ratio (e.g., "1:1", "1.5:1")
  - Displays dietary tags (vegan, keto, gluten-free, etc.)
  - Shows allergen warnings
  - Includes preparation notes

- **Ingredient Swapping:**
  - One-tap "Swap" button per substitution
  - Preserves original quantity (e.g., "2 cups milk" → "2 cups almond milk")
  - Visual indication of swapped ingredients
  - Undo swap option

**Example Substitution:**
```json
{
  "ingredient": "Milk",
  "substitutes": [
    {
      "name": "Almond milk",
      "ratio": "1:1",
      "dietaryTags": ["vegan", "dairy-free", "paleo"],
      "allergens": ["nuts"],
      "notes": "Lower in protein than cow's milk"
    }
  ]
}
```

**Code Files:**
- `lib/ingredient-substitutions.ts` - Substitution database and filtering logic
- `components/ui/RecipeModal.tsx` - Substitution UI and swap functionality

#### 9.5 Ingredient Checklist & Shopping List

**User Story:** *As a user, I want to check off ingredients I already have and see a shopping list for what's missing.*

**Functionality:**
- **Ingredient Checkboxes:** Mark "I have this ingredient"
- **Bulk Actions:**
  - "I have all" button (checks all ingredients)
  - "Clear all" button (unchecks all)
- **Shopping List:** Auto-generated from unchecked ingredients
  - Only shows items user doesn't have
  - Updates in real-time as ingredients are checked
  - Expandable/collapsible section
- **Celebration Screen:** When all ingredients checked, show success message

**User Experience:**
- Green checkmark animation when checking ingredients
- Shopping list badge shows count of missing items
- Empty state when all ingredients available

#### 9.6 Recipe Queue System

**User Story:** *As a user, I want to save recipes to cook later without starting immediately.*

**Functionality:**
- **Add to Queue:** Save recipe with serving size and meal type
- **Queue Widget:** Dashboard card showing queued recipes
  - Recipe name, servings, prep time, calories
  - "Start Cooking" button per recipe
  - Remove from queue option
  - Auto-hides when queue empty
- **Planned For:** Optional date/time for meal planning (future enhancement)

**Data Model:**
```typescript
interface QueuedRecipe {
  id: string
  userId: string
  recipeId: string
  recipeName: string
  servingSize: number
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  plannedFor?: Date
  addedAt: Date
}
```

**Firestore Location:**
```
users/{userId}/recipeQueue/{queueId}
```

#### 9.7 Guided Cooking Session

**User Story:** *As a user, I want step-by-step cooking guidance with automatic timers so I don't have to keep checking the recipe.*

**Functionality:**

**Session Start:**
- Two options: "Cook Now" or "Add to Queue"
- Cook Now: Immediately starts cooking session
- Add to Queue: Saves for later

**Cooking Interface:**
- **Progress Bar:** Shows overall completion (e.g., "Step 3 of 8")
- **Current Step Display:** Large, readable text with current instruction
- **Timer Integration:**
  - Auto-extracted from step text (e.g., "cook for 5 minutes")
  - Countdown timer with start/pause/reset controls
  - Progress bar with color coding (green → orange → red)
  - Quick add time buttons (+30s, +1m, +2m, +5m)

- **Navigation Controls:**
  - Previous Step (only if not on first step)
  - Next Step / Complete Step
  - Pause Session (saves progress)
  - Abandon Session (with confirmation)

**Sidebar Information:**
- **Recipe Details:** Name, servings, total time, calories
- **Ingredients Checklist:** Scaled ingredients for selected serving size
- **Nutrition Summary:** Total calories and macros

**Timer Extraction:**
- Regex patterns detect time mentions in recipe text
- Handles formats:
  - "5 minutes" → 300 seconds
  - "25-30 minutes" → 1650 seconds (uses average)
  - "1 hour 30 minutes" → 5400 seconds
  - "2-3 hours" → 9000 seconds
- Abbreviations supported: min, mins, sec, hr, hrs

**Notifications:**
- Browser notification when timer completes
- Audio alert option (beep sound)
- Notification permission requested on first timer
- Visual alert if notifications denied

**Code Files:**
- `lib/recipe-timer-parser.ts` - Extract timers from step text
- `components/ui/CookingTimer.tsx` - Timer component with notifications
- `app/cooking/[sessionId]/page.tsx` - Full cooking session interface

#### 9.8 Cooking Session State Management

**Data Model:**
```typescript
interface StepTimer {
  stepIndex: number
  stepText: string
  duration: number | null // seconds, null if no timer
  startedAt?: Date
  completedAt?: Date
  status: 'pending' | 'active' | 'completed' | 'skipped'
}

interface CookingSession {
  id: string
  userId: string
  recipeId: string
  recipeName: string
  servingSize: number
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  currentStep: number
  totalSteps: number
  stepTimers: StepTimer[]
  startedAt: Date
  pausedAt?: Date
  completedAt?: Date
  status: 'in-progress' | 'paused' | 'completed' | 'abandoned'
  scaledCalories: number
  scaledMacros: {
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  scaledIngredients: string[]
}
```

**Firestore Location:**
```
users/{userId}/cookingSessions/{sessionId}
```

**State Persistence:**
- Auto-saves on every step change
- Resume capability if user navigates away
- Session history for debugging/analytics

#### 9.9 Completion & Meal Logging Integration

**User Story:** *As a user, I want to automatically log my cooked meal with exact recipe nutrition instead of using AI.*

**Functionality:**

**Completion Flow:**
1. User completes final cooking step
2. Completion modal appears:
   - "Great job! Your [Recipe Name] is ready!"
   - Photo prompt: "Take a photo of your creation"
   - "Log This Meal" button
3. User redirected to log-meal page with:
   - Query params: `?fromRecipe=true&sessionId=XXX&recipeId=XXX&servings=2`
   - Pre-filled nutrition data from recipe (not AI)
   - Photo upload optional but encouraged
   - 100% accuracy guarantee

**Meal Logging Pre-fill:**
```typescript
const analysis: AIAnalysis = {
  foodItems: session.scaledIngredients.map(ing => ({
    name: ing,
    quantity: 'As per recipe',
    calories: 0 // distributed across total
  })),
  totalCalories: session.scaledCalories,
  totalMacros: session.scaledMacros,
  confidence: 100, // Recipe-based = 100% accurate
  suggestions: [`Cooked from recipe: ${recipe.name}`],
  isMockData: false,
  usdaValidation: ['Recipe-based nutrition data']
}
```

**Benefits:**
- **Accuracy:** Exact recipe nutrition (no AI estimation errors)
- **Speed:** Pre-filled data = faster logging
- **Photo Evidence:** Encourages documentation
- **Tracking:** Links meal log to cooking session for analytics

#### 9.10 User Experience Enhancements

**Loading States:**
- Spinner when starting cooking session
- Spinner in queue widget when starting recipe
- "Starting..." text during session creation

**Empty States:**
- Recipe queue widget auto-hides when empty
- No cluttered UI when not using feature

**Error Handling:**
- Toast if recipe has no cooking steps
- Toast if session creation fails
- Graceful handling of missing recipe data

**Mobile Optimization:**
- Large touch targets for cooking controls
- Fixed header with progress bar
- Scrollable step content
- Sticky navigation controls

#### 9.11 Technical Implementation

**Firebase Operations:**
```typescript
// Cooking session operations
cookingSessionOperations.createCookingSession(data)
cookingSessionOperations.getActiveCookingSession()
cookingSessionOperations.getCookingSession(sessionId)
cookingSessionOperations.updateCookingSession(sessionId, updates)
cookingSessionOperations.deleteCookingSession(sessionId)

// Recipe queue operations
recipeQueueOperations.addToQueue(data)
recipeQueueOperations.getQueue()
recipeQueueOperations.removeFromQueue(queueId)
```

**Key Files:**
- `types/index.ts` - TypeScript interfaces for CookingSession, QueuedRecipe, StepTimer
- `lib/firebase-operations.ts` - Firestore operations for sessions and queue
- `lib/recipe-timer-parser.ts` - Timer extraction from recipe text
- `lib/ingredient-parser.ts` - Ingredient quantity/unit parsing
- `lib/recipe-scaler.ts` - Recipe scaling logic
- `lib/ingredient-substitutions.ts` - 300+ substitution database
- `components/ui/RecipeModal.tsx` - Recipe display with scaling and substitutions
- `components/ui/RecipeQueue.tsx` - Dashboard queue widget
- `components/ui/CookingTimer.tsx` - Interactive countdown timer
- `app/cooking/[sessionId]/page.tsx` - Cooking session page
- `app/log-meal/page.tsx` - Integration with meal logging
- `app/dashboard/page.tsx` - Queue widget integration

**Performance Considerations:**
- React useMemo for scaled recipe calculations
- Efficient Firestore queries with proper indexing
- Client-side timer to avoid unnecessary API calls
- Lazy loading of cooking session page

#### 9.12 Success Metrics

**Engagement:**
- % of users who try at least one recipe
- Average recipes cooked per week
- Completion rate (started → completed)
- Queue usage (recipes saved vs cooked)

**Accuracy:**
- % of recipe-based meals vs AI-analyzed meals
- User feedback on nutrition accuracy

**Retention:**
- Weekly retention for users who cook recipes
- Repeat recipe cooking rate
- Template creation from recipe-based meals

**User Satisfaction:**
- Survey: "How helpful is guided cooking mode?" (1-5 scale)
- Net Promoter Score for recipe feature

### 10. Marketing Template System for Recipe Sharing

**User Story:** *As a user, I want to share my recipes on social media with professional, eye-catching images that showcase the meal and drive engagement.*

#### 10.1 Problem Statement

Traditional recipe sharing has limited viral potential:
- Generic share images don't stand out in social feeds
- No brand consistency across shared content
- Users can't customize design for different platforms
- Missing marketing elements (CTAs, badges, branding)
- One-size-fits-all approach doesn't match user personality or platform requirements

#### 10.2 Solution Overview

A multi-template image generation system that creates marketing-grade share images with:
1. **Multiple Design Styles** tailored to different audiences and use cases
2. **Visual Effects Library** (gradients, shadows, badges) for professional polish
3. **Aspect Ratio Support** optimized for each social platform
4. **Auto-Personalization** with dietary badges and meal-type specific styling
5. **Zero Dependencies** using native Canvas API (no external image generation costs)

#### 10.3 Template Styles

**User Story:** *As a user, I want to choose a design style that matches my personality and target audience.*

**Available Templates (Phase 1):**

**1. Minimalist Modern (✨)**
- **Audience:** Professional users, health coaches, clean aesthetics
- **Style:** Soft gradients, subtle shadows, white cards
- **Colors:** Pastel blues, greens, purples based on meal type
- **Typography:** Clean sans-serif with generous whitespace
- **Best For:** Instagram Feed posts, LinkedIn shares

**2. Bold & Vibrant (🔥)**
- **Audience:** Gen Z, fitness enthusiasts, trending content
- **Style:** High-contrast gradients, vibrant colors, emojis
- **Colors:** Sunset fire, neon lime, pink burst, ocean blast
- **Typography:** Bold uppercase text with colored shadows
- **Visual Elements:** Starbursts, decorative patterns
- **Best For:** Instagram/Facebook Stories, viral content

**3. Elegant Dark (💎)**
- **Audience:** Premium users, evening meals, luxury aesthetic
- **Style:** Dark gradients with gold accents, glowing effects
- **Colors:** Midnight tones, gold highlights, dark emerald
- **Typography:** Large serif-style text with subtle glow
- **Visual Elements:** Decorative lines, noise texture overlay
- **Best For:** Pinterest, premium meal plans, evening recipes

**Planned Templates (Phase 2):**
- **Photo Overlay (📸):** Real food photography from Unsplash API with text overlays
- **Infographic (📊):** Data visualization style with macro breakdowns and charts

**Template Selection UX:**
- Icon-based selector with emoji indicators
- Description and recommended use cases for each
- Selected template persists during session
- Visual checkmark on active selection

#### 10.4 Visual Effects Library

**User Story:** *As a developer, I want reusable visual effects to maintain consistency and speed up template creation.*

**Gradients (12+ Presets):**
- **Linear Gradients:** Top-to-bottom, diagonal flows
- **Radial Gradients:** Spotlight effects from center
- **Conic Gradients:** Rainbow spin effects
- **Meal-Type Adaptive:** Automatically selects gradient based on meal type
  - Breakfast → Soft blue, Sunset fire, Midnight gold
  - Lunch → Soft green, Neon lime, Dark emerald
  - Dinner/Snack → Soft purple, Ocean blast, Royal purple

**Shadows (10+ Styles):**
- **Subtle:** Soft, soft-lg (minimalist designs)
- **Medium:** Medium, medium-lg (cards and elements)
- **Strong:** Strong, strong-lg (bold designs)
- **Colored:** Purple, blue, pink, green (vibrant designs)
- **Specialty:** Text shadows, inner glow, neon effects

**Badges (8+ Types):**
- **Auto-Recommended Based on Recipe:**
  - Quick Prep (⚡) - prep time < 15 min
  - High Protein (💪) - protein > 30g
  - Low Calorie (✨) - calories < 300
  - Vegan (🌱), Keto (🥑) - dietary tags
- **Manual Options:** Trending (🔥), Popular (⭐), New (✨)
- **Styles:** Pill, rounded-square, circle, ribbon
- **Positions:** Top-left, top-right, bottom-left, bottom-right

**Code Files:**
- `lib/recipe-effects/gradients.ts` - Gradient presets and application
- `lib/recipe-effects/shadows.ts` - Shadow effects with utilities
- `lib/recipe-effects/badges.ts` - Badge overlays with auto-selection
- `lib/recipe-effects/canvas-utils.ts` - Shared utilities (roundRect, wrapText)

#### 10.5 Aspect Ratio Optimization

**User Story:** *As a user, I want images formatted perfectly for each social media platform.*

**Supported Ratios:**
- **Square (1:1)** - 1080x1080px - Instagram Feed, Facebook, LinkedIn
- **Story (9:16)** - 1080x1920px - Instagram/Facebook Stories, Snapchat
- **Landscape (3:2)** - 1080x720px - Twitter, Facebook posts, blog headers

**User Flow:**
1. Click "Share" button on recipe
2. Select template style (Minimalist, Bold, Elegant Dark)
3. Choose aspect ratio for target platform
4. Image generates instantly

**Technical Implementation:**
- Canvas dimensions set before rendering
- Templates adapt layout for each ratio
- Text wrapping and spacing adjust automatically
- All templates support all aspect ratios

#### 10.6 Share Flow Integration

**Mobile (Preferred):**
1. User selects template and aspect ratio
2. Image generated via Canvas API (client-side, instant)
3. Web Share API opens native share sheet
4. Image automatically attached to share
5. User chooses platform (Instagram, Facebook, Messages, etc.)
6. Caption pre-filled with viral hooks and hashtags

**Desktop (Fallback):**
1. User selects template and aspect ratio
2. Image downloads automatically
3. Share URL copied to clipboard
4. Platform menu appears (Facebook, Twitter, Pinterest, WhatsApp)
5. User clicks platform → opens in new tab
6. User manually uploads downloaded image

**Viral Caption Generation:**
- Randomized viral hooks from `lib/viral-hooks.json`
- Examples: "POV: you found the app that made healthy eating effortless"
- Recipe details (name, calories, protein, prep time)
- Dietary tags (#Vegan #GlutenFree)
- CTA: "Get this recipe and 200+ more with AI-powered meal tracking"
- Branded hashtags: #HealthyRecipes #MealPrep #FitnessFood

#### 10.7 Technical Architecture

**Template System:**
```typescript
// Template registry with metadata
export const TEMPLATE_CONFIGS: Record<TemplateStyle, TemplateConfig> = {
  'minimalist': {
    style: 'minimalist',
    name: 'Minimalist Modern',
    description: 'Clean and professional design',
    icon: '✨',
    recommendedFor: ['professional', 'clean', 'simple recipes']
  },
  // ... other templates
}

// Template renderer interface
export interface TemplateRenderContext {
  ctx: CanvasRenderingContext2D
  canvas: HTMLCanvasElement
  recipe: MealSuggestion
  width: number
  height: number
  aspectRatio: AspectRatio
}

// Main render dispatcher with error handling
export const renderTemplate = (
  style: TemplateStyle,
  context: TemplateRenderContext
): void => {
  try {
    switch (style) {
      case 'minimalist': renderMinimalistTemplate(context); break
      case 'bold-vibrant': renderBoldVibrantTemplate(context); break
      case 'elegant-dark': renderElegantDarkTemplate(context); break
      default: throw new Error('Template not implemented')
    }
  } catch (error) {
    // Fallback to minimalist on any error
    renderMinimalistTemplate(context)
  }
}
```

**Image Generation Pipeline:**
```
User clicks "Share"
  ↓
Select Template Style (minimalist/bold/elegant)
  ↓
Select Aspect Ratio (1:1/9:16/3:2)
  ↓
Create Canvas Element (client-side)
  ↓
Set Canvas Dimensions (1080xH based on ratio)
  ↓
Render Template (gradients, text, badges, shadows)
  ↓
Convert Canvas → PNG Blob
  ↓
[MOBILE] Web Share API with file attachment
[DESKTOP] Download file + platform menu
```

**Key Files:**
- `lib/recipe-templates/index.ts` - Template registry and dispatcher
- `lib/recipe-templates/minimalist.ts` - Minimalist template renderer
- `lib/recipe-templates/bold-vibrant.ts` - Bold vibrant template renderer
- `lib/recipe-templates/elegant-dark.ts` - Elegant dark template renderer
- `lib/recipe-effects/` - Reusable visual effects library
- `lib/recipe-share-utils.ts` - Share utilities and Web Share API integration
- `components/ui/RecipeModal.tsx` - Template selector UI

**Performance:**
- Client-side Canvas rendering (no server calls)
- Instant image generation (<500ms)
- No external dependencies or API costs
- Cached template selection during session

#### 10.8 Marketing Benefits

**For Users:**
- Professional-looking share images (no design skills required)
- Platform-optimized formats (no manual cropping)
- Personality expression via template styles
- Faster sharing workflow

**For Product:**
- **Viral Growth:** Eye-catching images drive shares and clicks
- **Brand Awareness:** "Weight Loss Project Lab" branding on every share
- **Social Proof:** Recipe URL in every share drives traffic to app
- **Zero Cost:** No image generation API fees (Canvas is native)
- **SEO:** Backlinks from social shares boost search rankings

**Engagement Metrics:**
- Shares per recipe (target: 15%+ share rate)
- Click-through rate from shared images (target: 5%+)
- New user signups from shared links (target: 10%+ of shares)
- Template selection distribution (monitor A/B performance)

#### 10.9 Code Review Findings & Fixes

**Issues Identified:**
1. ✅ **FIXED:** Code duplication - `roundRect()` and `wrapText()` extracted to `canvas-utils.ts`
2. ✅ **FIXED:** Dynamic imports - Replaced `require()` with static ES6 imports
3. ✅ **FIXED:** Error handling - Added try-catch with fallback to minimalist template
4. ⚠️ **TODO:** Add loading state during image generation
5. ⚠️ **TODO:** Add ARIA labels to template selector buttons
6. ⚠️ **TODO:** Generate alt text for share images (accessibility)

**Architecture Strengths:**
- Clean separation of concerns (templates, effects, share logic)
- Strategy pattern for template selection
- Comprehensive TypeScript typing
- Modular effects library (gradients, shadows, badges)
- Extensible template registry

#### 10.10 Future Enhancements (Phase 2)

**Photo Overlay Template:**
- Integration with Unsplash API for food photography backgrounds
- Text overlay engine for readable captions over images
- Blur/darken effects for text legibility

**Infographic Template:**
- Macro distribution pie charts
- Nutrition comparison bars
- Cooking time timeline visualization

**Advanced Features:**
- Custom font loading via Google Fonts CDN
- QR code generation linking to recipe page
- A/B testing analytics for template performance
- AI-generated food images (DALL-E integration)
- Video/GIF generation for animated stories
- Template preview thumbnails before selection

### 11. Agent Architecture & Future Vision

**User Story:** *As a product team, we want a clear architecture for autonomous agents and background services to enable intelligent, proactive user experiences at scale.*

#### 11.1 Architecture Overview

Weight Loss Project Lab employs a **multi-agent system architecture** where specialized agents handle specific domains autonomously. This enables:
- **Scalability:** Agents run independently without bottlenecking main app
- **Maintainability:** Each agent has clear boundaries and responsibilities
- **Intelligence:** Agents learn and adapt to user behavior over time
- **Proactivity:** Background services engage users without manual triggers

#### 11.2 Development Agents (Team Roles)

These represent **development team roles**, not AI agents:

- **Frontend Agent:** UI/UX implementation, React components, Next.js pages
- **Backend Agent:** API development, Firebase operations, server logic
- **AI Agent:** Gemini integration, prompt engineering, ML model tuning
- **QA Agent:** Testing, bug triage, quality assurance

**Status:** ✅ Active (standard development workflow)

#### 11.3 Backend Autonomous Agents (Planned - Phase 3)

**User Story:** *As a user, I want the app to proactively help me stay on track with personalized coaching, reminders, and motivation.*

**1. AI Coach**
- **Purpose:** Personalized nutrition coaching and advice
- **Functionality:**
  - Chatbot interface for nutrition questions
  - Analyzes meal patterns and suggests improvements
  - Provides recipe recommendations based on goals
  - Answers dietary questions in real-time
- **Technology:** LLM integration (Gemini, GPT-4)
- **Triggers:** User question, meal analysis completion, weekly review
- **Status:** 🔵 Planned (Phase 3)

**2. Nudge Delivery System** ✅
- **Purpose:** Behavioral prompts and reminders
- **Functionality:**
  - Push notifications based on user behavior patterns
  - Meal logging reminders (if user missed breakfast/lunch/dinner)
  - Encouragement messages for streaks and milestones
  - Re-engagement prompts for inactive users (24+ hours)
  - Quiet hours support (10pm-7am, no notifications)
  - Granular notification preferences (per-category toggles)
- **Technology:** Firebase Cloud Messaging, Service Worker Push API
- **Implementation:**
  - `lib/nudge-system.ts` - Notification trigger logic and scheduling
  - `hooks/useNotifications.ts` - Permission management & FCM token handling
  - `components/ui/NotificationPrompt.tsx` - Permission prompt & settings UI
  - `public/sw.js` - Push event handlers and notification clicks
  - Firestore collections: notification_tokens, scheduled_nudges
- **Triggers:**
  - Time-based: Meal reminders (9am breakfast, 1pm lunch, 7pm dinner)
  - Behavior-based: Inactive user detection (24h+ since last log)
  - Milestone-based: Streak achievements (7, 14, 30, 100 days)
- **Status:** ✅ **IMPLEMENTED** (v1.6.1 - October 22, 2025)
- **Complexity:** Medium (FCM setup, trigger logic, service worker integration)

**3. Readiness Analyzer**
- **Purpose:** Detect user engagement levels and motivation
- **Functionality:**
  - ML model to assess user "readiness to change"
  - Identifies users at risk of churning
  - Adjusts messaging tone based on motivation level
  - Recommends intervention strategies
- **Technology:** Custom ML model (TensorFlow/PyTorch)
- **Data Inputs:** Logging frequency, streak length, goal progress, app interactions
- **Status:** 🔵 Planned (Phase 3)

**4. Weekly Missions Engine** ✅
- **Purpose:** Gamification and engagement
- **Functionality:**
  - Generates personalized weekly challenges based on user level
  - Tracks mission completion and awards XP + badges
  - Exponential leveling system (Level 1-16+)
  - Automatic progress tracking on meal logging
  - Real-time mission progress updates
- **Technology:** Rule engine + Firestore + React hooks
- **Implementation:**
  - `lib/missions.ts` - Mission catalog, progress calculation (10 missions)
  - `lib/gamification.ts` - XP/level system, badge awards
  - `hooks/useMissions.ts` - React hook for mission state management
  - `components/ui/MissionCard.tsx` - Mission display with progress bars
  - `components/ui/XPBadge.tsx` - Level, XP, and badge showcase
  - Integrated into dashboard and meal logging flow
- **Examples:**
  - "Log all 3 meals for 5 days this week" → +50 XP
  - "Hit protein goal 4 days in a row" → +40 XP + Protein Master badge
  - "Cook 2 recipes from app" → +45 XP + Home Chef badge
  - "Perfect Week: Log all meals for 7 days" → +100 XP + Perfect Week badge
- **Status:** ✅ **IMPLEMENTED** (v1.6.1 - October 22, 2025)
- **Complexity:** High (gamification system, progress tracking, rewards)

**5. Inactive User Detection**
- **Purpose:** Churn prevention and re-engagement
- **Functionality:**
  - Identifies users who haven't logged in 7+ days
  - Sends personalized re-engagement emails
  - Offers incentives (free premium trial, new features)
  - Analyzes churn reasons from behavior patterns
- **Technology:** Cron jobs, email automation, analytics
- **Triggers:** 7-day, 14-day, 30-day inactivity
- **Status:** 🔵 Planned (Phase 3)

**Implementation Timeline:**
- **Phase 3 Q1:** ✅ Weekly Missions + Nudge Delivery (BOTH COMPLETED - v1.6.1)
- **Phase 3 Q2:** AI Coach chatbot integration
- **Phase 3 Q3:** Readiness Analyzer ML model
- **Phase 3 Q4:** Inactive Detection with email automation

**Note:** Inactive Detection is partially implemented via behavior-based nudges (24h+ inactivity). Full email automation and churn analysis remain planned for Q4.

#### 11.4 Client-Side Agents (Current + Planned)

**User Story:** *As a user, I want intelligent features that run on my device for instant responses and offline capability.*

**1. Step Tracker Agent** ✅
- **Purpose:** Automatic background step counting
- **Functionality:**
  - Uses device motion sensors (accelerometer/pedometer)
  - Counts steps continuously in background
  - Auto-saves to Firebase at midnight
  - Saves before page unload
  - Displays real-time count on dashboard
- **Technology:** Device sensor APIs, React context
- **Status:** ✅ **IMPLEMENTED** (v1.2)
- **Files:** `hooks/useStepTracking.ts`, `contexts/StepTrackingProvider.tsx`

**2. Weight Projection Agent** ✅
- **Purpose:** Forecast weight loss trajectory
- **Functionality:**
  - Calculates projected weight loss dates based on:
    - Current weight
    - Target weight
    - Weekly weight loss goal (0.5-2 lbs/week)
    - Historical weight log trend (linear regression)
  - Shows "On track" / "Ahead" / "Behind" status with color-coded badges
  - Displays estimated goal date
  - Updates projection as weight logs come in
  - Personalized adjustment suggestions when behind/ahead
  - Goal realism check (warns if >2 lbs/week target)
- **Technology:** Client-side calculation (linear regression)
- **Formulas:**
  - `weeks_to_goal = (current - target) / weekly_rate`
  - `projected_date = today + (weeks_to_goal * 7 days)`
  - Linear regression: `weeklyRate = (firstWeight - lastWeight) / weeksElapsed`
- **Implementation:**
  - `lib/weight-projection-agent.ts` - Core calculation engine
  - `hooks/useTrendProjection.ts` - React hook wrapper
  - Dashboard "Goal Projection" card with progress visualization
  - Requires minimum 2 weeks of weight log data for accuracy
- **Status:** ✅ **IMPLEMENTED** (v1.6.1 - October 22, 2025)
- **Complexity:** Low (simple math, no ML needed)

**3. Service Worker Agent** ✅
- **Purpose:** PWA capabilities for offline support
- **Functionality:**
  - Caches app shell for offline access
  - Queues meal logs when offline, syncs when online
  - Shows "Offline" indicator with sync progress
  - Pre-caches recent meal photos (up to 50) for viewing offline
  - Enables "Add to Home Screen" prompt
  - Background sync with exponential backoff retry
  - Automatic sync when connection restored
- **Technology:** Service Worker API, IndexedDB, Background Sync API
- **Implementation:**
  - `public/sw.js` - Service worker with cache strategies and Background Sync
  - `lib/offline-queue.ts` - IndexedDB wrapper for queuing meals offline
  - `lib/sync-manager.ts` - Background sync processor with retry logic
  - `hooks/useOnlineStatus.ts` - Online/offline state management
  - `hooks/useInstallPrompt.ts` - PWA install prompt handler
  - `components/ui/OfflineIndicator.tsx` - Real-time sync status UI
  - Integrated into log-meal and dashboard pages
- **Status:** ✅ **IMPLEMENTED** (v1.6.1 - October 22, 2025)
- **Complexity:** Medium (service workers, IndexedDB, sync patterns)

#### 11.5 Future Agent Roadmap (Phase 4+)

**User Story:** *As a product team, we want to explore advanced AI agents that create magical user experiences.*

**1. Meal Photo Gallery Monitor**
- **Purpose:** Automatically organize and analyze meal photos
- **Functionality:**
  - Detects duplicate photos (same meal logged twice)
  - Suggests creating templates from frequently photographed meals
  - Identifies "most photogenic meals" for social sharing suggestions
  - Auto-tags photos by cuisine type (Italian, Mexican, Asian, etc.)
- **Technology:** Computer vision (Gemini Vision), image embeddings
- **Status:** 🔮 Future (Phase 4)

**2. Smart Recipe Suggestions**
- **Purpose:** AI-powered recipe recommendations
- **Functionality:**
  - Recommends recipes based on:
    - User's dietary preferences and allergies
    - Past meal logs (you liked chicken recipes)
    - Current macro goals (needs more protein)
    - Ingredients user has in pantry
    - Time of day and meal type
  - Learns from user feedback (thumbs up/down on suggestions)
- **Technology:** Recommendation engine (collaborative filtering + content-based)
- **Status:** 🔮 Future (Phase 4)

**3. Shopping List Generator**
- **Purpose:** Automatically create shopping lists from meal plans
- **Functionality:**
  - Aggregates ingredients from queued recipes
  - Removes duplicates and consolidates quantities
  - Categorizes by grocery aisle (Produce, Dairy, Meat, etc.)
  - Integrates with grocery delivery APIs (Instacart, Amazon Fresh)
  - Remembers pantry staples user always has
- **Technology:** Ingredient parsing, external API integrations
- **Status:** 🔮 Future (Phase 4)

#### 11.6 Agent Communication Patterns

**Event-Driven Architecture:**
```
User Action → Event Bus → Listening Agents → Actions

Example:
User logs meal
  ↓
"meal_logged" event
  ↓
├─ AI Coach: Analyzes nutrition, suggests improvements
├─ Weekly Missions: Checks if mission completed
├─ Nudge Delivery: Cancels "missed meal" reminder
└─ Readiness Analyzer: Updates engagement score
```

**Data Sharing:**
- Agents read from shared Firestore collections
- Agents write to `users/{userId}/agentEvents` for auditing
- No direct agent-to-agent communication (loose coupling)

#### 11.7 Success Metrics for Agent Systems

**Engagement Metrics:**
- **AI Coach:** % of users who ask questions, avg questions per user
- **Nudge Delivery:** Click-through rate on reminders, % users re-engaged
- **Weekly Missions:** Completion rate, badges earned per user
- **Weight Projection:** % of users "on track" vs "behind schedule"

**Business Metrics:**
- **Retention:** Do agent-engaged users have higher retention?
- **Monetization:** Do nudges drive premium upgrades?
- **Viral Growth:** Do smart recipe suggestions increase sharing?

**Technical Metrics:**
- **Latency:** Agent response time (<2s for client agents)
- **Accuracy:** ML model accuracy for readiness analyzer (target: >80%)
- **Uptime:** Backend agent availability (target: 99.9%)

#### 11.8 Privacy & Ethical Considerations

**Data Privacy:**
- All agent data processing respects user privacy
- No personal data shared with third-party agents
- Users can opt out of specific agents (e.g., disable nudges)
- Transparent logging of agent actions

**Ethical AI:**
- No manipulative nudges (e.g., shame-based messaging)
- AI Coach disclaimers: "Not medical advice"
- Readiness Analyzer cannot discriminate based on protected classes
- Weekly Missions avoid unhealthy challenges (e.g., extreme calorie restriction)

---

## Technical Architecture

### Frontend Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Custom Design System
- **State:** React Hooks (useState, useEffect, useRef, useMemo)
- **Notifications:** react-hot-toast
- **Image Processing:** browser-image-compression
- **PDF Generation:** jsPDF + jsPDF-AutoTable

### Custom Hooks & Performance

**Dashboard Performance Optimization:**
- **`useDashboardData`**: Centralized data fetching hook
  - Combines user profile, meals, weight, and steps data
  - Single source of truth for dashboard state
  - Reduces prop drilling and component complexity

- **`useDashboardStats`**: Memoized calculations hook
  - Nutrition summary (calories, macros, meal count)
  - Weight trend analysis (current, change, progress)
  - Activity summary (steps, weekly average)
  - React `useMemo` prevents unnecessary recalculations

- **`useMealLogsRealtime`**: Real-time meal updates hook
  - Firestore `onSnapshot` listener
  - Auto-unsubscribe on unmount
  - Loading and error states
  - Optimized query filters

**Benefits:**
- Reduced render cycles via memoization
- Cleaner component code
- Reusable logic across pages
- Better testing isolation

### Design System

**Semantic Color Variables:**
- CSS custom properties for theme support
- Light/dark mode via `prefers-color-scheme`
- Color variables:
  - `--foreground`, `--background`
  - `--primary`, `--primary-light`, `--primary-dark`
  - `--success`, `--error`, `--accent`
  - `--border`, `--muted-foreground`

**Component Classes:**
- `.btn`, `.btn-primary`, `.btn-success`, `.btn-outline`
- `.form-input`, `.form-label`
- `.card`, `.health-card`
- `.progress-bar`, `.progress-bar-fill`
- `.text-label`, `.text-caption`, `.text-muted-foreground`

**Accessibility:**
- Semantic HTML elements (`<h2>`, `<label>`, etc.)
- ARIA labels on interactive elements
- Focus states for keyboard navigation
- WCAG AA color contrast compliance

### Backend & Services
- **Auth:** Firebase Authentication
- **Database:** Cloud Firestore
- **Storage:** Firebase Storage
- **AI:** Google Gemini 2.5 Flash (Vision API)
- **Hosting:** Vercel / Firebase Hosting

### Data Model

#### Firestore Collections
```
users/{userId}
  ├── profile: { name, email, goals, preferences }
  ├── mealLogs/{mealLogId}
  │     ├── mealType: string
  │     ├── photoUrl: string
  │     ├── aiAnalysis: AIAnalysis
  │     ├── totalCalories: number
  │     ├── macros: MacroNutrients
  │     ├── notes: string
  │     ├── loggedAt: timestamp
  │     └── source: string
  ├── mealTemplates/{templateId}
  │     ├── name: string
  │     ├── mealType: string
  │     ├── foodItems: string[]
  │     ├── calories: number
  │     ├── macros: MacroNutrients
  │     ├── usageCount: number
  │     ├── lastUsed: timestamp
  │     └── createdAt: timestamp
  ├── weightLogs/{weightLogId}
  │     ├── weight: number
  │     ├── unit: 'kg' | 'lbs'
  │     ├── notes: string
  │     └── loggedAt: timestamp
  └── stepLogs/{stepLogId}
        ├── steps: number
        ├── date: string
        ├── source: string
        └── loggedAt: timestamp
```

#### Firestore Indexes
**Critical Indexes:**
- `mealLogs`: (mealType ASC, loggedAt DESC) - for filtered queries
- `mealLogs`: (uid ASC, loggedAt DESC) - for user meal history
- `mealTemplates`: (userId ASC, usageCount DESC) - for template sorting

### API Endpoints

#### POST /api/ai/analyze-meal
**Purpose:** Analyze meal photo with Gemini Vision AI

**Request:**
```json
{
  "imageData": "data:image/jpeg;base64,...",
  "mealType": "lunch"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "foodItems": [...],
    "estimatedCalories": 520,
    "macros": {...},
    "confidence": 85,
    "suggestions": [...],
    "suggestedMealType": "lunch"
  }
}
```

**Rate Limiting:**
- Gemini Free Tier: 10 req/min, 500 req/day
- Graceful fallback to mock data on rate limit
- Client retries: None (manual retry via UI)

#### GET /api/meal-logs
**Purpose:** Fetch user's meal logs with filters

**Query Params:**
- `limit`: number (default: 10, max: 100)
- `startDate`: ISO string
- `endDate`: ISO string
- `mealType`: breakfast | lunch | dinner | snack

#### POST /api/meal-logs
**Purpose:** Create new meal log

**Request:**
```json
{
  "mealType": "lunch",
  "photoUrl": "https://...",
  "aiAnalysis": {...},
  "notes": "Very filling meal",
  "loggedAt": "2025-10-19T12:30:00.000Z"
}
```

#### PUT /api/meal-logs/[id]
**Purpose:** Update existing meal log

**Allowed Updates:**
- mealType
- notes

#### DELETE /api/meal-logs/[id]
**Purpose:** Delete meal log and associated photo

**Side Effects:**
- Deletes Firestore document
- Deletes Firebase Storage photo (if exists)

#### Meal Template Operations
- GET /api/meal-templates
- POST /api/meal-templates
- DELETE /api/meal-templates/[id]
- POST /api/meal-templates/[id]/use (increment usage count)

### Real-Time Synchronization

**Technology:** Firestore `onSnapshot` listeners

**Implementation:**
```typescript
const { mealLogs, loading, error } = useMealLogsRealtime({
  limitCount: 30,
  mealType: filterMealType !== 'all' ? filterMealType : undefined
})
```

**Benefits:**
- Instant UI updates across all devices
- No manual refresh needed
- Automatic conflict resolution via Firestore

**Lifecycle:**
- Subscribe on component mount
- Unsubscribe on component unmount
- Automatic reconnection on network recovery

---

## User Flows

### Primary Flow: Log Meal with AI
```
1. User opens "Log Meal" page
   ↓
2. App auto-selects meal type based on time (e.g., "Lunch" at 12pm)
   ↓
3. User taps "📸 Take Photo"
   ↓
4. Camera opens (native)
   ↓
5. User captures meal photo
   ↓
6. App compresses image (toast: "Compressing image...")
   ↓
7. Toast: "Image ready" (1s)
   ↓
8. AI analysis starts (overlay: "Analyzing with AI...")
   ↓
9. Gemini returns analysis (2-3s)
   ↓
10. [CONDITIONAL] If AI suggests different meal type:
     → Show blue suggestion card
     → User can accept or dismiss
   ↓
11. Display AI results:
     - Detected foods (bulleted list)
     - Calories + Macros (grid)
     - AI suggestions (green text with 💡)
     - Confidence score
   ↓
12. User reviews + optionally adds notes
   ↓
13. User taps "✓ Save Meal"
   ↓
14. Upload photo to Firebase Storage (toast: "Uploading photo...")
   ↓
15. Save meal data to Firestore (toast: "Saving meal data...")
   ↓
16. Toast: "Meal logged successfully!"
   ↓
17. Real-time listener updates meal history
   ↓
18. Form resets, ready for next meal
```

### Secondary Flow: Use Template
```
1. User opens "Log Meal" page
   ↓
2. User taps "⭐ Templates" button
   ↓
3. Templates panel opens
   ↓
4. User browses saved templates (sorted by usage)
   ↓
5. User taps "Use This Template"
   ↓
6. Meal logged instantly (no photo needed)
   ↓
7. Template usage count increments
   ↓
8. Toast: "Logged [Template Name]!"
   ↓
9. Templates panel closes
   ↓
10. Real-time listener updates meal history
```

### Tertiary Flow: Batch Delete
```
1. User is viewing meal history
   ↓
2. User taps "Select" button
   ↓
3. UI switches to multi-select mode:
     - Checkboxes appear on each meal card
     - Action bar appears at top
   ↓
4. User checks meals to delete
   ↓
5. User taps "Delete (X)" button
   ↓
6. Confirmation modal: "Delete X meals?"
   ↓
7. User confirms
   ↓
8. Toast: "Deleting X meals..." (loading)
   ↓
9. Parallel deletion via Promise.all()
   ↓
10. Toast: "X meals deleted successfully!" (success)
   ↓
11. Real-time listener updates meal history
   ↓
12. Multi-select mode exits
```

---

## Non-Functional Requirements

### Performance
- **Page Load:** <2s on 4G connection
- **AI Analysis:** <5s for meal photo analysis
- **Image Upload:** <3s for compressed photo (1MB)
- **Real-Time Sync:** <500ms latency for Firestore updates

### Security
- **Authentication:** Firebase Auth with email/password
- **Authorization:** Firestore security rules enforce user-scoped data
- **API Security:** Server-side token verification for all endpoints
- **Photo Privacy:** Firebase Storage rules: only owner can access photos

**Firestore Rules Example:**
```javascript
match /users/{userId}/mealLogs/{mealLogId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### Scalability
- **Database:** Firestore auto-scales to handle millions of documents
- **Storage:** Firebase Storage supports unlimited photo storage
- **API:** Serverless Next.js API routes scale automatically on Vercel
- **AI:** Gemini API rate limiting handled gracefully with fallbacks

### Accessibility
- **ARIA Labels:** All interactive elements have aria-label
- **Keyboard Navigation:** Full keyboard support
- **Screen Readers:** Semantic HTML structure
- **Color Contrast:** WCAG AA compliant
- **Focus Indicators:** Visible focus states

### Browser Support
- **Chrome/Edge:** Latest 2 versions
- **Safari:** Latest 2 versions
- **Firefox:** Latest 2 versions
- **Mobile:** iOS Safari 14+, Chrome Android 90+

### PWA Capabilities
**Status:** ⚠️ Pending Implementation

**Planned Features:**
- **Offline Support:** Service worker caching
- **Install Prompt:** Add to Home Screen
- **App-like Experience:** Fullscreen mode
- **Push Notifications:** (future enhancement)

---

## Current Development Status

### ✅ Completed Features
1. **AI Meal Analysis** - Gemini Vision API integration
2. **Image Compression** - Automatic <1MB compression before upload
3. **Time-Based Meal Detection** - Auto-select meal type by time of day
4. **AI Meal Type Suggestions** - Smart validation with user override
5. **Real-Time Meal History** - Firestore onSnapshot listener
6. **Meal Templates** - Save, use, and manage favorite meals
7. **Search & Filter** - Text search + meal type filter
8. **Edit Meal** - Inline editing with real-time sync
9. **Delete Meal** - Single and batch delete operations
10. **Daily Summary** - Auto-calculated totals for today
11. **Empty States** - Onboarding messages for first-time users
12. **Export (CSV/PDF)** - Data export for external analysis
13. **Onboarding Flow** - 6-step guided setup with personalized targets
14. **Dashboard** - Centralized view of weight, nutrition, and activity metrics
15. **Goal Setting** - Personalized calorie and weight goals with BMR/TDEE calculations
16. **Performance Optimizations** - Custom hooks with memoization for faster rendering
17. **Design System** - Semantic CSS with dark mode support
18. **Weight Tracking** - Weight logging with trend analysis
19. **Automatic Step Tracking** - Background sensor-based step counting with auto-save
20. **Real-Time Activity Feed** - Social-media-like step history for engagement
21. **Recipe Cooking Mode** - Guided cooking with timers and meal logging integration
22. **Recipe Scaling** - Adjustable serving sizes with real-time ingredient recalculation
23. **Ingredient Substitutions** - 300+ substitutions filtered by dietary preferences and allergies
24. **Marketing Template System** - Multi-template image generation for viral recipe sharing
25. **Visual Effects Library** - Gradients, shadows, and badges for professional share images
26. **Aspect Ratio Optimization** - Platform-specific image formats (1:1, 9:16, 3:2)

### 📋 Planned Features
1. **Health Integration** - Apple Health/Google Fit sync for step tracking
1. **Photo Gallery View** - Grid layout for browsing meal photos
2. **PWA Icons** - Add missing icon files for installability
3. **Skeleton UI** - Replace loading spinners with skeleton components
4. **Offline Support** - Service worker for offline meal logging
5. **Manual Entry (Complete)** - Finish save logic for manual meals
6. **Charts & Trends** - Visualize progress over time with interactive graphs

---

## Success Criteria & KPIs

### User Engagement
- **Target:** 70%+ of users log ≥2 meals/day
- **Metric:** Average meals per active user per day
- **Measurement:** Firestore query aggregation

### AI Accuracy
- **Target:** ≥85% average confidence score
- **Metric:** Average `aiAnalysis.confidence` across all logged meals
- **Measurement:** Firestore aggregation of confidence scores

### Retention
- **Target:** 60%+ weekly active users (WAU)
- **Metric:** Users who log ≥1 meal in a 7-day period
- **Measurement:** Firebase Analytics custom event tracking

### Performance
- **Target:** <2s meal analysis response time (95th percentile)
- **Metric:** API response time from photo upload to AI result
- **Measurement:** Vercel Analytics + custom logging

### Data Quality
- **Target:** ≥90% of meals include photo
- **Metric:** Percentage of meals with `photoUrl` populated
- **Measurement:** Firestore query aggregation

---

## Future Enhancements

### Phase 2 (Q2 2026)
- **Barcode Scanner:** Scan packaged foods for instant nutrition info
- **Recipe Import:** Import recipes from URLs and calculate nutrition
- **Social Sharing:** Share meals with friends for accountability
- **Meal Plans:** AI-generated weekly meal plans based on goals
- **Integration:** Apple Health, Google Fit, MyFitnessPal sync

### Phase 3 (Q3 2026)
- **Premium Features:** Advanced analytics, custom macros, priority support
- **Nutrition Coach Chat:** AI chatbot for nutrition questions
- **Community:** User-generated meal ideas and templates
- **Gamification:** Streaks, badges, and achievements

---

## Risks & Mitigations

### Risk 1: AI Accuracy Issues
**Impact:** Users lose trust if calorie estimates are wildly inaccurate
**Mitigation:**
- Display confidence score prominently
- Allow manual corrections
- Collect feedback to improve AI prompt
- Fallback to manual entry

### Risk 2: Gemini API Rate Limits
**Impact:** Users cannot analyze meals during peak usage
**Mitigation:**
- Graceful degradation to mock data
- User-friendly error messages
- Consider paid Gemini tier for higher limits
- Queue system for non-urgent analyses

### Risk 3: Photo Privacy Concerns
**Impact:** Users reluctant to upload meal photos
**Mitigation:**
- Clear privacy policy
- Firebase Storage security rules
- Option to delete photos
- End-to-end encryption (future)

### Risk 4: Cross-Device Sync Failures
**Impact:** Users see inconsistent data across devices
**Mitigation:**
- Robust error handling in Firestore listeners
- Automatic reconnection logic
- Manual refresh option
- Offline queue with sync on reconnect

---

## Open Questions

1. **Should we allow editing of AI-detected food items and macros?**
   - Pro: More accurate data
   - Con: Undermines AI value prop, increases friction

2. **How to handle partial meal logging (e.g., just breakfast)?**
   - Currently: No enforcement
   - Alternative: Encourage 3 meals/day with gentle reminders

3. **What should happen if a user logs a meal but forgets to save?**
   - Currently: Form resets on navigation
   - Alternative: Auto-save draft to localStorage

4. **Should templates include photos?**
   - Pro: More visual browsing experience
   - Con: Storage costs, slower template loading

5. **How to handle users in different timezones?**
   - Currently: Uses device local time for meal type detection
   - Issue: May be inaccurate for travelers

---

## Appendix

### A. Glossary
- **Meal Log:** A single recorded meal entry with photo, AI analysis, and metadata
- **Meal Template:** A saved meal configuration for quick re-logging
- **AI Analysis:** Gemini Vision API output including food items, calories, and macros
- **Macro / Macros:** Macronutrients (protein, carbs, fat, fiber)
- **Real-Time Sync:** Firestore onSnapshot listener for instant cross-device updates

### B. Related Documents
- API Documentation: `/docs/api.md` (pending)
- Design System: Tailwind config + component library
- Firebase Security Rules: `/firestore.rules`
- Firestore Indexes: `/firestore.indexes.json`

### C. Changelog
- **v1.6.1** (Oct 22, 2025): Weight Projection Agent Implementation
  - **Major Feature:** Trend-based weight loss projection using linear regression
  - **Goal Projection Card:** New dashboard card showing:
    - Estimated completion date based on actual weight loss trend
    - Progress bar with percentage to goal (0-100%)
    - Status badge: ✓ On Track / ⚡ Ahead / ⚠️ Behind
    - Actual vs. target pace comparison (lbs/week)
    - Personalized adjustment suggestions when behind/ahead schedule
    - Goal realism check (warns if >2 lbs/week target is unhealthy)
  - **Implementation Files:**
    - `lib/weight-projection-agent.ts` - Core calculation engine with linear regression
    - `hooks/useTrendProjection.ts` - React hook wrapper for agent
    - `app/dashboard/page.tsx` - Dashboard card UI integration
  - **Data Requirements:** Minimum 2 weeks of weight log data for accurate projections
  - **Formulas:** Linear regression on historical weight logs to calculate weekly rate
  - **Status Update:** Agent Architecture Section 11.4 updated (🔵 PLANNED → ✅ IMPLEMENTED)
  - **Phase 2 Progress:** High-priority client-side agent completed
  - **Value:** Provides motivational feedback and data-driven goal completion estimates

- **v1.6** (Oct 22, 2025): Agent Architecture & Strategic Roadmap
  - **Major Addition:** Comprehensive multi-agent system architecture documentation
  - **Section 11: Agent Architecture & Future Vision** - Full strategic roadmap for autonomous agents
  - **Development Agents:** Team role definitions (Frontend, Backend, AI, QA)
  - **Backend Agents (Phase 3):** 5 planned autonomous services
    - AI Coach chatbot for personalized nutrition advice
    - Nudge Delivery system for behavioral prompts
    - Readiness Analyzer ML model for engagement detection
    - Weekly Missions gamification engine
    - Inactive User Detection for churn prevention
  - **Client-Side Agents:** Current + planned features
    - ✅ Step Tracker (implemented v1.2)
    - ✅ Weight Projection forecasting (implemented v1.6.1)
    - ⚠️ Service Worker for PWA offline support (pending)
  - **Future Agents (Phase 4):** Meal Photo Gallery Monitor, Smart Recipe Suggestions, Shopping List Generator
  - **Agent Communication:** Event-driven architecture with Firestore data sharing
  - **Success Metrics:** Engagement, business, and technical KPIs for agent systems
  - **Privacy & Ethics:** User data protection, opt-out capabilities, non-manipulative design
  - **Sync with JSON PRD:** Aligned with full_prd_weight_loss_lab_v1.5.1.json
  - **Implementation Timeline:** Phase 3 Q1-Q4 roadmap for backend agents
  - **Value:** Provides strategic vision for scaling beyond MVP features

- **v1.5** (Oct 21, 2025): Marketing Template System for viral recipe sharing
  - **Major Feature:** Multi-template image generation system for social media sharing
  - **3 Template Styles:** Minimalist Modern, Bold & Vibrant, Elegant Dark
  - **Visual Effects Library:** 12+ gradient presets, 10+ shadow styles, 8+ auto-selected badges
  - **Aspect Ratio Support:** Square (1:1), Story (9:16), Landscape (3:2) for platform optimization
  - **Template Selection UX:** Two-step flow (template → aspect ratio) with icon-based selector
  - **Auto-Personalization:** Meal-type adaptive gradients, dietary badges, recipe-based recommendations
  - **Share Flow Integration:** Web Share API (mobile auto-attach), Download + platform menu (desktop)
  - **Viral Caption Generation:** Randomized hooks from 1000+ message library with hashtags
  - **Zero Cost:** Client-side Canvas API rendering, no external dependencies or API fees
  - **Files Created:**
    - `lib/recipe-templates/index.ts` - Template registry with error handling
    - `lib/recipe-templates/minimalist.ts` - Clean professional template
    - `lib/recipe-templates/bold-vibrant.ts` - High-energy viral template
    - `lib/recipe-templates/elegant-dark.ts` - Premium luxury template
    - `lib/recipe-effects/gradients.ts` - 12+ gradient presets (linear, radial, conic)
    - `lib/recipe-effects/shadows.ts` - 10+ shadow styles with utilities
    - `lib/recipe-effects/badges.ts` - 8+ badges with auto-recommendation logic
    - `lib/recipe-effects/canvas-utils.ts` - Shared utilities (roundRect, wrapText, constants)
    - `lib/recipe-effects/index.ts` - Barrel export for effects library
  - **Files Modified:**
    - `lib/recipe-share-utils.ts` - Added template parameter to share functions
    - `components/ui/RecipeModal.tsx` - Added template selector UI before aspect ratio
  - **Code Quality:** Fixed code duplication, replaced dynamic imports with static, added error handling with fallback
  - **Marketing Benefits:** Viral growth engine, brand awareness, SEO backlinks, zero cost scaling
  - **Engagement Targets:** 15%+ share rate, 5%+ CTR, 10%+ signup conversion from shares

- **v1.4** (Oct 21, 2025): Recipe Cooking Mode with guided timers and meal logging
  - **Major Feature:** Complete recipe cooking system with step-by-step guidance
  - **Recipe Scaling:** Adjustable serving sizes (1-8) with real-time ingredient/macro recalculation
  - Intelligent fraction handling ("1/2 cup" → "1 cup" when doubled)
  - Logarithmic prep time scaling (2x servings ≈ 1.3x time)
  - **Ingredient Substitutions:** 300+ substitution database filtered by dietary preferences
  - Smart allergen exclusion and dietary preference matching
  - One-tap ingredient swapping with quantity preservation
  - Substitution categories: Dairy, Protein, Grains, Sweeteners, Nuts/Seeds, Vegetables, Oils
  - **Ingredient Checklist:** "I have this" checkboxes with shopping list generation
  - **Recipe Queue System:** Save recipes to cook later with dashboard widget
  - **Guided Cooking Sessions:** Step-by-step interface with automatic timers
  - Timer extraction from recipe text ("5 minutes", "25-30 min", "1 hour 30 minutes")
  - Interactive countdown timer with browser notifications and audio alerts
  - Progress tracking with color-coded timer (green → orange → red)
  - Quick add time buttons (+30s, +1m, +2m, +5m)
  - **Seamless Meal Logging:** Pre-filled nutrition from recipe (100% accuracy, no AI guessing)
  - Query parameter integration for cooking completion → meal logging flow
  - **Files Created:**
    - `lib/ingredient-parser.ts` - Parse quantities, units, fractions
    - `lib/recipe-scaler.ts` - Scale recipes with 30+ cooking units
    - `lib/ingredient-substitutions.ts` - Comprehensive substitution database
    - `lib/recipe-timer-parser.ts` - Extract timers from natural language
    - `components/ui/CookingTimer.tsx` - Interactive timer with notifications
    - `components/ui/RecipeQueue.tsx` - Dashboard queue widget
    - `app/cooking/[sessionId]/page.tsx` - Full cooking session interface
  - **Files Modified:**
    - `types/index.ts` - Added CookingSession, QueuedRecipe, StepTimer interfaces
    - `lib/firebase-operations.ts` - Added cookingSessionOperations and recipeQueueOperations
    - `components/ui/RecipeModal.tsx` - Added scaling, substitutions, "Try This Recipe" button
    - `app/dashboard/page.tsx` - Integrated RecipeQueue widget
    - `app/log-meal/page.tsx` - Added cooking completion detection and pre-fill
  - **User Experience:** Mobile-optimized, loading states, error handling, celebration screens
  - **Engagement Strategy:** Bridges recipe browsing → cooking → meal tracking lifecycle

- **v1.3** (Oct 21, 2025): Personalized authentication loading messages
  - **Major Feature:** Dynamic, entertaining loading messages during authentication
  - Created library of 1,000+ funny, relatable weight loss journey messages
  - Smart personalization based on user journey status (7 categories)
  - Message categories: New Users, First-Timers, Streakers, Comeback Kids, Power Users, Weekend Warriors, Generic
  - Dynamic streak count display for active users ("Your 7-day streak is still alive...")
  - Auto-rotating messages every 3 seconds (Claude AI-style)
  - Zero cost implementation (no API calls, pre-generated content)
  - Files: `lib/auth-loading-messages.json`, `lib/auth-message-selector.ts`
  - Enhanced `AuthGuard.tsx` component with message rotation
  - Improves user engagement and emotional connection during wait times
  - Reinforces positive behaviors (streaks, consistency, comeback courage)

- **v1.2** (Oct 20, 2025): Automatic step tracking system
  - **Major Feature:** Fully automatic step tracking using device motion sensors
  - Created `StepTrackingProvider` for app-wide step tracking context
  - Removed manual step entry (users cannot accurately count steps manually)
  - Auto-save to Firebase at midnight and before page unload
  - Real-time activity feed with last 7 days of step history
  - Social media-like engagement pattern for frequent check-ins
  - Dashboard integration with live tracking indicator (pulsing green dot)
  - Settings page toggle for enable/disable
  - Deduplicated dashboard UI (removed redundant "Log Steps" button)
  - Smart date formatting ("Today", "Yesterday", "X days ago")
  - Color-coded goal progress indicators (green/blue/orange)

- **v1.1** (Oct 19, 2025): UX improvements and performance optimizations
  - Added 6-step onboarding flow with personalized goal setting
  - Improved birthday input with Month/Day/Year dropdowns (eliminates calendar scrolling)
  - Split height inputs for better UX (feet/inches for imperial, cm for metric)
  - Design system integration with dark mode support
  - Dashboard performance optimizations using custom hooks and memoization
  - Completed weight tracking and step tracking features
  - Added age-based health recommendations and safety limits

- **v1.0** (Oct 19, 2025): Initial PRD based on current implementation
- **v0.9** (Oct 15, 2025): Draft PRD with core features
- **v0.5** (Oct 10, 2025): Concept validation and MVP scope

---

**Document Owner:** Product Team
**Stakeholders:** Engineering, Design, Marketing
**Review Cycle:** Bi-weekly
**Next Review:** November 2, 2025
