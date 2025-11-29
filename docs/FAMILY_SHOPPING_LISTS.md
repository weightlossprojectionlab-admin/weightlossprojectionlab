# Family Shopping Lists - Per-Member Lists with Shared Inventory

## Overview

The family shopping list system allows multiple family members to maintain their own personal shopping lists while sharing a common household inventory. This ensures safety, deduplication, and proper tracking of who needs what.

## Architecture

### Data Model

```
users/{accountOwnerId}/
  ├─ shopping_items/                    # Shared household inventory (root collection)
  │   └─ {itemId}
  │       ├─ householdId: string        # Account owner's userId
  │       ├─ productKey: string         # For deduplication (barcode or normalized name)
  │       ├─ requestedBy: string[]      # Array of member userIds who need this
  │       ├─ addedBy: string[]          # Array of members who originally added
  │       ├─ lastModifiedBy: string     # Last person to update
  │       └─ purchasedBy: string        # Person who purchased
  │
  └─ member_shopping_lists/             # Per-member personal lists
      └─ {memberId}/
          └─ items/
              └─ {itemId}
                  ├─ memberId: string
                  ├─ householdId: string
                  ├─ productKey: string
                  ├─ needed: boolean
                  ├─ purchasedBy: string
                  └─ householdItemId: string  # Link to shared inventory
```

### Key Concepts

1. **Household Inventory** (`shopping_items` collection)
   - Shared across all family members
   - Single source of truth for what's in stock
   - Tracks who requested each item

2. **Member Shopping Lists** (`member_shopping_lists` subcollection)
   - Personal list for each family member
   - Can have different priorities/reasons per member
   - Links to household inventory via `productKey`

3. **Product Key** - Deduplication identifier
   - If barcode exists: `barcode:{barcode}`
   - Otherwise: `name:{normalized_product_name}`
   - Prevents duplicate items in household inventory

## Safety Mechanisms

### 1. Firestore Security Rules

```javascript
// Household inventory - accessible by all family members
match /shopping_items/{itemId} {
  allow read, write: if isHouseholdMember(resource.data.householdId);
}

// Member lists - accessible by account owner or member themselves
match /users/{userId}/member_shopping_lists/{memberId}/items/{itemId} {
  allow read, write: if request.auth.uid == userId || request.auth.uid == memberId;
}
```

### 2. Deduplication Logic

When a member adds an item:
1. Generate `productKey` from barcode or product name
2. Check if item exists in household inventory
3. If exists: Add member to `requestedBy[]` array
4. If new: Create new household item with member in `requestedBy[]`
5. Create item in member's personal list

### 3. Purchase Flow

When someone purchases an item:
1. Update household inventory:
   - `inStock = true`
   - `purchasedBy = memberId`
   - Clear `requestedBy[]` array
   - Add to `purchaseHistory`
2. Update all member lists that had this item:
   - `needed = false`
   - `purchasedBy = memberId`
   - Link to `householdItemId`

### 4. Conflict Resolution

- **Simultaneous adds**: Deduplication ensures only one household item
- **Purchase conflicts**: Last write wins, tracked by `lastModifiedBy`
- **Deletion**: Removing from member list updates household `requestedBy[]`

## Usage

### 1. Hook Usage

```typescript
import { useMemberShoppingList } from '@/hooks/useMemberShoppingList'

function MyShoppingList() {
  const {
    memberItems,           // Member's personal list
    householdInventory,    // Shared household inventory
    summary,              // Statistics
    loading,
    addItem,
    updateItem,
    removeItem,
    purchaseItem,
    isInHouseholdStock
  } = useMemberShoppingList({
    householdId: 'account-owner-uid',
    memberId: 'current-user-uid' // Optional, defaults to current user
  })

  // Add item to member's list
  const handleAddItem = async () => {
    await addItem({
      productName: 'Milk',
      brand: 'Organic Valley',
      category: 'dairy',
      quantity: 1,
      unit: 'gal',
      priority: 'high',
      reason: 'For breakfast cereal'
    })
  }

  // Check if already in household stock
  const alreadyHave = isInHouseholdStock('barcode:123456')

  return (
    <div>
      <h2>My Shopping List</h2>
      {memberItems.map(item => (
        <div key={item.id}>
          {item.productName} - {item.displayQuantity}
          {item.reason && <span>({item.reason})</span>}
        </div>
      ))}
    </div>
  )
}
```

### 2. Direct Operations

```typescript
import { addToMemberShoppingList, getMemberShoppingList } from '@/lib/member-shopping-operations'
import { getHouseholdInventory, markHouseholdItemPurchased } from '@/lib/household-shopping-operations'

// Add to member's list
await addToMemberShoppingList(householdId, memberId, {
  productName: 'Eggs',
  brand: 'Local Farm',
  category: 'eggs',
  quantity: 12,
  unit: 'count',
  priority: 'medium',
  recipeIds: ['recipe-123'] // Link to recipe
})

// Get member's list
const items = await getMemberShoppingList(householdId, memberId, {
  needed: true // Only items still needed
})

// Get household inventory
const inventory = await getHouseholdInventory(householdId, {
  inStock: true // Only items in stock
})

// Mark as purchased
await markHouseholdItemPurchased(itemId, purchasedBy, {
  quantity: 1,
  expiresAt: new Date('2025-12-31'),
  store: 'Walmart'
})
```

## Permissions & Access Control

### Family Roles

- **Account Owner**: Full access to all member lists and household inventory
- **Co-Admin**: Full access (same as account owner)
- **Caregiver**: Access to their own list + household inventory (read-only)
- **Viewer**: Access to their own list + household inventory (read-only)

### Security Rules Implementation

```javascript
function isHouseholdMember(householdId) {
  return request.auth.uid == householdId ||
         exists(/databases/$(database)/documents/users/$(householdId)/familyMembers/$(request.auth.uid));
}
```

## Migration from Single-User Lists

Existing single-user lists are backward compatible:
- `userId` field remains (represents household owner)
- New `householdId` field added for family plans
- Items without `householdId` function as before
- Family plans set `householdId` to enable sharing

## Best Practices

1. **Always use `productKey` for lookups** - Ensures deduplication
2. **Check household inventory before adding** - Avoid duplicate UI requests
3. **Show who requested each item** - Use `requestedBy[]` for transparency
4. **Track purchaser** - Use `purchasedBy` for accountability
5. **Link recipes to items** - Helps members understand why items are needed

## Examples

### Example 1: Mom adds milk for recipe
```typescript
await addToMemberShoppingList(householdId, momId, {
  productName: 'Whole Milk',
  brand: 'Horizon',
  category: 'dairy',
  quantity: 2,
  unit: 'gal',
  priority: 'high',
  reason: 'For mac and cheese recipe',
  recipeIds: ['recipe-mac-and-cheese']
})
```

Result:
- Created in mom's personal list
- Added to household inventory with `requestedBy: [momId]`

### Example 2: Dad also needs milk (different reason)
```typescript
await addToMemberShoppingList(householdId, dadId, {
  productName: 'Whole Milk',
  brand: 'Horizon',
  category: 'dairy',
  quantity: 1,
  unit: 'gal',
  priority: 'medium',
  reason: 'For coffee'
})
```

Result:
- Created in dad's personal list
- Household inventory updated: `requestedBy: [momId, dadId]`, `quantity: 3`

### Example 3: Kid purchases milk
```typescript
await markHouseholdItemPurchased(householdItemId, kidId, {
  quantity: 3,
  store: 'Kroger',
  expiresAt: new Date('2025-12-10')
})
```

Result:
- Household inventory: `inStock: true`, `purchasedBy: kidId`, `requestedBy: []`
- Mom's list: `needed: false`, `purchasedBy: kidId`
- Dad's list: `needed: false`, `purchasedBy: kidId`

## Troubleshooting

### Duplicate items appearing
- Check `productKey` generation - ensure consistent normalization
- Verify barcode matching (case-sensitive)

### Permission denied errors
- Ensure user is in `familyMembers` subcollection
- Check `householdId` matches account owner's userId

### Items not syncing between lists
- Verify `productKey` consistency across member lists
- Check Firestore security rules deployment

## API Reference

See:
- `lib/household-shopping-operations.ts` - Household inventory operations
- `lib/member-shopping-operations.ts` - Member list operations
- `hooks/useMemberShoppingList.ts` - React hook
- `types/shopping.ts` - TypeScript interfaces
