# Messaging Guidelines — AI vs Self-Teaching ML Terminology Strategy

## Overview

**Why we differentiate AI from self-teaching ML in our copy**

WPL is built on **two distinct technology layers**, and our public copy must reflect that honestly:

- **AI (LLM-based, Gemini Vision)** — used **only** for instant photo-based capture: meal photo analysis and medical document OCR. These are real LLM features.
- **Self-teaching ML (WPL-owned)** — used for **everything that learns from each family member over time**: health reports, weight projections, recipe recommendations, shopping suggestions, dashboard insights, pattern detection, coaching (roadmap).

Conflating the two is a credibility risk. Calling rule-based statistics "AI" or claiming "Conversational AI Health Coaching" when no chatbot exists turns AI summarizers and journalists into amplifiers of false claims. This document is the policy that prevents that.

**The 3-layer messaging architecture is preserved**, but each layer now uses terms that **accurately reflect** which tech actually powers each feature:

- **SEO Layer**: Search-discoverable terms that match the feature's real tech (AI for vision/OCR; self-teaching for personalization; smart for rule-based)
- **Marketing Layer**: Technical authority terms (Computer Vision, Time-series ML, USPSTF rule-based) — never use vaporware phrases like "Conversational AI" or "GPT-4 fine-tuned" for features that don't exist
- **Product Layer**: Branded WPL terminology (WPL Vision™, Wellness Intelligence, WPL Prescribe™) for trust and differentiation

**Key Benefits:**
- ✅ Honest SEO that holds up to scrutiny — AI tools and journalists can't catch us inflating
- ✅ "Self-teaching" is actually a stronger differentiator than "AI" — competitors all claim AI; few can claim the system genuinely learns each user over time
- ✅ Builds healthcare authority with technical precision (no fabricated stack claims)
- ✅ Establishes proprietary brand identity in product UI
- ✅ Centralizes terminology so the AI/ML split stays consistent

## Quick reference: which word for which feature?

| If the feature uses... | Use this word | Examples |
|---|---|---|
| Gemini Vision (LLM) | **AI** | Meal photo analysis, medical document OCR |
| Self-teaching ML that learns each family's data | **Self-Teaching** | Health reports, weight projections, recipes, shopping, insights |
| Heuristic / threshold logic | **Smart** | Appointment reminders (weight + vitals + intervals), notification batching |
| Not yet built | **(Coming soon)** + roadmap label | Coach, goal recommendations |

> ⚠️ **Do NOT claim USPSTF, clinical decision support, or "expert system" capabilities.** WPL's appointment recommendation engine is a heuristic on weight trends, vital sign thresholds, and appointment intervals. It does not codify USPSTF Recommendation Statements, compute A/B/C/D grades, or integrate with Prevention TaskForce. Claiming otherwise is a regulated-domain credibility risk.

When in doubt, check `lib/messaging/terminology.ts` — it's the source of truth and per-feature classification is encoded there.

---

## 3-Layer Messaging Architecture

### Layer 1: SEO/Marketing (Search-discoverable terms accurate to each feature's tech)

**When to Use:** Meta tags, page titles, H1 headlines on public-facing pages, landing pages, blog posts, marketing materials

**Purpose:** Search engine discoverability with terms that match what the feature actually does

**Example Terms (correct usage by feature type):**
- "AI-Powered Meal Tracking" *(✓ accurate — Gemini Vision)*
- "AI Medication Label Scanner" *(✓ accurate — Gemini Vision OCR)*
- "Self-Teaching Health Insights & Predictions" *(rule-based stats + scoring → self-teaching)*
- "Self-Teaching Wellness Coach (Coming Soon)" *(roadmap — never claim "AI Coach" present-tense)*
- "Smart Appointment Reminders" *(rule-based on USPSTF guidelines, not ML/AI)*

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
- "Computer Vision Meal Analysis" *(Gemini Vision)*
- "Clinical-Grade OCR Medication Parser" *(Gemini Vision)*
- "Predictive Health Analytics Engine" *(self-teaching ML — time-series statistical models)*
- "Self-Teaching Shopping Recommendation Engine" *(collaborative filtering)*
- "Predictive Wellness Coaching" *(roadmap — never describe as "Conversational AI" or "GPT-4 fine-tuned"; the platform does not have an LLM-based chatbot)*
- "Heuristic Appointment Recommendations" *(weight/vital trend heuristics — do NOT claim USPSTF, clinical decision support, A/B grade recommendations, or Prevention TaskForce integration; none of those are implemented)*

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
- "WPL Vision™" (meal photo tracking — Gemini Vision)
- "Wellness Intelligence" (health insights — self-teaching ML)
- "WPL Prescribe™" (medication parsing — Gemini Vision OCR)
- "Smart Suggestions" (shopping recommendations — self-teaching ML)
- "Predictive Coach" (data-driven coaching — roadmap, not yet shipped)

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

| Feature | Tech Layer | SEO Term | Marketing Term | Product Term |
|---------|-----------|----------|----------------|--------------|
| **Meal Tracking** | AI (Gemini Vision) | AI-Powered Meal Tracking | Computer Vision Meal Analysis | WPL Vision™ |
| **Medication Parsing** | AI (Gemini Vision OCR) | AI Medication Label Scanner | Clinical-Grade OCR Medication Parser | WPL Prescribe™ |
| **Nutrition Analysis** | AI (Gemini Vision) | AI Nutrition Analysis | Multi-Modal Nutrition Computation | Nutrition Analysis |
| **Health Insights** | Self-Teaching ML | Self-Teaching Health Insights & Predictions | Predictive Health Analytics Engine | Wellness Intelligence |
| **Weight Projections** | Self-Teaching ML | Self-Teaching Weight Loss Projections | Predictive Weight Modeling | Goal Projections |
| **Recipe Generation** | Self-Teaching ML *(+Gemini Flash for missing steps)* | Self-Teaching Recipe Recommendations | Adaptive Recipe Recommendation System | Recipe Recommendations |
| **Shopping Suggestions** | Self-Teaching ML | Self-Teaching Smart Shopping Lists | Self-Teaching Shopping Recommendation Engine | Smart Suggestions |
| **Health Correlations** | Self-Teaching ML | Self-Teaching Health Pattern Detection | Multi-Variate Health Correlation Analysis | Health Patterns |
| **Expiration Predictions** | Self-Teaching ML | Self-Teaching Food Expiration Tracker | Predictive Inventory Degradation Modeling | Freshness Alerts |
| **Veterinary Intelligence** | Self-Teaching ML | Self-Teaching Pet Health Tracking | Species-Specific Veterinary Health Analytics | Pet Health Tracking |
| **Barcode Scanning** | Self-Teaching ML *(OpenFoodFacts lookup)* | Smart Barcode Scanner for Groceries | Barcode Recognition with Product Lookup | Barcode Scanner |
| **Meal Safety** | Self-Teaching ML | Self-Teaching Meal Safety Checker | Clinical Safety Analysis Engine | Safety Alerts |
| **Appointment Recommendations** | Heuristic (weight + vitals + intervals) | Smart Appointment Reminders | Heuristic Appointment Recommendations | Checkup Reminders |
| **Family Health Dashboard** | Self-Teaching ML | Family Health Dashboard | Unified Multi-Patient Analytics Platform | Family Dashboard |
| **Coaching** *(roadmap — not shipped)* | Self-Teaching ML *(planned)* | Self-Teaching Wellness Coach (Coming Soon) | Predictive Wellness Coaching | Predictive Coach |

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

// SEO/Meta — feature-dependent. AI for vision; Self-Teaching for ML; Smart for rule-based.
<title>{getSEOHeadline('mealTracking')}</title>
// Output: "AI-Powered Meal Tracking" (this one is genuine AI — Gemini Vision)
//
// vs.
<title>{getSEOHeadline('healthInsights')}</title>
// Output: "Self-Teaching Health Insights & Predictions" (ML personalization, NOT AI)

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
//     headline: 'Self-Teaching Health Insights & Predictions',
//     description: 'Personalized health insights, weight predictions, and wellness recommendations that adapt to your family's patterns over time',
//     keywords: ['self-teaching health insights', 'predictive health analytics', 'personalized wellness insights']
//   },
//   marketing: {
//     headline: 'Predictive Health Analytics Engine',
//     description: 'Self-teaching ML algorithms analyze your health data to identify trends...',
//     technicalDetails: 'Time-series analysis with statistical models for outcome prediction; learns each family member's baseline over time'
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
       // Use "AI ..." ONLY if the feature is genuinely LLM/Vision-based.
       // Use "Self-Teaching ..." for ML personalization.
       // Use "Smart ..." for rule-based logic.
       seo: { headline: 'Self-Teaching ...', description: '...', keywords: [...] },
       marketing: { headline: 'Technical ...', description: '...', technicalDetails: '...' },
       product: { label: 'Brand Name', tooltip: '...', shortDescription: '...' }
     }
   }
   ```

6. **DO label roadmap features explicitly** — never claim a feature is shipped if it isn't. Use "Coming Soon" suffix in SEO headlines and `(roadmap)` notes in product copy.

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
│   │         "AI-Powered Meal Tracking" (vision feature → AI is accurate)
│   │         OR "Self-Teaching Health Insights" (ML feature → never call AI)
│   │
│   └─ NO → Is it below-fold marketing content?
│       │
│       ├─ YES → Use Marketing Layer (getMarketingHeadline)
│       │         "Computer Vision Meal Analysis"
│       │         OR "Predictive Health Analytics Engine" (ML)
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

When adding a new feature that involves AI or ML, follow this process. **First, determine which technology layer it belongs to** (see the Quick Reference table at the top of this document):

- **Genuine AI?** → uses Gemini Vision or another LLM/multimodal model. SEO term should use "AI ...".
- **Self-teaching ML?** → learns from each family's data over time. SEO term should use "Self-Teaching ...".
- **Rule-based?** → static logic, clinical guidelines, or thresholds. SEO term should use "Smart ..." (no AI/ML claim).
- **Roadmap?** → not yet shipped. SEO term must include "(Coming Soon)" and product label must include `(roadmap)`.

### 1. Define Complete Messaging

Add to `lib/messaging/terminology.ts`:

```typescript
export const FEATURE_MESSAGING: Record<string, FeatureMessaging> = {
  // ... existing features ...

  newFeatureName: {
    seo: {
      // Pick the prefix that matches reality: "AI" (Gemini/LLM only),
      // "Self-Teaching" (ML personalization), or "Smart" (rule-based).
      headline: 'Self-Teaching [Feature Name]',
      description: 'Brief SEO-friendly description that accurately reflects how the feature works',
      keywords: ['accurate keyword 1', 'accurate keyword 2', 'accurate keyword 3']
    },
    marketing: {
      headline: 'Technical Marketing Headline (e.g., Computer Vision ... or Predictive ML ...)',
      description: 'Detailed technical marketing description establishing authority — only claim techniques actually used in the implementation',
      technicalDetails: 'Deep technical details that match the real implementation (e.g., Gemini Vision 2.5 Pro, time-series regression, USPSTF rule-based)'
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

**Hybrid Architecture (honest framing):**
- "AI capture (Gemini Vision under BAA) + Self-Teaching ML (WPL-owned)"
- "Self-Teaching ML on WPL-owned infrastructure"
- "Vision processing under HIPAA Business Associate Agreement with Google"

> ⚠️ **Do NOT use "No Third-Party AI APIs"** — this claim is false. WPL uses Google Gemini Vision (under HIPAA BAA) for meal photo analysis and medical document OCR. Inflating this into a "no third party" claim is a credibility risk and potentially a compliance one. The honest framing — Gemini for capture under BAA, WPL-owned ML for everything else — is actually a stronger story.

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
  {/* Displays: HIPAA-Secure | Self-Teaching ML | BAA with Google for AI Vision */}
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

### Phase 6 - Honest AI vs Self-Teaching ML Reframe (2026-05-02)
- ✅ Audited every "AI" claim against the actual implementation; identified ~10 features mislabeled as AI when they are self-teaching ML or rule-based
- ✅ Reclassified each of the 15 features in `lib/messaging/terminology.ts` by tech layer (AI / Self-Teaching ML / Rule-based / Roadmap)
- ✅ Updated SEO Layer policy: "AI" prefix reserved for genuine LLM/Vision features (meal photo analysis, medical document OCR); "Self-Teaching" used for ML personalization; "Smart" used for rule-based features
- ✅ Removed false "No Third-Party AI APIs" trust badge claim — Gemini Vision is used under HIPAA BAA
- ✅ Removed vaporware claims like "Conversational AI Health Coaching" / "GPT-4 fine-tuned" from marketing copy; flagged Coach + Goal Recommendations as roadmap with "(Coming Soon)" suffix
- ✅ Reframed across the user-facing site: 8 blog posts, homepage SoftwareApplication schema, llms.txt, Organization schema, franchise page, README, MASTER_PRD

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
