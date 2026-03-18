# Firebase Real-Time Listener Optimization Strategy

## Current State Assessment

### ✅ Already Optimized (Using onSnapshot)
- `useActiveShoppingSessions` - Real-time shopping session monitoring
- Multiple hooks already use Firebase real-time listeners properly

### 🔄 Needs Optimization (Using Manual Fetching)
- `useFamilyMembers` - Currently uses manual `getFamilyMembers()` fetch
- Potential candidates for real-time updates in medical operations

## Optimization Approach

### Phase 1: High-Impact Real-Time Updates (Priority)
**Target: Family Members & Patient Access**

Current implementation in `useFamilyMembers.ts`:
```typescript
// BEFORE (Manual Fetch)
const fetchFamilyMembers = async () => {
  const data = await medicalOperations.family.getFamilyMembers(patientId, includeAll)
  setFamilyMembers(data)
}
```

Recommended optimization:
```typescript
// AFTER (Real-Time onSnapshot)
useEffect(() => {
  if (!patientId) return

  const q = query(
    collection(db, 'family_access'),
    where('patientId', '==', patientId),
    where('status', '==', 'active')
  )

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const members = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    setFamilyMembers(members)
  })

  return () => unsubscribe()
}, [patientId])
```

**Benefits:**
- Instant updates when family members are added/removed
- No need for manual `refetch()` after mutations
- Better UX in multi-user household scenarios

### Phase 2: Race Condition Prevention

**Critical Areas Requiring Transactions:**
1. Shopping session management (household concurrent access)
2. Medical log updates (multiple caregivers logging vitals)
3. Household duty assignments

**Example Fix for Shopping Sessions:**
```typescript
// Use Firestore transactions for atomic operations
const updateShoppingSession = async (sessionId: string, updates: Partial<ShoppingSession>) => {
  const sessionRef = doc(db, 'shopping_sessions', sessionId)

  await runTransaction(db, async (transaction) => {
    const sessionDoc = await transaction.get(sessionRef)

    if (!sessionDoc.exists()) {
      throw new Error('Session not found')
    }

    // Check for conflicts
    const currentStatus = sessionDoc.data().status
    if (currentStatus === 'completed') {
      throw new Error('Cannot modify completed session')
    }

    transaction.update(sessionRef, {
      ...updates,
      lastActivityAt: serverTimestamp()
    })
  })
}
```

### Phase 3: Memory Leak Prevention

**Checklist for All Hooks Using onSnapshot:**
- [ ] Always return unsubscribe function from useEffect
- [ ] Verify cleanup happens on component unmount
- [ ] Test with React StrictMode (double mount/unmount)
- [ ] Monitor listener count in Firebase console

**Example Pattern:**
```typescript
useEffect(() => {
  // Setup listener
  const unsubscribe = onSnapshot(q, handleSnapshot, handleError)

  // Cleanup on unmount
  return () => {
    unsubscribe()
  }
}, [dependencies])
```

## Implementation Priority

### High Priority (Week 2)
1. ✅ Already done: `useActiveShoppingSessions`
2. 🔄 Convert `useFamilyMembers` to real-time
3. 🔄 Add transaction support for shopping session updates
4. 🔄 Medical log race condition prevention

### Medium Priority (Week 3-4)
- Household duty real-time updates
- Patient profile change notifications
- Caregiver activity monitoring

### Low Priority (Future)
- Historical data queries (keep as manual fetch - no need for real-time)
- Analytics dashboards (batch updates acceptable)
- Report generation (static snapshots)

## Performance Considerations

### When NOT to Use Real-Time Listeners
- Large historical datasets (>100 records)
- Static reference data (rarely changes)
- User-initiated actions only (no background updates)
- High-frequency updates causing excessive re-renders

### Optimization Techniques
1. **Query Scoping**: Always use `where()` to limit listener scope
2. **Index Strategy**: Ensure Firestore indexes exist for all query combinations
3. **Debouncing**: Use debounce for high-frequency updates
4. **Pagination**: For large lists, combine real-time with pagination

## Testing Strategy

### Verify Real-Time Updates
```typescript
// Test concurrent updates
test('should receive real-time updates when family member is added', async () => {
  const { result } = renderHook(() => useFamilyMembers({ patientId: 'test-patient' }))

  // Add member in separate session
  await medicalOperations.family.addFamilyMember('test-patient', newMember)

  // Wait for real-time update
  await waitFor(() => {
    expect(result.current.familyMembers).toContainEqual(
      expect.objectContaining({ id: newMember.id })
    )
  })
})
```

## Monitoring & Metrics

### Track These Metrics
- Firestore read/write operations count
- Listener connection count (Firebase console)
- Average time from update to UI reflect
- Memory usage over time

### Alert Thresholds
- Listener count > 50 per user session (potential leak)
- Read operations > 100k/day (optimize queries)
- Failed transactions > 5% (race condition issues)

## Migration Checklist

For each hook being converted:
- [ ] Identify current fetch pattern
- [ ] Design onSnapshot query with proper indexes
- [ ] Implement listener with error handling
- [ ] Add cleanup/unsubscribe logic
- [ ] Test concurrent access scenarios
- [ ] Monitor Firestore usage after deployment
- [ ] Update documentation

## Next Steps

1. Create Firestore indexes for planned queries
2. Convert `useFamilyMembers` to real-time (highest impact)
3. Add transaction support for critical operations
4. Implement comprehensive testing for concurrent scenarios
5. Monitor Firebase billing after changes

---

**Last Updated:** 2026-03-07
**Status:** Planning Phase - Ready for Implementation
