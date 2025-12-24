# Quick Deployment Reference

## 🚀 Deploy Commands (Run in Terminal)

### 1. Authenticate
```bash
firebase login
```

### 2. Deploy Rules & Indexes
```bash
# Deploy everything
firebase deploy --only firestore:rules,firestore:indexes

# Or separately:
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 3. Verify
```bash
# Check current rules
firebase firestore:rules:get

# View project in console
firebase open firestore
```

---

## ✅ Quick Test Checklist

### Test 1: Permission Block (2 min)
1. Login as **Caregiver** (not owner)
2. Go to `/shopping`
3. Click "Clear List"
4. ✅ Should see: "🔒 Permission Required"

### Test 2: Session Block (3 min)
1. User A: Start shopping (scan item)
2. User B: Try "Clear List"
3. ✅ Should see: "🛒 Someone is Shopping"

### Test 3: Individual Ops (1 min)
1. During active shopping session
2. Try: Add item, Remove item, Mark purchased
3. ✅ All should work normally

---

## 🐛 Quick Fixes

### Missing Permissions Error
```bash
firebase deploy --only firestore:rules
```

### Index Required Error
- Click the link in error message
- Or: `firebase deploy --only firestore:indexes`
- Wait 5-15 min for indexes to build

### Build Errors
```bash
npm run build
# Fix any TypeScript errors shown
```

---

## 📊 Quick Check (Firebase Console)

1. **Rules:** Firestore → Rules → Look for `shopping_sessions`
2. **Indexes:** Firestore → Indexes → Check for 5 new indexes
3. **Data:** Firestore → Data → Check `shopping_sessions` collection

---

## 🔄 Quick Rollback

```bash
# Restore previous rules
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
```

Or manually remove permission checks from `lib/shopping-operations.ts`
