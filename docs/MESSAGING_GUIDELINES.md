# Messaging Guidelines - AI Terminology Strategy

## Overview

**Why We Replaced Generic "AI" with Branded/Technical Terms**

This project implements a strategic 3-layer messaging architecture to balance search discoverability, healthcare credibility, and brand differentiation. Instead of generic "AI" references throughout the product, we use:

- **SEO Layer**: "AI" keywords preserved for search engine optimization
- **Marketing Layer**: Technical authority terms (Computer Vision, Machine Learning, NLP) for healthcare credibility
- **Product Layer**: Branded WPL terminology (WPL Vision™, Wellness Intelligence, WPL Prescribe™) for trust and differentiation

**Key Benefits:**
- ✅ Maintains SEO performance with "AI" keywords on public pages
- ✅ Builds healthcare authority with technical precision in marketing content
- ✅ Establishes proprietary brand identity in product UI
- ✅ Centralizes terminology for consistency across 750+ references
- ✅ Enables easy updates without scattered find-replace operations

---

## 3-Layer Messaging Architecture

### Layer 1: SEO/Marketing (Preserve "AI")

**When to Use:** Meta tags, page titles, H1 headlines on public-facing pages, landing pages, blog posts, marketing materials

**Purpose:** Search engine discoverability and broad market appeal

**Example Terms:**
- "AI-Powered Meal Tracking"
- "AI Health Insights & Predictions"
- "AI Medication Label Scanner"
- "AI Wellness Coach"

**Implementation:**
```typescript
import { getSEOHeadline, getSEOKeywords } from '@/lib/messaging/terminology'

// In page metadata
export const metadata = {
  title: getSEOHeadline('mealTracking'), // "AI-Powered Meal Tracking"
  keywords: getSEOKeywords('mealTracking').join(', ')
}
```

---

### Layer 2: Public Pages (Technical Specificity)

**When to Use:** Landing pages (below fold), pricing pages, feature pages, documentation, technical content for healthcare professionals

**Purpose:** Establish technical authority and healthcare credibility

**Example Terms:**
- "Computer Vision Meal Analysis"
- "Predictive Health Analytics Engine"
- "Clinical-Grade OCR & NLP Medication Parser"
- "Conversational AI Health Coaching"

**Implementation:**
```typescript
import { getMarketingHeadline, getTechnicalDetails } from '@/lib/messaging/terminology'

// In marketing sections
<section>
  <h2>{getMarketingHeadline('healthInsights')}</h2>
  <p>{getTechnicalDetails('healthInsights')}</p>
</section>
```

---

### Layer 3: Product UI (Branded Terms)

**When to Use:** All authenticated product pages, dashboards, forms, buttons, tooltips, help text, feature labels

**Purpose:** Proprietary brand identity, trust-building, product differentiation

**Example Terms:**
- "WPL Vision™" (meal photo tracking)
- "Wellness Intelligence" (health insights)
- "WPL Prescribe™" (medication parsing)
- "Smart Suggestions" (shopping recommendations)
- "Wellness Coach" (AI coaching)

**Implementation:**
```typescript
import { getProductLabel, getTooltip } from '@/lib/messaging/terminology'

// In product UI
<h2>{getProductLabel('mealTracking')}</h2> {/* "WPL Vision™" */}
<Tooltip text={getTooltip('mealTracking')}>
  <InfoIcon />
</Tooltip>
```

---

## Terminology Reference

Quick lookup table for developers:

| Feature | SEO Term | Marketing Term | Product Term |
|---------|----------|----------------|--------------|
| **Meal Tracking** | AI-Powered Meal Tracking | Computer Vision Meal Analysis | WPL Vision™ |
| **Health Insights** | AI Health Insights & Predictions | Predictive Health Analytics Engine | Wellness Intelligence |
| **Medication Parsing** | AI Medication Label Scanner | Clinical-Grade OCR & NLP Medication Parser | WPL Prescribe™ |
| **Shopping Suggestions** | AI Smart Shopping Lists | Intelligent Shopping Recommendation Engine | Smart Suggestions |
| **Recipe Generation** | AI Recipe Generator | Adaptive Recipe Generation System | Recipe Generator |
| **AI Coaching** | AI Wellness Coach | Conversational AI Health Coaching | Wellness Coach |
| **Weight Projections** | AI Wellness Predictions | Predictive Weight Modeling | Goal Projections |
| **Nutrition Analysis** | AI Nutrition Analysis | Multi-Modal Nutrition Computation | Nutrition Analysis |
| **Health Correlations** | AI Health Pattern Detection | Multi-Variate Health Correlation Analysis | Health Patterns |
| **Appointment Recommendations** | AI Health Appointment Reminders | Clinical Decision Support for Preventive Care | Checkup Reminders |
| **Expiration Predictions** | AI Food Expiration Tracker | Predictive Inventory Degradation Modeling | Freshness Alerts |
| **Family Health Dashboard** | AI Family Health Dashboard | Unified Multi-Patient Analytics Platform | Family Dashboard |
| **Veterinary Intelligence** | AI Pet Health Tracking | Species-Specific Veterinary Health Analytics | Pet Health Tracking |
| **Barcode Scanning** | AI Barcode Scanner for Groceries | Computer Vision Barcode Recognition | Barcode Scanner |
| **Meal Safety** | AI Meal Safety Checker | Clinical Safety Analysis Engine | Safety Alerts |

---

## Using the Messaging System

### Basic Usage

```typescript
import {
  getProductLabel,      // Most common - for product UI
  getSEOHeadline,       // For meta tags and public page H1s
  getMarketingHeadline, // For landing pages and marketing content
  getTooltip,           // For help text and tooltips
  getTechnicalDetails   // For marketing/documentation details
} from '@/lib/messaging/terminology'

// Product UI
<button>{getProductLabel('mealTracking')}</button>
// Output: "WPL Vision™"

// SEO/Meta
<title>{getSEOHeadline('mealTracking')}</title>
// Output: "AI-Powered Meal Tracking"

// Marketing page
<h2>{getMarketingHeadline('mealTracking')}</h2>
// Output: "Computer Vision Meal Analysis"

// Tooltip
<InfoIcon title={getTooltip('mealTracking')} />
// Output: "Snap a photo and let WPL Vision™ identify your meal..."
```

### Complete Messaging Access

```typescript
import { getCompleteMessaging } from '@/lib/messaging/terminology'

const messaging = getCompleteMessaging('healthInsights')

console.log(messaging)
// {
//   seo: {
//     headline: 'AI Health Insights & Predictions',
//     description: 'Get AI-powered health insights...',
//     keywords: ['AI health insights', 'predictive health analytics', ...]
//   },
//   marketing: {
//     headline: 'Predictive Health Analytics Engine',
//     description: 'Machine learning algorithms analyze...',
//     technicalDetails: 'Time-series analysis with LSTM neural networks...'
//   },
//   product: {
//     label: 'Wellness Intelligence',
//     tooltip: 'Wellness Intelligence analyzes your health patterns...',
//     shortDescription: 'Smart health insights'
//   }
// }
```

### Checking Available Features

```typescript
import { getAllFeatureKeys } from '@/lib/messaging/terminology'

const allFeatures = getAllFeatureKeys()
// ['mealTracking', 'healthInsights', 'medicationParsing', ...]
```

### Validation

```typescript
import { validateMessaging } from '@/lib/messaging/terminology'

const validation = validateMessaging()

if (!validation.valid) {
  console.error('Incomplete messaging:', validation.issues)
}
```

---

## Do's and Don'ts

### ✅ DO

1. **DO use `getProductLabel()` for all product UI components**
   ```typescript
   // ✅ GOOD
   <h1>{getProductLabel('mealTracking')}</h1>

   // ❌ BAD
   <h1>AI Meal Tracking</h1>
   ```

2. **DO use `getSEOHeadline()` for public page titles and meta tags**
   ```typescript
   // ✅ GOOD
   export const metadata = {
     title: getSEOHeadline('healthInsights')
   }
   ```

3. **DO use `getMarketingHeadline()` for landing page content**
   ```typescript
   // ✅ GOOD - below-fold marketing section
   <section className="features">
     <h2>{getMarketingHeadline('medicationParsing')}</h2>
     <p>{getTechnicalDetails('medicationParsing')}</p>
   </section>
   ```

4. **DO provide tooltips for branded terms that may be unfamiliar**
   ```typescript
   // ✅ GOOD
   <Tooltip text={getTooltip('mealTracking')}>
     <span>{getProductLabel('mealTracking')}</span>
   </Tooltip>
   ```

5. **DO add new features to the messaging system when creating new functionality**
   ```typescript
   // ✅ GOOD - Add to lib/messaging/terminology.ts
   export const FEATURE_MESSAGING = {
     newFeature: {
       seo: { headline: 'AI ...', description: '...', keywords: [...] },
       marketing: { headline: 'Technical ...', description: '...', technicalDetails: '...' },
       product: { label: 'Brand Name', tooltip: '...', shortDescription: '...' }
     }
   }
   ```

### ❌ DON'T

1. **DON'T hardcode "AI" in product components**
   ```typescript
   // ❌ BAD
   <h2>AI-Powered Meal Tracking</h2>

   // ✅ GOOD
   <h2>{getProductLabel('mealTracking')}</h2>
   ```

2. **DON'T use branded terms in SEO content**
   ```typescript
   // ❌ BAD - Search engines won't find "WPL Vision"
   <title>WPL Vision™ - Meal Tracking</title>

   // ✅ GOOD
   <title>{getSEOHeadline('mealTracking')}</title>
   ```

3. **DON'T mix messaging layers inappropriately**
   ```typescript
   // ❌ BAD - Using SEO term in product UI
   <Dashboard>
     <h1>AI Health Insights</h1>
   </Dashboard>

   // ✅ GOOD
   <Dashboard>
     <h1>{getProductLabel('healthInsights')}</h1>
   </Dashboard>
   ```

4. **DON'T create custom terminology without updating the central system**
   ```typescript
   // ❌ BAD
   const MEAL_FEATURE_NAME = 'Smart Meal AI'

   // ✅ GOOD
   import { getProductLabel } from '@/lib/messaging/terminology'
   const MEAL_FEATURE_NAME = getProductLabel('mealTracking')
   ```

5. **DON'T use technical jargon in product UI**
   ```typescript
   // ❌ BAD - Too technical for product users
   <Button>Multi-Modal Nutrition Computation</Button>

   // ✅ GOOD
   <Button>{getProductLabel('nutritionAnalysis')}</Button>
   ```

---

## Context Decision Tree

Use this flowchart to determine which messaging layer to use:

```
Is this content visible to non-authenticated users?
│
├─ YES → Is it the main page headline (H1) or meta tags?
│   │
│   ├─ YES → Use SEO Layer (getSEOHeadline)
│   │         "AI-Powered Meal Tracking"
│   │
│   └─ NO → Is it below-fold marketing content?
│       │
│       ├─ YES → Use Marketing Layer (getMarketingHeadline)
│       │         "Computer Vision Meal Analysis"
│       │
│       └─ NO → Use context-appropriate layer
│
└─ NO → Is it authenticated product UI?
    │
    └─ YES → Use Product Layer (getProductLabel)
              "WPL Vision™"
```

---

## Adding New Features

When adding a new feature that involves AI/ML, follow this process:

### 1. Define Complete Messaging

Add to `lib/messaging/terminology.ts`:

```typescript
export const FEATURE_MESSAGING: Record<string, FeatureMessaging> = {
  // ... existing features ...

  newFeatureName: {
    seo: {
      headline: 'AI-Powered [Feature Name]',
      description: 'Brief SEO-friendly description with AI keywords',
      keywords: ['AI keyword 1', 'AI keyword 2', 'AI keyword 3']
    },
    marketing: {
      headline: 'Technical Marketing Headline (e.g., Computer Vision ...)',
      description: 'Detailed technical marketing description establishing authority',
      technicalDetails: 'Deep technical details (e.g., CNN-based processing with ...)'
    },
    product: {
      label: 'WPL Branded Name™ or Simple Product Name',
      tooltip: 'User-friendly explanation of what this does and how it helps',
      shortDescription: 'Brief 2-3 word description'
    }
  }
}
```

### 2. Update Documentation

Add the new feature to this document's terminology reference table.

### 3. Use Consistently

```typescript
// In product UI
import { getProductLabel } from '@/lib/messaging/terminology'
<FeatureButton>{getProductLabel('newFeatureName')}</FeatureButton>

// In landing pages
import { getSEOHeadline } from '@/lib/messaging/terminology'
<title>{getSEOHeadline('newFeatureName')}</title>

// In marketing content
import { getMarketingHeadline } from '@/lib/messaging/terminology'
<h2>{getMarketingHeadline('newFeatureName')}</h2>
```

### 4. Validate

```typescript
import { validateMessaging } from '@/lib/messaging/terminology'

// Run validation to ensure complete messaging
const validation = validateMessaging()
console.assert(validation.valid, validation.issues)
```

---

## Trust-Building Messaging

### Security & Privacy

When discussing AI/ML features, always emphasize:

**HIPAA Compliance:**
- "HIPAA-Secure Processing"
- "Patient Data Privacy Protected"
- "Clinical-Grade Security"

**Proprietary Technology:**
- "No Third-Party AI APIs"
- "Proprietary Machine Learning"
- "WPL-Owned Technology"

**Data Control:**
- "Your Data Stays With You"
- "No Data Sold to Third Parties"
- "End-to-End Encrypted"

### Example Implementation

```typescript
import { TrustBadge } from '@/components/ui/TrustBadge'

<section>
  <h2>{getProductLabel('mealTracking')}</h2>
  <p>{getTooltip('mealTracking')}</p>

  <TrustBadge variant="default" />
  {/* Displays: HIPAA-Secure | No Third-Party AI APIs | Proprietary ML */}
</section>
```

---

## Migration Guide

### Replacing Existing "AI" References

**Before (Scattered hardcoded terms):**
```typescript
// Multiple files with inconsistent terminology
<h1>AI Meal Tracking</h1>
<Button>AI-Powered Analysis</Button>
<title>AI Health Insights | WPL</title>
```

**After (Centralized messaging system):**
```typescript
import { getProductLabel, getSEOHeadline } from '@/lib/messaging/terminology'

<h1>{getProductLabel('mealTracking')}</h1>
<Button>{getProductLabel('nutritionAnalysis')}</Button>
<title>{getSEOHeadline('healthInsights')} | WPL</title>
```

### Search & Replace Strategy

1. **Identify all "AI" references:**
   ```bash
   grep -r "AI" components/ app/ --include="*.tsx" --include="*.ts"
   ```

2. **Categorize by context:**
   - Product UI → `getProductLabel()`
   - SEO/Meta → `getSEOHeadline()`
   - Marketing → `getMarketingHeadline()`

3. **Replace systematically:**
   - Start with product UI (most visible to users)
   - Then public pages (SEO impact)
   - Finally marketing content

4. **Validate consistency:**
   ```bash
   npm run test -- terminology
   ```

---

## Testing Guidelines

### Unit Tests

```typescript
import {
  getProductLabel,
  getSEOHeadline,
  getMarketingHeadline,
  validateMessaging
} from '@/lib/messaging/terminology'

describe('Messaging System', () => {
  test('returns correct product labels', () => {
    expect(getProductLabel('mealTracking')).toBe('WPL Vision™')
    expect(getProductLabel('healthInsights')).toBe('Wellness Intelligence')
  })

  test('returns correct SEO headlines', () => {
    expect(getSEOHeadline('mealTracking')).toContain('AI')
  })

  test('all features have complete messaging', () => {
    const validation = validateMessaging()
    expect(validation.valid).toBe(true)
  })
})
```

### Manual Testing Checklist

- [ ] Product UI uses branded terms (WPL Vision™, Wellness Intelligence, etc.)
- [ ] Public page titles include "AI" for SEO
- [ ] Marketing sections use technical authority terms
- [ ] Tooltips provide clear explanations of branded terms
- [ ] Trust badges appear on key product pages
- [ ] No hardcoded "AI" in product components
- [ ] SEO keywords include "AI" variants
- [ ] Meta descriptions are compelling and keyword-rich

---

## Performance Considerations

### Client-Side Optimization

The messaging system uses simple object lookups with no async operations:

```typescript
// O(1) lookup - no performance impact
const label = getProductLabel('mealTracking')
```

### Build-Time Optimization

For static pages, messaging can be resolved at build time:

```typescript
export const metadata = {
  title: getSEOHeadline('mealTracking'), // Resolved at build time
}
```

### Runtime Optimization

Messaging functions are pure and memoizable:

```typescript
import { useMemo } from 'react'

const label = useMemo(() => getProductLabel('mealTracking'), [])
```

---

## Future Enhancements

### Internationalization (i18n)

The messaging system is designed to support future i18n:

```typescript
// Future enhancement
export function getProductLabel(featureKey: string, locale: string = 'en-US'): string {
  const messaging = FEATURE_MESSAGING[featureKey]
  return messaging?.product[locale]?.label || messaging?.product.label || featureKey
}
```

### A/B Testing

The centralized system enables easy A/B testing:

```typescript
import { getProductLabel } from '@/lib/messaging/terminology'
import { useABTest } from '@/hooks/useABTest'

const label = useABTest('meal-tracking-label', {
  control: getProductLabel('mealTracking'),
  variant: 'Snap & Track'
})
```

### Analytics Integration

Track messaging effectiveness:

```typescript
import { getProductLabel } from '@/lib/messaging/terminology'
import { trackEvent } from '@/lib/analytics'

const label = getProductLabel('mealTracking')
trackEvent('feature_label_displayed', { feature: 'mealTracking', label })
```

---

## Troubleshooting

### Issue: "Unknown feature key" Warning

**Cause:** Feature key not defined in `FEATURE_MESSAGING`

**Solution:** Add the feature to `lib/messaging/terminology.ts`

```typescript
export const FEATURE_MESSAGING = {
  yourFeature: {
    seo: { headline: '...', description: '...', keywords: [] },
    marketing: { headline: '...', description: '...' },
    product: { label: '...', tooltip: '...', shortDescription: '...' }
  }
}
```

### Issue: Messaging Not Updating

**Cause:** Client-side caching or stale imports

**Solution:**
1. Restart dev server: `npm run dev`
2. Clear Next.js cache: `rm -rf .next`
3. Verify import path: `@/lib/messaging/terminology`

### Issue: SEO Terms Appearing in Product UI

**Cause:** Using wrong messaging function

**Solution:** Use appropriate function for context:
- Product UI: `getProductLabel()`
- SEO: `getSEOHeadline()`
- Marketing: `getMarketingHeadline()`

---

## Related Documentation

- **[Feature Gating System](./FEATURE_GATING.md)** - Subscription-based feature access control
- **[Security Architecture](./SECURITY_ARCHITECTURE.md)** - HIPAA compliance and data protection
- **[Product Requirements](../MASTER_PRD.md)** - Complete product specification
- **[Marketing Strategy](./LANDING_PAGE_MARKETING_FLOW.md)** - Marketing messaging flows

---

## Changelog

### Phase 5 - AI Terminology Replacement (2026-01-06)
- ✅ Created centralized messaging system (`lib/messaging/terminology.ts`)
- ✅ Defined 15 core features with 3-layer messaging (SEO/Marketing/Product)
- ✅ Implemented helper functions for easy messaging access
- ✅ Added validation utilities for messaging completeness
- ✅ Created comprehensive documentation and usage guidelines
- ✅ Added trust badges for security and proprietary technology emphasis

---

## Contact & Support

For questions about messaging strategy or implementation:

- **Technical Questions:** Check `lib/messaging/terminology.ts` for implementation details
- **Marketing Questions:** Review the terminology reference table for appropriate terms
- **New Feature Messaging:** Follow the "Adding New Features" section above

---

**Remember:** Consistency is key. Always use the centralized messaging system instead of hardcoding terminology. This ensures we can evolve our brand messaging without scattered find-replace operations across the codebase.
