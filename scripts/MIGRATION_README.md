# Recipe IDs Migration Script

## Overview

This script migrates `ShoppingItem` documents from the old single `recipeId` format to the new `recipeIds` array format, enabling multi-recipe linking.

## What It Does

**Before:**
```json
{
  "productName": "eggs",
  "recipeId": "pancakes-123",
  ...
}
```

**After:**
```json
{
  "productName": "eggs",
  "recipeIds": ["pancakes-123"],
  "primaryRecipeId": "pancakes-123",
  ...
}
```

## Why This Migration?

Previously, each ingredient could only be linked to ONE recipe. With the new format:
- One ingredient can belong to multiple recipes
- Users see all recipes that use an ingredient
- Better meal planning and shopping list organization
- No duplicate ingredients when multiple recipes need the same item

## Prerequisites

1. **Firebase Service Account Key**
   - Download from Firebase Console → Project Settings → Service Accounts
   - Place as `serviceAccountKey.json` in project root
   - **Do NOT commit this file to git** (already in .gitignore)

2. **Install Dependencies**
   ```bash
   npm install firebase-admin
   npm install -D tsx  # For running TypeScript directly
   ```

## Running the Migration

### Option 1: Using tsx (Recommended)
```bash
npx tsx scripts/migrate-recipe-ids.ts
```

### Option 2: Using ts-node
```bash
npx ts-node scripts/migrate-recipe-ids.ts
```

### Option 3: Compile first, then run
```bash
tsc scripts/migrate-recipe-ids.ts
node scripts/migrate-recipe-ids.js
```

## What to Expect

The script will:
1. Connect to Firestore using the service account
2. Query all `shopping_items` documents
3. For each item with a `recipeId`:
   - Convert `recipeId: string` → `recipeIds: string[]`
   - Set `primaryRecipeId` to the existing `recipeId`
   - Delete the old `recipeId` field
4. Skip items already migrated (have `recipeIds` array)
5. Print detailed progress and summary

### Example Output

```
🚀 Starting migration: recipeId → recipeIds array
────────────────────────────────────────────────────────────
📊 Found 127 total shopping items
✅ Migrated user123_eggs: pancakes-123 → [pancakes-123]
✅ Migrated user123_milk: null → []
⏭️  Skipping user123_butter (already migrated)
...

────────────────────────────────────────────────────────────
📈 Migration Summary
────────────────────────────────────────────────────────────
Total items:              127
Items with recipeId:      45
Items migrated:           45
Items already migrated:   0
Errors:                   0

✅ Migration completed successfully!

✨ Done!
```

## Safety Features

- ✅ **Idempotent**: Safe to run multiple times (skips already-migrated items)
- ✅ **Non-destructive**: Creates new fields before deleting old ones
- ✅ **Rollback-friendly**: Old `recipeId` can be restored from `primaryRecipeId`
- ✅ **Error handling**: Continues on errors, reports at the end
- ✅ **Dry-run ready**: Can be modified to preview changes without writing

## Rollback (If Needed)

If you need to rollback the migration:

```typescript
// Rollback script (create separate file if needed)
await doc.ref.update({
  recipeId: data.primaryRecipeId,
  recipeIds: FieldValue.delete(),
  primaryRecipeId: FieldValue.delete()
})
```

## Post-Migration

After running this script:
1. Test the application thoroughly
2. Verify recipe badges appear on shopping list items
3. Verify inventory items show "Used in recipes" section
4. Test adding ingredients from multiple recipes
5. Confirm no duplicate ingredients are created

## Troubleshooting

### Error: "serviceAccountKey.json not found"
- Download service account key from Firebase Console
- Place in project root directory
- Ensure filename is exactly `serviceAccountKey.json`

### Error: "Permission denied"
- Verify service account has Firestore permissions
- Check Firebase IAM settings

### Error: "Cannot find module 'firebase-admin'"
- Run `npm install firebase-admin`

## Questions?

See the main implementation in:
- `types/shopping.ts` - Type definitions
- `lib/shopping-operations.ts` - Updated functions
- `components/ui/RecipeModal.tsx` - Multi-recipe linking logic
- `components/shopping/RecipeLinks.tsx` - UI component
