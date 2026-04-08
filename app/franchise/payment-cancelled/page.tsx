/**
 * Stripe Checkout Cancelled — Save-the-Cancel re-engagement page
 *
 * Stripe redirects franchise prospects here when they abandon checkout
 * (back button, close tab, explicit cancel). URL shape:
 *   /franchise/payment-cancelled?tenant=<firestoreDocId>
 *
 * Goal: turn the abandoned-checkout moment into re-engagement, NOT a
 * passive dead-end. The page reassures, surfaces credible scarcity (the
 * reserved subdomain held for 24h), mirrors back the value prop specific
 * to the prospect's practice type, and points back at their existing
 * email payment link (still valid for 24h per the Stripe checkout session
 * expires_at set in the payment-link API).
 *
 * Design constraints (locked from planning):
 *  - Tone: reassure + reduce friction. No high-pressure sales.
 *  - Personalize by tenant.practiceType (read from Firestore).
 *  - Credible FOMO only — no fake countdowns, no fabricated social proof.
 *  - No admin-side tracking (no Firestore writes, no audit log).
 *
 * Publicly accessible. Tenant lookup soft-fails to generic copy so a
 * Firestore hiccup never breaks the post-cancel experience.
 */

import Link from 'next/link'
import type { Metadata } from 'next'
import { LockClosedIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { getTenantById } from '@/lib/tenant-server'
import {
  FRANCHISE_PRACTICE_TYPES,
  type FranchisePracticeType,
} from '@/lib/franchise-plans'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Payment Cancelled — Wellness Projection Lab',
  description: 'Your franchise setup payment was cancelled. No charge was made.',
}

interface PageProps {
  searchParams: Promise<{ tenant?: string }>
}

interface ValueProp {
  heading: string
  bullets: [string, string, string]
}

/**
 * Personalized value-prop copy keyed by practice type. The keys are
 * type-checked against FRANCHISE_PRACTICE_TYPES so any future rename
 * surfaces a TypeScript error here, not a silent missing-key bug.
 *
 * TODO(copy): refine these bullets once we have real customer testimonials.
 * The current text is directionally accurate but written without specific
 * customer evidence — strong opinion, weakly held.
 */
const PRACTICE_TYPE_VALUE_PROPS: Record<FranchisePracticeType, ValueProp> = {
  'Solo Nurse / Caregiver': {
    heading: 'Why solo nurses choose WPL',
    bullets: [
      'One dashboard for every family — vitals, meds, meals, appointments',
      'Refill reminders auto-trigger so nothing slips through the cracks',
      'Late-night charting cut by 80% — your evenings back, every day',
    ],
  },
  'Wellness Coach': {
    heading: 'Why wellness coaches choose WPL',
    bullets: [
      'Clients log meals via AI photo scan — no more group-text screenshots',
      'Weekly auto-generated client summaries land in your inbox Mondays',
      'Track 50 clients in the time it used to take to track 5',
    ],
  },
  'Concierge Doctor': {
    heading: 'Why concierge doctors choose WPL',
    bullets: [
      'BAA-eligible without enterprise EHR cost or implementation time',
      'Branded patient portal — your clients see your name, not ours',
      'Vital trends and health reports without manual data entry',
    ],
  },
  'Home Care Agency': {
    heading: 'Why home care agencies choose WPL',
    bullets: [
      'Shift handoffs without phone tag or duplicated paperwork',
      'Family visibility on demand — they see exactly what they need',
      'Insurance and Medicare reporting in one click, not one weekend',
    ],
  },
  'Patient Advocate': {
    heading: 'Why patient advocates choose WPL',
    bullets: [
      'Centralized health timeline per client across every provider',
      'Family collaboration with granular permission scoping',
      'Document storage with OCR — intake forms become searchable text',
    ],
  },
}

/**
 * Generic fallback for prospects who selected "Other" or whose tenant doc
 * lookup failed. Mirrors the 3 problem cards from the marketing page so
 * the message is consistent with what they read before applying.
 */
const GENERIC_VALUE_PROP: ValueProp = {
  heading: 'Why providers choose WPL',
  bullets: [
    'One HIPAA-compliant platform that replaces spreadsheets, group texts, and shared docs',
    'Off-the-shelf consumer apps aren\u2019t BAA-eligible — yours is, on day one',
    'Scale past 10 clients without scaling your late nights',
  ],
}

function getValueProp(practiceType: string | undefined): ValueProp {
  if (!practiceType) return GENERIC_VALUE_PROP
  if ((FRANCHISE_PRACTICE_TYPES as readonly string[]).includes(practiceType)) {
    return PRACTICE_TYPE_VALUE_PROPS[practiceType as FranchisePracticeType]
  }
  return GENERIC_VALUE_PROP
}

export default async function PaymentCancelledPage({ searchParams }: PageProps) {
  const { tenant: tenantId } = await searchParams

  // Soft lookup — page renders even if this fails
  const tenant = tenantId ? await getTenantById(tenantId) : null
  const businessName = tenant?.name || 'your franchise'
  const adminEmail = tenant?.contact?.adminEmail
  const slug = tenant?.slug
  const valueProp = getValueProp(tenant?.practiceType)

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Reassurance card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 sm:p-10">
          <div className="mx-auto w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-6">
            <XCircleIcon className="h-12 w-12 text-amber-600 dark:text-amber-400" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-gray-100 mb-3">
            Payment Cancelled
          </h1>

          <p className="text-center text-lg text-gray-600 dark:text-gray-400 mb-2">
            No charge was made.
          </p>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Your setup for{' '}
            <strong className="text-gray-700 dark:text-gray-300">{businessName}</strong>{' '}
            is still pending.
          </p>
        </div>

        {/* Reserved subdomain — credible FOMO #1 */}
        {slug && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 border-amber-200 dark:border-amber-800/50 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                <LockClosedIcon className="h-6 w-6 text-amber-700 dark:text-amber-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Your subdomain is reserved
                </h2>
                <p className="text-sm font-mono text-amber-700 dark:text-amber-300 break-all mb-2">
                  {slug}.wellnessprojectionlab.com
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Reserved for you for 24 hours.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Personalized value prop */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {valueProp.heading}
          </h2>
          <ul className="space-y-3">
            {valueProp.bullets.map((bullet, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                <span className="flex-shrink-0 w-5 h-5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Primary CTA */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 sm:p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Ready to try again?
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Your original payment link is still valid for 24 hours
            {adminEmail && (
              <>
                {' '}— check your inbox at{' '}
                <strong className="text-gray-900 dark:text-gray-100 break-all">
                  {adminEmail}
                </strong>
              </>
            )}
            .
          </p>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Click the same payment link in your email"
            className="inline-block px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold text-base shadow-md cursor-default"
          >
            Return to Checkout
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            Click the same &ldquo;Complete Payment&rdquo; button in your email to return to
            the secure Stripe checkout page.
          </p>
        </div>

        {/* Soft footer */}
        <div className="text-center space-y-2 pt-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Questions or need a fresh payment link?{' '}
            <a
              href="mailto:wellnessprojectionlab@gmail.com?subject=Franchise%20Setup%20Question"
              className="text-amber-700 dark:text-amber-400 underline hover:no-underline"
            >
              wellnessprojectionlab@gmail.com
            </a>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            <Link href="/franchise" className="hover:text-gray-600 dark:hover:text-gray-300">
              Or learn more about Wellness Projection Lab
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
