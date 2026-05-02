import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from './seo'

function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

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
