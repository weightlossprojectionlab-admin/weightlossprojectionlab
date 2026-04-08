/**
 * Stripe Checkout Cancelled — Save-the-Cancel v3
 *
 * VOICE: practitioner, not builder. The reader is a nurse, wellness coach,
 * concierge doctor, home care agency owner, or patient advocate at the
 * moment of cancellation doubt. They are NOT a software buyer evaluating
 * SaaS categories. Every line speaks to the reality of starting their own
 * business, the families they care for, and working from any device anywhere.
 *
 * See `feedback_marketing_voice.md` in the auto-memory for the full rule.
 *
 * PERSONALIZATION:
 * - First name (tenant.contact.adminName) — addresses them directly if present
 * - Business name (tenant.name) — used instead of "your franchise"
 * - Incorporation acknowledgment — if entityType present, recognized as a
 *   real business. NEVER displays the entityType value itself.
 * - Credential acknowledgment — if licenseNumber OR npiNumber present,
 *   recognized as a real licensed professional. NEVER displays the values.
 * - Practice type lead sentence — keyed by tenant.practiceType
 *
 * The line: acknowledge the FACT, never list the VALUE. "You did the
 * paperwork to make this real" is warm. "You incorporated as an LLC in
 * New Jersey on March 4 with EIN 12-3456789" is surveillance.
 *
 * Every personalization is conditional on its source field existing.
 * Soft-fail to generic copy in every degenerate combination. The page
 * never displays an undefined value or a blank line.
 *
 * Every CLAIM still traces to FRANCHISE_PRD.json (positioning, vision,
 * targetUsers, keyDifferentiators, FranchisePlan.tiers). The voice
 * translation does not introduce new claims.
 *
 * Stripe redirects franchise prospects here when they abandon checkout
 * (back button, close tab, explicit cancel). URL shape:
 *   /franchise/payment-cancelled?tenant=<firestoreDocId>
 *
 * Publicly accessible. Tenant lookup soft-fails to generic copy.
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
  DevicePhoneMobileIcon,
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
  title: 'Before you go — Wellness Projection Lab',
  description:
    'You stepped away from checkout. No charge was made. Here\u2019s what we know about you, and why we built this.',
}

interface PageProps {
  searchParams: Promise<{ tenant?: string }>
}

/**
 * Practice-type lead sentences in PRACTITIONER VOICE.
 * Each one is sourced conceptually from FRANCHISE_PRD.json product.targetUsers
 * but rewritten in the voice of someone who has actually been there. The
 * specifics (Mrs. Henderson, parking lot, kitchen counter) are universal
 * enough to land for any reader of that practice type without claiming
 * something we can't verify.
 *
 * TODO(copy): refine these once we have real customer testimonials. The
 * current draft is directionally correct and emotionally specific without
 * making numerical claims the PRD doesn't support.
 */
const PRACTICE_TYPE_LEADS: Record<FranchisePracticeType, string> = {
  'Solo Nurse / Caregiver':
    'You\u2019re the only set of hands. You charted Mrs. Henderson\u2019s vitals from a parking lot at 2pm and you\u2019ll write up the visit notes after the kids are in bed. You know exactly what your day looks like.',
  'Wellness Coach':
    'You started this because you wanted to help people get healthy \u2014 not because you wanted to chase down food photos in group texts at 11pm. The 11th client is the one that started breaking the system.',
  'Concierge Doctor':
    'You left the hospital so your patients could call you by your first name. You don\u2019t need the EHR your old employer used. You need the care your patients showed up for.',
  'Home Care Agency':
    'You\u2019ve got nurses in cars across the county and families calling at 8am asking what dose Mrs. Henderson is on. The phone tag isn\u2019t sustainable. Neither is the binder under your front seat.',
  'Patient Advocate':
    'You\u2019ve been the family\u2019s voice in rooms full of doctors who don\u2019t have time. You\u2019ve been doing this on spreadsheets and Post-its for too long. The work is too important for the tools.',
}

const GENERIC_LEAD =
  'You\u2019re not a hobbyist. You\u2019re building something real \u2014 the kind of practice families recommend by name.'

function getPracticeLead(practiceType: string | undefined): string {
  if (!practiceType) return GENERIC_LEAD
  if ((FRANCHISE_PRACTICE_TYPES as readonly string[]).includes(practiceType)) {
    return PRACTICE_TYPE_LEADS[practiceType as FranchisePracticeType]
  }
  return GENERIC_LEAD
}

/**
 * Extract just the first word of the admin name for the conversational
 * "Percy, we know..." pattern. Falls back to empty string if missing.
 * Avoids displaying "Percy Rice, we know..." which feels formal.
 */
function getFirstName(adminName: string | undefined): string {
  if (!adminName) return ''
  const trimmed = adminName.trim()
  if (!trimmed) return ''
  return trimmed.split(/\s+/)[0]
}

/**
 * 6 differentiators retranslated from product.keyDifferentiators (PRD)
 * into practitioner voice. Each card claim still maps to a PRD entry —
 * only the wording is translated.
 */
const DIFFERENTIATORS = [
  {
    icon: BoltIcon,
    title: 'Live by Friday',
    detail: 'Apply Monday. On your subdomain by Friday. No 6-month roadmap.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'The kind your hospital lawyer would approve',
    detail: 'HIPAA-compliant infrastructure with a real BAA. Same posture as your former employer.',
  },
  {
    icon: PaintBrushIcon,
    title: 'Your name on it',
    detail: 'Your logo. Your colors. Your front door for the families you serve.',
  },
  {
    icon: SparklesIcon,
    title: 'The AI does the catching-up',
    detail: 'You do the caring. One provider, the families of fifty.',
  },
  {
    icon: CheckBadgeIcon,
    title: 'Built for serious practices',
    detail: 'Not where you build a hobby \u2014 where you build a real business.',
  },
  {
    icon: StarIcon,
    title: 'Priced for boutique',
    detail: '$750\u2013$2,000/mo. The price point of someone who takes their practice seriously.',
  },
] as const

export default async function PaymentCancelledPage({ searchParams }: PageProps) {
  const { tenant: tenantId } = await searchParams

  // Soft lookup — page renders even if this fails
  const tenant = tenantId ? await getTenantById(tenantId) : null

  // Personalization fields, all optional + soft-failing
  const firstName = getFirstName(tenant?.contact?.adminName)
  const businessName = tenant?.name || ''
  const businessNameDisplay = businessName || 'your practice'
  const slug = tenant?.slug
  const adminEmail = tenant?.contact?.adminEmail
  const hasIncorporation = !!tenant?.entityType
  const hasCredentials = !!(tenant?.licenseNumber || tenant?.npiNumber)
  const practiceLead = getPracticeLead(tenant?.practiceType)

  // Comma-prefix for natural insertion into sentences when first name is present
  const namePrefix = firstName ? `${firstName}, ` : ''
  const nameCapPrefix = firstName ? `${firstName}, ` : ''

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto space-y-10">

        {/* ──────────────────────────────────────────────────────────────
            HERO — practitioner voice, addressed by first name if present.
            ────────────────────────────────────────────────────────────── */}
        <header className="text-center">
          <p className="text-sm uppercase tracking-widest text-amber-700 dark:text-amber-400 font-semibold mb-3">
            Before you go &mdash;
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
            {nameCapPrefix && <>{nameCapPrefix}</>}
            ${SETUP_FEE_USD.toLocaleString()}.00 is a lot.
            <br />
            <span className="text-amber-600 dark:text-amber-400">
              We know.
            </span>
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 mt-6 max-w-2xl mx-auto leading-relaxed">
            But so is another year of charting at 11pm. Another Sunday at the
            kitchen table catching up on the families you&rsquo;ve been holding
            together with sticky notes and group texts. Another family you couldn&rsquo;t
            take on because there was no room left on the spreadsheet.
          </p>
        </header>

        {/* ──────────────────────────────────────────────────────────────
            COST ANCHOR — same 3 rows from v2, retranslated to practitioner
            voice. The structure stays because it's the most persuasive
            block on the page. The labels are the part that needs to feel
            like a friend explaining it, not a vendor pitching.
            ────────────────────────────────────────────────────────────── */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Three ways to do this. Here&rsquo;s the math.
            </h2>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">

            {/* Row 1 */}
            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  The free app your cousin uses
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Cheap. Generic. <strong>Not the kind your hospital lawyer would approve.</strong>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-mono text-gray-700 dark:text-gray-300">Free &ndash; $50/mo</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Today</div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  Build your own
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Yours. Branded. <strong>And gone in 6 to 12 months</strong> while you interview developers and burn through savings.
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-mono text-gray-700 dark:text-gray-300">$100,000+</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">6&ndash;12 months</div>
              </div>
            </div>

            {/* Row 3 — highlighted */}
            <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-l-4 border-amber-500">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <StarIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div className="font-bold text-gray-900 dark:text-gray-100">
                    Your name on it, by Friday
                  </div>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  <strong>Branded. AI-powered. The kind your hospital lawyer would actually approve.</strong>
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
              <strong>This is the bargain.</strong> Everything below is why.
            </p>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────────
            HERE'S WHAT WE KNOW ABOUT YOU — credential personalization
            block. Replaces the v2 generic pain mirror. Every line is
            conditional on its source field existing. Acknowledges facts,
            never displays values.
            ────────────────────────────────────────────────────────────── */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
          <p className="text-base text-gray-500 dark:text-gray-400 mb-4 font-medium">
            {firstName
              ? `Here\u2019s what we know about you, ${firstName}.`
              : 'Here\u2019s what we know about people like you.'}
          </p>

          {/* Practice-type-specific lead sentence — sourced from
              PRACTICE_TYPE_LEADS, soft-fails to GENERIC_LEAD */}
          <p className="text-xl sm:text-2xl text-gray-900 dark:text-gray-100 leading-snug font-semibold mb-5">
            {practiceLead}
          </p>

          {/* Acknowledgments — each one independent, conditional on its
              source field. The page reads smoothly in every combination. */}
          <ul className="space-y-3 text-base text-gray-700 dark:text-gray-300 leading-relaxed">
            {hasIncorporation && (
              <li className="flex gap-3">
                <span className="flex-shrink-0 mt-1 text-amber-600 dark:text-amber-400">
                  &mdash;
                </span>
                <span>
                  You did the paperwork to make this a real business. That means something.
                </span>
              </li>
            )}
            {hasCredentials && (
              <li className="flex gap-3">
                <span className="flex-shrink-0 mt-1 text-amber-600 dark:text-amber-400">
                  &mdash;
                </span>
                <span>
                  You&rsquo;re a licensed professional. We built this for someone like you &mdash;
                  not a hobbyist.
                </span>
              </li>
            )}
            <li className="flex gap-3">
              <span className="flex-shrink-0 mt-1 text-amber-600 dark:text-amber-400">
                &mdash;
              </span>
              <span>
                <strong className="text-gray-900 dark:text-gray-100">{businessNameDisplay}</strong>{' '}
                isn&rsquo;t a side project. It&rsquo;s the practice you&rsquo;re building.
              </span>
            </li>
          </ul>

          {/* Reserved subdomain banner — kept from v2, embedded here */}
          {slug && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-11 h-11 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                  <LockClosedIcon className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    We&rsquo;re holding your subdomain for you
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
            FROM WHEREVER YOU HAPPEN TO BE — the device freedom block.
            User explicitly called out this missing angle. The single most
            concrete promise we make about daily life.
            ────────────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 rounded-2xl border border-orange-200 dark:border-orange-800/40 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm">
              <DevicePhoneMobileIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                From wherever you happen to be.
              </h2>
              <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                The tablet in your car between visits. The phone in your pocket at
                the grocery store. The laptop on the kitchen counter after the kids
                go to bed.
              </p>
              <p className="text-base text-gray-900 dark:text-gray-100 font-semibold leading-relaxed">
                Wherever you are, the families you care for are already there waiting.
              </p>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────────
            THE 6 PROOFS — same grid as v2, retranslated copy.
            Every claim still traces to PRD product.keyDifferentiators.
            ────────────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-5 text-center">
            Six reasons we built this for you
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
            Same DemoRequestButton, retranslated surrounding copy.
            Personalized with business name when present.
            ────────────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-50 dark:from-purple-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 rounded-2xl border-2 border-purple-200 dark:border-purple-800/50 p-6 sm:p-10 text-center">
          <div className="mx-auto w-14 h-14 bg-purple-100 dark:bg-purple-900/40 rounded-2xl flex items-center justify-center mb-5">
            <CalendarDaysIcon className="h-7 w-7 text-purple-700 dark:text-purple-300" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Want to talk to a real human first?
          </h2>
          <p className="text-base text-gray-700 dark:text-gray-300 mb-7 max-w-md mx-auto leading-relaxed">
            We&rsquo;ll walk through{' '}
            <strong className="text-gray-900 dark:text-gray-100">{businessNameDisplay}</strong>{' '}
            with you and answer every question &mdash; about the platform, the contract,
            what migration looks like, and whether this is even the right fit for what
            you&rsquo;re building.
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
            SOFT RETURN-TO-CHECKOUT — single sentence, demoted.
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
            is still good for 24 hours. Come back when you&rsquo;re ready.
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
