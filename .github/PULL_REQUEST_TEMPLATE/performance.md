# Performance Optimization PR

## 🎯 Performance Goal
<!-- What performance issue are you fixing? -->


## 📊 Metrics
<!-- Provide before/after measurements -->

### Bundle Size
| Route | Before | After | Change | % Improvement |
|-------|--------|-------|--------|---------------|
|       |        |       |        |               |

### Lighthouse Scores (if applicable)
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Performance |  |  |  |
| LCP (Largest Contentful Paint) |  |  |  |
| TBT (Total Blocking Time) |  |  |  |
| CLS (Cumulative Layout Shift) |  |  |  |

### Load Time
- **Before:**
- **After:**
- **Improvement:**

## 🔧 Optimizations Applied
<!-- Mark completed optimizations with [x] -->

- [ ] Code splitting / Dynamic imports
- [ ] Lazy loading components
- [ ] Image optimization
- [ ] Removed unused dependencies
- [ ] Reduced bundle size
- [ ] Improved render performance
- [ ] Memoization added
- [ ] Debouncing/throttling
- [ ] Other: _____________

## 📝 Implementation Details
<!-- Explain what you changed and why -->

**What was causing the performance issue:**
-

**How this PR fixes it:**
-

**Technical approach:**
-

## ⚠️ Trade-offs
<!-- Are there any downsides to this optimization? -->

- None
- (or list trade-offs)

## 🧪 Testing
<!-- How did you verify the performance improvement? -->

- [ ] Ran `npm run build` and verified bundle size reduction
- [ ] Tested page load times
- [ ] Ran Lighthouse audit
- [ ] Tested on slow network (Fast 3G)
- [ ] Tested on low-end device
- [ ] Verified no functionality was broken
- [ ] All existing tests pass

## 📸 Evidence
<!-- Screenshots of bundle analysis, Lighthouse scores, Network tab, etc. -->


## 🚀 Deployment Notes
<!-- Any special considerations for deployment? -->

- [ ] No breaking changes
- [ ] Cache needs to be cleared
- [ ] CDN needs to be purged
- [ ] Other: _____________

## 💰 Impact
<!-- Financial or user experience impact -->

**Saves:**
- Build minutes: (if reduces production deploys)
- User experience: (faster loads, better UX)
- SEO: (improved Lighthouse scores)

---

## Reviewer Checklist

- [ ] Bundle size reduction is significant and justified
- [ ] No functionality was broken
- [ ] Performance tests confirm improvement
- [ ] Code remains maintainable
- [ ] No new performance bottlenecks introduced
