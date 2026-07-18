/**
 * Blog authors — single source of truth for E-E-A-T bylines.
 *
 * Every blog post attributes to a real person here (Experience + Authoritativeness
 * pillars). The same record drives the visible byline (AuthorByline) and the
 * Person author schema (blogPostingSchema), so they never drift.
 *
 * NOTE: `name` is the public byline. Confirm the exact name/photo you want to
 * publish under before shipping — it appears on the page and in structured data.
 */

import { SITE_URL } from '@/lib/seo'

export interface BlogAuthor {
  id: string
  /** Public byline name. */
  name: string
  /** Short role shown under the name, e.g. "Founder & Family Caregiver". */
  role: string
  /** First-person E-E-A-T bio. Must be genuinely true. */
  bio: string
  /** Canonical author URL (for Person schema `url`). */
  url: string
  /** Optional headshot path under /public. */
  avatar?: string
  /** Topics the author is knowledgeable about (Person schema `knowsAbout`). */
  knowsAbout?: string[]
}

export const BLOG_AUTHORS: Record<string, BlogAuthor> = {
  founder: {
    id: 'founder',
    name: 'Percy Rice',
    role: 'Founder & Family Caregiver',
    bio: "I'm the founder of Wellness Projection Lab and a family caregiver. I built this platform after living the daily reality of coordinating medications, appointments, and supplies for the people I love — so other families could do it with less stress and more confidence.",
    url: `${SITE_URL}/about`,
    knowsAbout: [
      'family caregiving',
      'medication management',
      'health tracking',
      'care coordination',
    ],
  },
}

/** Resolve an author by id, defaulting to the founder. */
export function getBlogAuthor(id: string = 'founder'): BlogAuthor {
  return BLOG_AUTHORS[id] ?? BLOG_AUTHORS.founder
}
