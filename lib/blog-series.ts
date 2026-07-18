/**
 * Blog series / content clusters — single source of truth for interlinked
 * post groups. Drives the SeriesNav (prev/next + full list) so a cluster builds
 * real topical authority instead of one-off posts.
 */

export interface BlogSeriesPart {
  slug: string
  title: string
  /** One-line "why read this next" hook, shown on the previous post's next-link. */
  teaser?: string
}

export interface BlogSeries {
  id: string
  title: string
  description: string
  parts: BlogSeriesPart[]
}

export const BLOG_SERIES: Record<string, BlogSeries> = {
  'organized-caregiver': {
    id: 'organized-caregiver',
    title: 'The Organized Caregiver: Mastering Your Family Inventory',
    description:
      'A practical series on cutting the mental load of caregiving — from centralizing information to tracking supplies to automating the daily routine.',
    parts: [
      { slug: 'caregiver-mental-clutter', title: "Why Mental Clutter Is a Caregiver's Biggest Enemy", teaser: 'Start here: why the mental load piles up — and how to set it down.' },
      { slug: 'caregiver-supply-tracking', title: 'Beyond the Kitchen: Tracking Essential Medical & Household Supplies', teaser: 'Ready to stop buying duplicate gauze? Track supplies so you never run out.' },
      { slug: 'caregiver-routine-automation', title: 'Compliance & Peace of Mind: Automating Your Caregiver Routine', teaser: 'Stop relying on memory — let reminders run the daily routine for you.' },
    ],
  },
  'caregiver-logistics': {
    id: 'caregiver-logistics',
    title: 'Caregiver Logistics: Getting Organized, Step by Step',
    description:
      'Step-by-step how-to guides for the daily logistics of caregiving — organizing documents, managing medication schedules, and tracking vitals at home without the overwhelm.',
    parts: [
      { slug: 'organize-medical-documents', title: 'How to Organize Medical Documents for Aging Parents', teaser: 'Find any record in seconds — a step-by-step system for the paperwork.' },
      { slug: 'medication-schedules-seniors', title: 'Managing Daily Medication Schedules for Seniors', teaser: 'Build an accurate daily routine and stop the missed-and-doubled-dose worry.' },
      { slug: 'track-vitals-at-home', title: 'How to Track Vital Signs at Home (Without Getting Overwhelmed)', teaser: 'Monitor the numbers that matter — without turning into a nurse.' },
    ],
  },
  'health-data-security': {
    id: 'health-data-security',
    title: "Protecting Your Family's Health Data",
    description:
      'Why family health information deserves healthcare-grade security, and how to share updates with caregivers without putting sensitive data at risk.',
    parts: [
      { slug: 'healthcare-grade-security-why', title: 'Why Digital Health Tracking Needs Healthcare-Grade Security', teaser: 'Know what "healthcare-grade" really means before you trust an app.' },
      { slug: 'share-health-data-securely', title: "How to Keep Your Family's Health Data Secure While Sharing Updates", teaser: 'Keep siblings and sitters in the loop without the risky group text.' },
    ],
  },
  'vitals-explained': {
    id: 'vitals-explained',
    title: 'Vitals, Explained (In Plain English)',
    description:
      'Straight answers to the questions caregivers actually search — what the numbers mean and how often to check them, in everyday language.',
    parts: [
      { slug: 'sudden-blood-pressure-change', title: 'What Does a Sudden Change in Blood Pressure Mean?', teaser: 'What that surprising reading might mean — and when to get help fast.' },
      { slug: 'how-often-check-blood-sugar', title: 'How Often Should You Record Blood Sugar Levels?', teaser: 'A simple guide to how often to check — and why timing matters.' },
    ],
  },
}

export function getSeries(id: string): BlogSeries | undefined {
  return BLOG_SERIES[id]
}

/** Find which series a post slug belongs to, plus its zero-based position. */
export function getSeriesForSlug(slug: string): { series: BlogSeries; index: number } | undefined {
  for (const series of Object.values(BLOG_SERIES)) {
    const index = series.parts.findIndex(p => p.slug === slug)
    if (index !== -1) return { series, index }
  }
  return undefined
}
