# Product Requirements Document (PRD)
## Weight Loss Project Lab

**Version:** 1.2
**Last Updated:** October 20, 2025
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
- Spinner with "Analyzing with AI..." overlay during analysis
- Spinner for meal history loading
- Loading toast for image compression

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
