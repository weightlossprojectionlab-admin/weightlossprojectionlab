/**
 * Blog post helpers — one place that builds the metadata + JSON-LD every
 * caregiver post needs, so posts stop repeating identical boilerplate.
 *
 * A post declares a single `BlogPostConfig` and calls:
 *   export const metadata = buildBlogPostMetadata(CONFIG)
 *   <JsonLd data={buildBlogPostJsonLd(CONFIG)} />   // JsonLd accepts an array
 */

import type { Metadata } from 'next'
import {
  blogPostingSchema,
  faqPageSchema,
  softwareApplicationSchema,
  breadcrumbListSchema,
  type FAQItem,
} from '@/lib/json-ld'
import { getBlogAuthor } from '@/lib/blog-authors'

export interface BlogPostConfig {
  slug: string
  title: string
  /** Optional SEO/CTR-optimized <title> + OG title, distinct from the on-page
   *  H1 (`title`). Falls back to `title`. The schema headline always uses `title`. */
  metaTitle?: string
  description: string
  keywords: string
  datePublished: string
  dateModified: string
  /** In-app feature route this post's CTA drives; also the SoftwareApplication url. */
  appUrl: string
  /** One-line product framing for the SoftwareApplication schema. */
  appDescription: string
  /** Same const that drives the on-page FaqAccordion (single source → schema + render). */
  faqItems: FAQItem[]
  /** Optional shorter keyword string for the BlogPosting schema (defaults to `keywords`). */
  schemaKeywords?: string
  /** Author id from lib/blog-authors (defaults to the founder). */
  authorId?: string
  /** schema.org `about` topic entities. Defaults to the PHR/caregiving topics
   *  every caregiver post genuinely covers — a real topical signal for AEO/SGE
   *  (not keyword stuffing). Override per post to add specific topics. */
  about?: string[]
  /** Authoritative outbound citations. Single source: drives BOTH the visible
   *  Sources section (<Sources items={CONFIG.citations}/>) and schema `citation`.
   *  Important for YMYL/health-post trust. */
  citations?: BlogSource[]
}

export interface BlogSource {
  label: string
  url: string
}

/** Honest default topics for the caregiver PHR content — true of every post here. */
const DEFAULT_ABOUT = ['Personal Health Record', 'Family Caregiving', 'Care Coordination']

export function buildBlogPostMetadata(c: BlogPostConfig): Metadata {
  const url = `/blog/${c.slug}`
  const seoTitle = c.metaTitle ?? c.title
  return {
    title: { absolute: `${seoTitle} | Wellness Projection Lab` },
    description: c.description,
    keywords: c.keywords,
    alternates: { canonical: url },
    openGraph: { title: seoTitle, description: c.description, type: 'article', url },
    twitter: { card: 'summary_large_image', title: seoTitle, description: c.description },
  }
}

/** Returns the 4 schema objects (BlogPosting+Person, FAQPage, SoftwareApplication, Breadcrumb). */
export function buildBlogPostJsonLd(c: BlogPostConfig) {
  const author = getBlogAuthor(c.authorId)
  const url = `/blog/${c.slug}`
  return [
    blogPostingSchema({
      headline: c.title,
      description: c.description,
      slug: c.slug,
      datePublished: c.datePublished,
      dateModified: c.dateModified,
      keywords: c.schemaKeywords ?? c.keywords,
      author: { name: author.name, url: author.url, jobTitle: author.role, knowsAbout: author.knowsAbout },
      about: c.about ?? DEFAULT_ABOUT,
      ...(c.citations?.length ? { citations: c.citations.map(s => s.url) } : {}),
    }),
    faqPageSchema(c.faqItems),
    softwareApplicationSchema({
      name: 'Wellness Projection Lab',
      description: c.appDescription,
      url: c.appUrl,
    }),
    breadcrumbListSchema([
      { name: 'Blog', path: '/blog' },
      { name: c.title, path: url },
    ]),
  ]
}
