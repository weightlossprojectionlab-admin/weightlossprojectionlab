import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from './seo'
import { PLANS } from './plan-details'

function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

// Platform subscription price range, derived from the single source of truth
// (lib/plan-details.ts). Used by SoftwareApplication schema so the price
// auto-updates when plans change — no hardcoded duplication. Excludes the
// $0 free tier so the rich result shows the real subscription range.
const PAID_PLANS = PLANS.filter((p) => p.monthlyPrice > 0)
const PLATFORM_LOW_PRICE = Math.min(...PAID_PLANS.map((p) => p.monthlyPrice)).toFixed(2)
const PLATFORM_HIGH_PRICE = Math.max(...PAID_PLANS.map((p) => p.monthlyPrice)).toFixed(2)

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    legalName: 'Wellness Projection Lab LLC',
    alternateName: ['WPL', 'Wellness Projection Lab LLC'],
    description:
      'Family health tracking platform for caregivers. HIPAA-compliant medication, vitals, appointment, and meal coordination for aging parents, kids, partners, and pets — with shared access for siblings, spouses, and sitters. Not a financial planning tool.',
    url: SITE_URL,
    logo: absoluteUrl('/icon-512x512.png'),
    sameAs: [
      'https://www.linkedin.com/company/wlpl',
      'https://www.youtube.com/@WellnessProjectionLab',
      'https://www.instagram.com/wellnessprojectionlab/',
      'https://x.com/LossWeight85941',
    ],
    knowsAbout: [
      'Family caregiving',
      'Medication management',
      'Vitals tracking',
      'Aging parent care',
      'Pediatric health tracking',
      'Pet health tracking',
      'HIPAA compliance',
      'Caregiver coordination',
      'Multi-household management',
      'Household duty and chore coordination',
      'Family invitation and role-based access',
      'Kitchen and pantry inventory',
      'Self-teaching ML personalization for family health data',
      'AI vision for meal photo analysis and medical document OCR',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: `${SITE_URL}/contact`,
      availableLanguage: ['English'],
    },
  }
}

export interface BlogPostingInput {
  headline: string
  description: string
  slug: string
  image?: string
  datePublished?: string
  dateModified?: string
  keywords?: string
}

export function blogPostingSchema(input: BlogPostingInput) {
  const url = absoluteUrl(`/blog/${input.slug}`)
  const img = absoluteUrl(input.image || DEFAULT_OG_IMAGE)
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.headline,
    description: input.description,
    image: img,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    url,
    datePublished: input.datePublished,
    dateModified: input.dateModified || input.datePublished,
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/icon-512x512.png'),
      },
    },
    keywords: input.keywords,
  }
}

export interface FAQItem {
  question: string
  answer: string
}

export function faqPageSchema(items: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export interface SoftwareApplicationInput {
  name: string
  description: string
  /** schema.org applicationCategory — defaults to 'HealthApplication'. */
  applicationCategory?: string
  operatingSystem?: string
  url?: string
  image?: string
  /** Human-readable capability list. Surfaced to AI engines as the
   *  product's features — keep these honest and specific. */
  featureList?: string[]
  /** Pricing page link. The price RANGE is derived from lib/plan-details.ts
   *  (real plan prices), not passed per-page. We still emit NO
   *  `aggregateRating` — that requires real review counts we don't have, and
   *  Google/AI engines penalize invented ratings. */
  offersUrl?: string
}

export function softwareApplicationSchema(input: SoftwareApplicationInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: input.name,
    description: input.description,
    applicationCategory: input.applicationCategory ?? 'HealthApplication',
    operatingSystem: input.operatingSystem ?? 'Web, iOS, Android',
    url: input.url ? absoluteUrl(input.url) : SITE_URL,
    ...(input.image ? { image: absoluteUrl(input.image) } : {}),
    ...(input.featureList?.length ? { featureList: input.featureList } : {}),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: PLATFORM_LOW_PRICE,
      highPrice: PLATFORM_HIGH_PRICE,
      offerCount: PAID_PLANS.length,
      category: 'subscription',
      url: absoluteUrl(input.offersUrl ?? '/pricing'),
    },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  }
}

export interface ItemListInput {
  name?: string
  items: { name: string; description?: string; url?: string }[]
}

/** Ordered ItemList — wraps a numbered step sequence so search/AI engines
 *  read it as an ordered set (pairs with an on-page <ol>). */
export function itemListSchema(input: ItemListInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    ...(input.name ? { name: input.name } : {}),
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: input.items.length,
    itemListElement: input.items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.description ? { description: it.description } : {}),
      ...(it.url ? { url: absoluteUrl(it.url) } : {}),
    })),
  }
}

/**
 * schema.org Recipe rich-result schema.
 *
 * Targets Google's Recipe rich result + carousel + 'recipes for you' card,
 * Bing's recipe answer, and AI assistants (Perplexity, ChatGPT browsing,
 * Gemini) that scrape recipe pages for citation. Also drives FAQ-style
 * answers from the per-recipe nutritional + dietary metadata.
 *
 * IMPORTANT — no cloaking. The fields included here MUST match what's
 * visible to users in HTML. If/when ingredient quantities or step text
 * are gated behind auth, recipeIngredient and recipeInstructions must be
 * omitted from this schema for unauth visits — Google penalizes structured
 * data that doesn't match rendered content.
 */
export interface RecipeSchemaInput {
  id: string
  name: string
  description: string
  imageUrls?: string[]
  imageAlts?: string[]
  mealType: string
  /** ISO 8601 duration like 'PT15M' built from prepTime minutes. */
  prepTimeMinutes: number
  servingSize: number
  calories?: number
  macros?: { protein?: number; carbs?: number; fat?: number; fiber?: number }
  dietaryTags?: string[]
  allergens?: string[]
  /** Recipe ingredients in 'natural-language' form ('1 cup flour'). Pass
   *  the SAME strings the page renders. Omit when ingredient text is gated. */
  ingredientStrings?: string[]
  /** Per-step instructions. Pass the SAME steps the page renders.
   *  Omit when step text is gated. */
  recipeSteps?: string[]
  cookingTips?: string[]
}

const DIET_TAG_TO_SCHEMA: Record<string, string> = {
  vegan: 'https://schema.org/VeganDiet',
  vegetarian: 'https://schema.org/VegetarianDiet',
  'gluten-free': 'https://schema.org/GlutenFreeDiet',
  'low-carb': 'https://schema.org/LowCalorieDiet',
  'low-fat': 'https://schema.org/LowFatDiet',
  'low-sodium': 'https://schema.org/LowSaltDiet',
  diabetic: 'https://schema.org/DiabeticDiet',
  halal: 'https://schema.org/HalalDiet',
  kosher: 'https://schema.org/KosherDiet',
}

export function recipeSchema(input: RecipeSchemaInput) {
  const images = input.imageUrls?.length
    ? input.imageUrls.map((url, i) => {
        const alt = input.imageAlts?.[i]?.trim()
        if (alt) {
          return {
            '@type': 'ImageObject',
            url: absoluteUrl(url),
            description: alt,
          }
        }
        return absoluteUrl(url)
      })
    : [absoluteUrl(DEFAULT_OG_IMAGE)]

  const suitableForDiet = (input.dietaryTags || [])
    .map((tag) => DIET_TAG_TO_SCHEMA[tag.toLowerCase()])
    .filter(Boolean)

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: input.name,
    description: input.description,
    image: images,
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/icon-512x512.png'),
      },
    },
    prepTime: `PT${input.prepTimeMinutes}M`,
    totalTime: `PT${input.prepTimeMinutes}M`,
    recipeYield: `${input.servingSize} ${input.servingSize === 1 ? 'serving' : 'servings'}`,
    recipeCategory: input.mealType.charAt(0).toUpperCase() + input.mealType.slice(1),
  }

  if (suitableForDiet.length > 0) {
    schema.suitableForDiet = suitableForDiet
  }

  if (input.allergens && input.allergens.length > 0) {
    // Schema.org doesn't have a canonical allergens field on Recipe,
    // but `keywords` is a documented place for searchable metadata.
    schema.keywords = [
      input.mealType,
      ...(input.dietaryTags || []),
      ...input.allergens.map((a) => `contains ${a}`),
    ].join(', ')
  } else {
    schema.keywords = [
      input.mealType,
      ...(input.dietaryTags || []),
    ].filter(Boolean).join(', ')
  }

  if (input.calories || input.macros) {
    const nutrition: Record<string, unknown> = { '@type': 'NutritionInformation' }
    if (input.calories) nutrition.calories = `${input.calories} calories`
    if (input.macros?.protein !== undefined) nutrition.proteinContent = `${input.macros.protein} g`
    if (input.macros?.carbs !== undefined) nutrition.carbohydrateContent = `${input.macros.carbs} g`
    if (input.macros?.fat !== undefined) nutrition.fatContent = `${input.macros.fat} g`
    if (input.macros?.fiber !== undefined) nutrition.fiberContent = `${input.macros.fiber} g`
    schema.nutrition = nutrition
  }

  if (input.ingredientStrings && input.ingredientStrings.length > 0) {
    schema.recipeIngredient = input.ingredientStrings
  }

  if (input.recipeSteps && input.recipeSteps.length > 0) {
    schema.recipeInstructions = input.recipeSteps.map((text, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text,
    }))
  }

  return schema
}

export interface BreadcrumbItem {
  name: string
  path: string
}

export function breadcrumbListSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}
