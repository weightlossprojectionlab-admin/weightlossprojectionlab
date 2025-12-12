# Dark Mode Transformation Guide

## Overview
This guide documents the systematic approach to adding Tailwind dark mode variants across the entire codebase.

## Scope
- **Total TSX Files**: 60+ files
- **Directories**:`app/`and`components/`- **Estimated Color Classes**: 1000+ occurrences

## Transformation Patterns

### Text Colors```text-gray-900 → text-gray-900 text-gray-800 → text-gray-800 text-gray-700 → text-gray-700 text-gray-600 → text-gray-600 text-gray-500 → text-gray-500 (no change)
text-black → text-black```### Background Colors```bg-white → bg-white bg-gray-50 → bg-gray-50 bg-gray-100 → bg-gray-100 bg-gray-200 → bg-gray-200 bg-gray-300 → bg-gray-300 bg-purple-100 → bg-purple-100 /20
bg-indigo-100 → bg-indigo-100 /20```### Border Colors```border-gray-200 → border-gray-200 border-gray-300 → border-gray-300 border-white → border-white```## Files Requiring Updates

### High Priority (Most Color Classes)
1. **app/dashboard/page.tsx** - ~37 color class occurrences ✅ STARTED
2. **app/log-meal/page.tsx** - ~88 color class occurrences
3. **app/onboarding/page.tsx** - ~44 color class occurrences
4. **components/ui/GoalsEditor.tsx** - ~11 color class occurrences
5. **components/ui/RecipeModal.tsx** - ~60 color class occurrences
6. **components/ui/ChatInterface.tsx** - ~7 color class occurrences

### Medium Priority
7. **app/profile/page.tsx** - ~20 occurrences
8. **app/auth/page.tsx** - ~6 occurrences
9. **app/recipes/page.tsx** - ~13 occurrences
10. **components/RecipeCard.tsx** - ~8 occurrences
11. **components/ui/MissionCard.tsx** - ~6 occurrences
12. **components/missions/MissionCard.tsx** - ~5 occurrences

### Lower Priority (All Remaining Files)
- app/(dashboard)/admin/*.tsx
- components/perks/*.tsx
- components/groups/*.tsx
- components/coaching/*.tsx
- components/trust-safety/*.tsx
- And ~40 more files

## Implementation Strategies

### Option 1: Manual File-by-File (Safest)
- Use Edit tool to update each file
- Verify no duplicate dark: variants
- Time estimate: 3-5 hours for all files
- **Status**: Started with dashboard page (6 modifications made)

### Option 2: Search & Replace with Regex (Faster but riskier)
- Use VS Code or similar IDE
- Apply regex patterns with lookbehinds/lookaheads
- Must manually verify no duplicates
- Time estimate: 1-2 hours

### Option 3: Automated Script (Fastest)
- Use the Python script at`scripts/add-dark-mode.py`- Requires testing and verification
- Risk of duplicates if run multiple times
- Time estimate: 30 minutes + verification

## Progress Tracker

### ✅ Completed
- app/dashboard/page.tsx (partial - first section updated)

### 🔄 In Progress
- app/dashboard/page.tsx (needs remaining sections)

### ⏳ Pending
- All other 59 files

## Verification Checklist
- [] No duplicate dark: variants (e.g.,`text-gray-900`)
- [] All bg-white changed to - [] All text-gray-900 changed to - [] Conditional classes preserve their logic
- [] No syntax errors in className strings

## Notes
- **DO NOT** modify tailwind.config.ts or globals.css (already updated)
- **PRESERVE** all existing classes
- **SKIP** classes that already have dark: variants
- **BE CAREFUL** with dynamic/conditional classNames (template literals)

## Example Before/After

### Before```tsx
<div className="bg-white rounded-lg shadow p-6">
 <h2 className="text-gray-900 font-bold">Title</h2>
 <p className="text-gray-600">Description</p>
</div>```### After```tsx
<div className="bg-white rounded-lg shadow p-6">
 <h2 className="text-gray-900 font-bold">Title</h2>
 <p className="text-gray-600">Description</p>
</div>```## Recommendation
Given the scale (1000+ modifications), I recommend:
1. Continue manual edits for critical files (dashboard, log-meal, onboarding)
2. Use regex find/replace in IDE for remaining files
3. Run automated tests after each batch
4. Verify dark mode display in browser

## Resources
- Python script:`scripts/add-dark-mode.py`- Bash script:`scripts/add-dark-mode.sh`- This guide:`DARK_MODE_TRANSFORMATION_GUIDE.md`