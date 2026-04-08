/**
 * Stripe Checkout Cancelled — Save-the-Cancel v2 narrative redesign.
 *
 * Stripe redirects franchise prospects here when they abandon checkout
 * (back button, close tab, explicit cancel). URL shape:
 *   /franchise/payment-cancelled?tenant=<firestoreDocId>
 *
 * THIS PAGE EXISTS TO CONVERT, NOT TO CONFIRM.
 *
 * Every claim and number on this page traces back to a specific line in
 * FRANCHISE_PRD.json. No invented stories. No fabricated outcome metrics.
 * No competitor pricing claims. The PRD is the source of truth and this
 * page is its translation. If you find yourself wanting to add a number
 * or claim that the PRD doesn't support, either remove it or update the
 * PRD first.
 *
 * Narrative spine (PRD references):
 *  - Cost anchor:    product.positioning ("missing middle between
 *                    off-the-shelf consumer apps... and custom builds
 *                    ($100k+, 6-12 months)")
 *  - Hero promise:   product.vision ("launch in 48 hours without writing
 *                    code or buying infrastructure")
 *  - Pain mirror:    product.targetUsers (5 entries, one per practice type)
 *  - Differentiators: product.keyDifferentiators (6 entries)
 *  - Pricing math:   dataModels.FranchisePlan.tiers + SETUP_FEE_USD
 *
 * Honesty constraints (locked):
 *  - No competitor names. PRD doesn't name them; we don't either.
 *  - No fabricated outcome numbers (hours saved, clients added, etc).
 *  - No fake countdown timers. The 24-hour reserved subdomain is real.
 *  - No social proof counts ("trusted by N providers") until we have them.
 *
 * Publicly accessible. Tenant lookup soft-fails to generic copy so a
 * Firestore hiccup never breaks the post-cancel experience.
 */

import Link from 'next/link'
import type { Metadata } from 'next'
import {
  LockClosedIcon,
  CalendarDaysIcon,
  BoltIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CheckBadgeIcon,
  StarIcon,
} from '@heroicons/react/24/outline'
import { getTenantById } from '@/lib/tenant-server'
import {
  FRANCHISE_PRACTICE_TYPES,
  SETUP_FEE_USD,
  type FranchisePracticeType,
} from '@/lib/franchise-plans'
import { DemoRequestButton } from '@/components/DemoRequestButton'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Reconsider — Wellness Projection Lab',
  description:
    'You stepped away from checkout. No charge was made. Here\u2019s why $3,000 is the bargain.',
}

interface PageProps {
  searchParams: Promise<{ tenant?: string }>
}

/**
 * Practice-type-specific pain mirror sentences. Each entry is sourced
 * verbatim from FRANCHISE_PRD.json product.targetUsers, lightly rephrased
 * to address the prospect in second person. Keys are type-checked against
 * the canonical FRANCHISE_PRACTICE_TYPES list so any future rename
 * triggers a TypeScript error here, not a silent missing-key bug.
 */
const PAIN_MIRRORS: Record<FranchisePracticeType, string> = {
  'Solo Nurse / Caregiver':
    'You\u2019re a solo nurse who needs HIPAA-compliant client management \u2014 without becoming a software company.',
  'Wellness Coach':
    'You\u2019re a wellness coach scaling past 10 clients \u2014 without hiring developers or building software.',
  'Concierge Doctor':
    'You want a branded patient portal \u2014 without paying enterprise EHR prices for features you\u2019ll never use.',
  'Home Care Agency':
    'You\u2019re running a home care agency with multiple caregivers and dozens of families \u2014 coordinated through phone tag and shared docs that don\u2019t scale.',
  'Patient Advocate':
    'You\u2019re a patient advocate who\u2019s been doing this on spreadsheets and Dropbox \u2014 and you\u2019re finally ready to digitize the practice.',
}

const GENERIC_PAIN_MIRROR =
  'You\u2019re an independent care provider building a real practice \u2014 not a hobby \u2014 and you need infrastructure that respects that.'

function getPainMirror(practiceType: string | undefined): string {
  if (!practiceType) return GENERIC_PAIN_MIRROR
  if ((FRANCHISE_PRACTICE_TYPES as readonly string[]).includes(practiceType)) {
    return PAIN_MIRRORS[practiceType as FranchisePracticeType]
  }
  return GENERIC_PAIN_MIRROR
}

/**
 * The 6 differentiators sourced verbatim (or lightly compressed) from
 * FRANCHISE_PRD.json product.keyDifferentiators. Order is intentional:
 * the most concrete/verifiable claims come first.
 */
const DIFFERENTIATORS = [
  {
    icon: BoltIcon,
    title: '48-hour launch',
    detail: 'Automated tenant provisioning end-to-end.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'HIPAA + BAA',
    detail: 'Most no-code platforms cannot offer this.',
  },
  {
    icon: PaintBrushIcon,
    title: 'True white-label',
    detail: 'Branded subdomain, logo, colors, company name.',
  },
  {
    icon: SparklesIcon,
    title: 'AI-augmented',
    detail: 'One provider can manage 50+ families.',
  },
  {
    icon: CheckBadgeIcon,
    title: 'Quality filter',
    detail: '$3,000 setup fee means no hobbyists \u2014 only serious practices.',
  },
  {
    icon: StarIcon,
    title: 'Premium boutique pricing',
    detail: '$750\u2013$2,000/mo aligned with high-touch services.',
  },
] as const

export default async function PaymentCancelledPage({ searchParams }: PageProps) {
  const { tenant: tenantId } = await searchParams

  // Soft lookup — page renders even if this fails
  const tenant = tenantId ? await getTenantById(tenantId) : null
  const businessName = tenant?.name || 'your franchise'
  const adminEmail = tenant?.contact?.adminEmail
  const slug = tenant?.slug
  const painMirror = getPainMirror(tenant?.practiceType)

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto space-y-10">

        {/* ──────────────────────────────────────────────────────────────
            HERO + COST ANCHOR
            The first thing the eye sees. Reframes $3,000 as the bargain
            it actually is by anchoring against the PRD's "missing middle"
            positioning: consumer apps vs. $100k+ custom builds.
            ────────────────────────────────────────────────────────────── */}
        <header className="text-center">
          <p className="text-sm uppercase tracking-widest text-amber-700 dark:text-amber-400 font-semibold mb-3">
            Before you go &mdash;
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
            ${SETUP_FEE_USD.toLocaleString()} is real money.
            <br />
            <span className="text-amber-600 dark:text-amber-400">
              So is the cost of <em>not</em> solving this.
            </span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-5 max-w-xl mx-auto">
            Here&rsquo;s the math we wish every prospect saw before they walked away.
          </p>
        </header>

        {/* The cost-anchor table — the most persuasive thing on the page.
            Three rows, sourced from product.positioning in FRANCHISE_PRD. */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Three ways to run a HIPAA-compliant practice
            </h2>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">

            {/* Row 1: Off-the-shelf consumer apps */}
            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  Off-the-shelf consumer apps
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Cheap. Fast. Generic. <strong>Not BAA-eligible.</strong> No white-label.
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-mono text-gray-700 dark:text-gray-300">Free &ndash; $50/mo</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Today</div>
              </div>
            </div>

            {/* Row 2: Custom build */}
            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  Build your own platform
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Yours. Branded. <strong>Slow and expensive.</strong> Hire developers, ship in 6 to 12 months.
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-mono text-gray-700 dark:text-gray-300">$100,000+</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">6&ndash;12 months</div>
              </div>
            </div>

            {/* Row 3: WPL — visually highlighted */}
            <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-l-4 border-amber-500">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <StarIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div className="font-bold text-gray-900 dark:text-gray-100">
                    Wellness Projection Lab Franchise
                  </div>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  <strong>Branded. BAA-eligible. AI-powered. Live in 48 hours.</strong>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-mono text-amber-700 dark:text-amber-300 font-bold">
                  ${SETUP_FEE_USD.toLocaleString()} + $750/mo
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  48 hours
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-3 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong>This is the bargain.</strong> Everything below is the proof.
            </p>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────────
            THE PAIN MIRROR (practice-type personalized) + RESERVED SUBDOMAIN
            One sentence from PRD targetUsers + the universal consequence
            sentence. Then the credible FOMO embedded as a sub-element.
            ────────────────────────────────────────────────────────────── */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
          <p className="text-base text-gray-500 dark:text-gray-400 mb-2 font-medium">
            We get it.
          </p>
          <p className="text-xl sm:text-2xl text-gray-900 dark:text-gray-100 leading-snug font-semibold">
            {painMirror}
          </p>
          <p className="text-base text-gray-600 dark:text-gray-400 mt-4 leading-relaxed">
            Every new client means more spreadsheet rows, more late-night charting, more
            Sundays spent on logistics instead of care. The 11th client is the one that
            breaks the system.
          </p>

          {slug && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-11 h-11 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                  <LockClosedIcon className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Your subdomain is already reserved
                  </div>
                  <div className="text-sm font-mono text-amber-700 dark:text-amber-300 break-all mb-1">
                    {slug}.wellnessprojectionlab.com
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Reserved for you for 24 hours.
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ──────────────────────────────────────────────────────────────
            THE 6 PROOFS — keyDifferentiators as compact icon strip
            Each one is a verbatim PRD product.keyDifferentiators line.
            ────────────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-5 text-center">
            Six reasons we built this
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DIFFERENTIATORS.map(d => {
              const Icon = d.icon
              return (
                <div
                  key={d.title}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {d.title}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                        {d.detail}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────────
            THE HUMAN SAFETY NET — Schedule a Free Demo
            Reuses DemoRequestButton (existing component, no new infra).
            For a $3K B2B sale at the moment of cancellation doubt, talking
            to a human is the highest-leverage rescue path.
            ────────────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-50 dark:from-purple-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 rounded-2xl border-2 border-purple-200 dark:border-purple-800/50 p-6 sm:p-10 text-center">
          <div className="mx-auto w-14 h-14 bg-purple-100 dark:bg-purple-900/40 rounded-2xl flex items-center justify-center mb-5">
            <CalendarDaysIcon className="h-7 w-7 text-purple-700 dark:text-purple-300" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Want to see it before you commit?
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-400 mb-7 max-w-md mx-auto leading-relaxed">
            Talk to a human. We&rsquo;ll walk through {businessName} and answer every
            question you have about the platform, the contract, and the migration.
          </p>
          <DemoRequestButton
            source="payment-cancelled"
            className="inline-block px-10 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg transition-colors"
          >
            Schedule a Free Demo
          </DemoRequestButton>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-5">
            No commitment. Most calls take 15&ndash;20 minutes.
          </p>
        </section>

        {/* ──────────────────────────────────────────────────────────────
            SOFT RETURN-TO-CHECKOUT (demoted to bottom)
            For prospects who don't need the rest — they just need to be
            told their existing email link still works.
            ────────────────────────────────────────────────────────────── */}
        <section className="bg-white/60 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong className="text-gray-900 dark:text-gray-100">No charge was made.</strong>{' '}
            Your original payment link
            {adminEmail && (
              <>
                {' '}in{' '}
                <strong className="text-gray-900 dark:text-gray-100 break-all">
                  {adminEmail}
                </strong>
              </>
            )}{' '}
            is still valid for 24 hours. Click the same &ldquo;Complete Payment&rdquo; button
            in that email to return to checkout.
          </p>
        </section>

        {/* ──────────────────────────────────────────────────────────────
            Tiny footer
            ────────────────────────────────────────────────────────────── */}
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
