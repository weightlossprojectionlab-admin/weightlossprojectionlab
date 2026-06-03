/**
 * Medications - Marketing Blog Page
 *
 * "Every Pill, Every Person, Every Reminder — Handled"
 * Medication Safety System showcase page
 * Optimized for SEO with conversion funnel
 */

import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { blogPostingSchema, faqPageSchema, softwareApplicationSchema, itemListSchema } from '@/lib/json-ld'
import { Metadata } from 'next'
import {
  BeakerIcon,
  BellIcon,
  CalendarIcon,
  PhotoIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ArrowRightIcon,
  CurrencyDollarIcon,
  PuzzlePieceIcon,
  ClipboardDocumentCheckIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

const PAGE_TITLE = 'Medication Reminder App for Families & Elderly Parents'
const PAGE_DESCRIPTION =
  'Never miss a dose — for your kids, your aging parents, or yourself. Track medications across every family member with smart reminders, refill alerts, and shared caregiver access. HIPAA-compliant.'
const PAGE_IMAGE =
  'https://www.wellnessprojectionlab.com/screenshots/medications/medication-management-grid-desktop-light.png'
const PAGE_URL = 'https://www.wellnessprojectionlab.com/blog/medications'

export const metadata: Metadata = {
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESCRIPTION,
  keywords:
    'medication reminder app for elderly parents, family medication tracker, pill reminder app for caregivers, medication tracking for multiple family members, medication adherence app, refill alerts, caregiver medication app, HIPAA medication reminder',
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    type: 'article',
    images: [{ url: PAGE_IMAGE, width: 1200, height: 630, alt: 'Medication reminder app for families — Wellness Projection Lab' }],
    url: PAGE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    images: [PAGE_IMAGE],
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

// Direct, self-contained Q&A — the "dictionary definition" an AI quick-answer
// card can lift verbatim. Kept in sync with the visible FAQ section below so
// the structured data matches on-page content (no schema/content mismatch).
// The first three are the AEO core (definition / who-it's-for / how-different);
// the rest are the high-intent questions families actually ask.
const FAQ_ITEMS = [
  {
    question: 'What is medication management?',
    answer:
      'Medication management is the practice of tracking every medication a person takes — including doses, schedules, and refills — and recording when each dose is actually taken, so adherence can be verified and missed doses caught. Wellness Projection Lab is a HIPAA-compliant platform that does this for every member of a household: it logs each medication, sends reminders at the scheduled time, builds an adherence history, and alerts caregivers when a dose is skipped.',
  },
  {
    question: 'Who is a family medication tracker for?',
    answer:
      "A family medication tracker is for anyone responsible for more than one person's medications — parents managing prescriptions for several children, adult children caring for aging parents from a distance, and multi-caregiver households where siblings, spouses, or home aides share the responsibility and need the same up-to-date medication list and missed-dose alerts.",
  },
  {
    question: 'How is a medication management app different from a basic pill reminder?',
    answer:
      'A basic pill reminder just buzzes one person at a dose time. A medication management app tracks unlimited medications across multiple family members, verifies which doses were actually taken, builds an adherence history, sends refill alerts before bottles run out, alerts caregivers when a dose is missed, and exports a formatted medication list for doctors — turning a single alarm into a shared, closed-loop safety system.',
  },
  {
    question: 'What is the best medication reminder app for elderly parents?',
    answer:
      'The right app for an aging parent is one that (a) handles many medications per person, (b) lets a family member set up and monitor reminders remotely, and (c) alerts caregivers when doses are missed. Wellness Projection Lab was built around these three requirements — a parent (or their in-home caregiver) gets the reminder, and you get visibility from your phone.',
  },
  {
    question: 'Can I track medications for multiple family members in one app?',
    answer:
      'Yes. You can add any number of profiles (kids, parents, grandparents, yourself, pets) and track each person\u2019s medications separately. Every profile has its own medication list, dosing schedule, and adherence history.',
  },
  {
    question: 'How do I set up medication reminders for someone else?',
    answer:
      'Add a profile for the person you\u2019re caring for, enter their medications with doses and schedules, and set up reminders. The reminder can ping the person taking the medication, you, or both. Adherence history is shared with anyone you\u2019ve granted access.',
  },
  {
    question: 'What happens when my parent misses a dose?',
    answer:
      'Missed doses show up on the adherence timeline, and you can configure alerts to notify one or more caregivers when a dose is skipped. No more \u201cDid mom take her pills?\u201d guessing at 9 p.m.',
  },
  {
    question: 'Can I share my parent\u2019s medication list with their doctor?',
    answer:
      'Yes. You can export a formatted, up-to-date medication list as a PDF — with dosages, frequencies, prescribers, and pharmacies — and bring it to any appointment or email it to a provider.',
  },
  {
    question: 'Is Wellness Projection Lab HIPAA compliant?',
    answer:
      'Yes. Wellness Projection Lab is built as a HIPAA-compliant platform with fine-grained access controls, and BAAs are available for practitioners who license the platform.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes — a free 7-day trial with full access. No credit card required. Cancel anytime.',
  },
]

// Single source of truth for the "Medication Safety Net" sequence — drives BOTH
// the on-page <ol> and the ItemList schema, so they never drift. Titles are
// descriptive/keyword-rich for NLP parsing.
const SAFETY_LOOP_STEPS = [
  {
    step: 1,
    label: 'Track Every Medication and Dose',
    description: 'Log every medication, dose, and schedule for each family member.',
  },
  {
    step: 2,
    label: 'Remind at the Scheduled Time',
    description: 'Push notifications fire at the right time for each medication.',
  },
  {
    step: 3,
    label: 'Verify Doses and Build Adherence History',
    description: 'Mark doses taken to build a verified adherence history over time.',
  },
  {
    step: 4,
    label: 'Alert Caregivers on Missed Doses',
    description: 'Notify every authorized caregiver when a dose is skipped.',
  },
]

// Icons are presentational and kept out of the data const (which feeds the
// ItemList schema) so the structured data stays plain text. Index-aligned to
// SAFETY_LOOP_STEPS.
const SAFETY_LOOP_ICONS = [
  <ClipboardDocumentCheckIcon key="track" className="w-8 h-8 text-rose-500" />,
  <BellIcon key="remind" className="w-8 h-8 text-pink-500" />,
  <CheckCircleIcon key="verify" className="w-8 h-8 text-fuchsia-500" />,
  <ExclamationTriangleIcon key="alert" className="w-8 h-8 text-amber-500" />,
]

export default function MedicationsBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd
        data={blogPostingSchema({
          headline: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
          slug: 'medications',
          image: '/screenshots/medications/medication-management-grid-desktop-light.png',
          datePublished: '2026-01-15T00:00:00-05:00',
          keywords:
            'medication reminder app for elderly parents, family medication tracker, pill reminder app for caregivers, medication tracking for multiple family members, medication adherence, refill alerts, caregiver medication app',
        })}
      />
      {/* FAQ schema — lets AI assistants + Google pull a direct quick-answer
          for "What is medication management?" Mirrors the visible FAQ. */}
      <JsonLd data={faqPageSchema(FAQ_ITEMS)} />
      {/* SoftwareApplication — this page describes a product; tell engines its
          category, platforms, and capabilities (incl. the OCR scan feature). */}
      <JsonLd
        data={softwareApplicationSchema({
          name: 'Wellness Projection Lab Medication Management',
          description:
            'A HIPAA-compliant medication management platform that tracks unlimited medications, doses, and schedules for every member of a household, sends smart reminders and refill alerts, verifies adherence, and alerts caregivers when a dose is missed.',
          url: '/blog/medications',
          image: '/screenshots/medications/medication-management-grid-desktop-light.png',
          featureList: [
            'Unlimited medications per family-member profile',
            'Smart dose reminders at scheduled times',
            'Refill alerts before a prescription runs out',
            'Adherence tracking and history',
            'Missed-dose alerts to authorized caregivers',
            'Prescription bottle and label photo capture',
            'Shared multi-caregiver access with permission controls',
            'Provider medication-list PDF export',
          ],
        })}
      />
      {/* ItemList — the "Medication Safety Net" ordered sequence, mirroring the
          on-page <ol> (single source: SAFETY_LOOP_STEPS). */}
      <JsonLd
        data={itemListSchema({
          name: 'The Medication Safety Net',
          items: SAFETY_LOOP_STEPS.map((s) => ({
            name: `${s.step}. ${s.label}`,
            description: s.description,
          })),
        })}
      />
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-rose-600 via-pink-600 to-fuchsia-600 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <ShieldCheckIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Medication Safety System</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              The Medication Reminder App for Everyone You Care For
            </h1>
            <p className="text-xl text-white/90 mb-4 leading-relaxed max-w-3xl mx-auto">
              Track medications for your kids, your aging parents, your partner, and yourself — all
              in one place. Smart reminders, refill alerts, and shared access for every caregiver
              who helps.
            </p>
            {/* AI-snippet line — one clean, self-contained definition an AI
                engine can lift verbatim. Kept consistent with the
                SoftwareApplication schema description. */}
            <p className="text-base text-white/90 mb-8 leading-relaxed max-w-3xl mx-auto">
              <strong>WPL Medication Management</strong> is a HIPAA-compliant platform that tracks
              unlimited medications, doses, and schedules for every member of a household, sends
              reminders and refill alerts, verifies adherence, and alerts caregivers when a dose is
              missed.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-rose-600 rounded-lg hover:bg-rose-50 transition-colors font-semibold shadow-lg"
              >
                Start Free Trial
              </Link>
              <Link
                href="/blog/vitals-tracking"
                className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-semibold"
              >
                See Vitals Tracking
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ============================================ */}
        {/* DEFINITION — direct, snippet-extractable answer.   */}
        {/* Question-form H2 + a self-contained definition is   */}
        {/* the structure AI quick-answer cards + featured      */}
        {/* snippets pull from.                                 */}
        {/* ============================================ */}
        <section className="mb-20 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">What Is Medication Management?</h2>
          <p className="text-lg text-foreground leading-relaxed">
            <strong>Medication management</strong> is the practice of tracking every medication a
            person takes &mdash; including doses, schedules, and refills &mdash; and recording when
            each dose is actually taken, so adherence can be verified and missed doses caught.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed mt-4">
            For a whole household, that means one place to track unlimited medications per person,
            send reminders at the right time, watch for refills, and alert caregivers the moment a
            dose is skipped &mdash; instead of relying on memory and a 9 p.m. phone call.
          </p>
        </section>

        {/* Problem Section */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">The Medication Problem Is Bigger Than You Think</h2>
          <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Missed doses, wrong pills, forgotten refills — medication errors are one of the most common and preventable health risks.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon={<CurrencyDollarIcon className="w-8 h-8 text-rose-500" />}
              title="$300B in Preventable Costs"
              description="Medication non-adherence costs the U.S. healthcare system over $300 billion per year. Half of all chronic disease medications are not taken as prescribed."
            />
            <ProblemCard
              icon={<PuzzlePieceIcon className="w-8 h-8 text-fuchsia-500" />}
              title="Cognitive Overload"
              description="Managing 10+ medications across multiple family members — different doses, different schedules, different pharmacies — is a full-time job nobody signed up for."
            />
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />}
              title="The &quot;Did Mom Take Her Pills?&quot; Anxiety"
              description="You call every morning to check. She says yes. But did she? The worry never stops when medication adherence is based on memory alone."
            />
          </div>
        </section>

        {/* The Safety Net — Visual Loop */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">The Medication Safety Net</h2>
          <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            WPL creates a closed-loop system. Every medication is tracked, every dose is reminded, every action is verified.
          </p>
          {/* Ordered list — the semantic primitive for a numbered sequence.
              NLP models (BERT/MUM) and screen readers parse <ol> as ordered,
              and each step's number now lives IN the heading text. */}
          <ol className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto list-none p-0 m-0">
            {SAFETY_LOOP_STEPS.map((s, i) => (
              <SafetyLoopStep
                key={s.step}
                step={String(s.step)}
                icon={SAFETY_LOOP_ICONS[i]}
                label={s.label}
                description={s.description}
              />
            ))}
          </ol>
          <div className="flex justify-center mt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <ArrowPathIcon className="w-5 h-5" />
              <span>Continuous safety loop for every family member</span>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">Real Families. Real Scenarios.</h2>
          <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            WPL&apos;s medication system is designed for the messy reality of managing health across a household.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <UseCaseCard
              icon={<UserGroupIcon className="w-10 h-10 text-rose-500" />}
              title="Managing Dad&apos;s 12 Medications Remotely"
              description="Your father takes medications for blood pressure, diabetes, cholesterol, and arthritis. Different doses at different times. WPL tracks all 12, sends him reminders, and alerts you when he misses one — even from 500 miles away."
            />
            <UseCaseCard
              icon={<BeakerIcon className="w-10 h-10 text-pink-500" />}
              title="Three Kids, Three Different Prescriptions"
              description="One child on allergy meds, another on ADHD medication, a third finishing antibiotics. Each has different doses and schedules. WPL keeps them all straight so you don&apos;t have to juggle it in your head."
            />
            <UseCaseCard
              icon={<DocumentTextIcon className="w-10 h-10 text-fuchsia-500" />}
              title="Pre-Appointment Medication Export"
              description="Every doctor asks for &quot;a complete list of current medications.&quot; Instead of scribbling on a notepad, export a clean, formatted list from WPL with doses, frequencies, pharmacies, and prescribers — in one tap."
            />
          </div>
        </section>

        {/* Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Everything You Need for Medication Safety</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<BeakerIcon className="w-12 h-12 text-rose-500" />}
              title="Unlimited Meds Per Profile"
              description="Prescriptions, OTC medications, vitamins, supplements — track everything for every family member with no limits."
            />
            <FeatureCard
              icon={<BellIcon className="w-12 h-12 text-pink-500" />}
              title="Smart Reminders"
              description="Push notifications at scheduled times. Morning, noon, evening, bedtime — each medication gets its own reminder."
            />
            <FeatureCard
              icon={<CheckCircleIcon className="w-12 h-12 text-green-500" />}
              title="Adherence Tracking"
              description="Mark doses as taken and track adherence percentage over days, weeks, and months. Spot patterns in missed doses."
            />
            <FeatureCard
              icon={<CalendarIcon className="w-12 h-12 text-blue-500" />}
              title="Refill Alerts"
              description="Get notified 7 days before a prescription runs out. Never face an empty bottle on a Sunday morning."
            />
            <FeatureCard
              icon={<PhotoIcon className="w-12 h-12 text-violet-500" />}
              title="Prescription Photos"
              description="Snap photos of prescription bottles and labels. When you need to call a pharmacy, the details are always at hand."
            />
            <FeatureCard
              icon={<DocumentTextIcon className="w-12 h-12 text-indigo-500" />}
              title="Provider Export"
              description="Generate a formatted medication list as PDF. Share with doctors, specialists, or emergency responders instantly."
            />
          </div>
        </section>

        {/* Caregiver Angle */}
        <section className="mb-20">
          <div className="bg-gradient-to-r from-rose-50 to-fuchsia-50 dark:from-rose-950/20 dark:to-fuchsia-950/20 rounded-2xl border-2 border-rose-200 dark:border-rose-800 p-8 md:p-12">
            <div className="max-w-3xl mx-auto text-center">
              <UserGroupIcon className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-foreground mb-4">
                You&apos;re Not the Only One Watching
              </h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Invite co-caregivers — siblings, spouses, home aides — so the whole family shares the responsibility
                of medication management. Everyone sees the same medication list, everyone gets alerts, and no one person
                carries the full cognitive load alone.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 mt-8">
                <CaregiverBenefit text="Shared medication visibility across caregivers" />
                <CaregiverBenefit text="Missed-dose alerts sent to all authorized watchers" />
                <CaregiverBenefit text="Individual permission controls for privacy" />
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="medications-faq" className="mb-20">
          <h2 id="medications-faq" className="text-4xl font-bold text-foreground mb-4 text-center">Frequently Asked Questions</h2>
          <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Answers to what families ask us most about medication tracking across the household.
          </p>
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group bg-card rounded-xl border-2 border-border p-5 open:shadow-md transition-shadow"
              >
                <summary className="cursor-pointer list-none font-semibold text-foreground flex items-start justify-between gap-4">
                  <span>{item.question}</span>
                  <span className="text-rose-600 dark:text-rose-400 text-xl leading-none group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Related Features / Sibling Links */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">Explore the Platform</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RelatedLink href="/caregivers/aging-parents" title="Caring for Aging Parents" description="A full guide to long-distance caregiving and remote monitoring" />
            <RelatedLink href="/blog/vitals-tracking" title="Vitals Tracking" description="Catch health problems before they become emergencies" />
            <RelatedLink href="/blog/dashboard" title="Health Dashboard" description="Your centralized command center for all health data" />
            <RelatedLink href="/blog/family-care" title="Family Care" description="Manage health for every member of your household" />
            <RelatedLink href="/blog/appointments" title="Appointments" description="Bring medication lists to every doctor visit" />
            <RelatedLink href="/blog/wpl-health-reports" title="Self-Teaching Health Reports" description="Weekly personalized insights including medication adherence" />
          </div>
        </section>

        {/* Trust + CTA */}
        <section className="bg-gradient-to-r from-rose-600 to-fuchsia-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Peace of Mind That Everyone&apos;s Medications Are Handled
          </h2>
          <p className="text-xl text-rose-100 mb-8 max-w-3xl mx-auto">
            Stop worrying about missed doses, expired prescriptions, and medication mix-ups.
            Let WPL handle the tracking so you can focus on caring.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-rose-600 rounded-lg hover:bg-rose-50 transition-colors font-semibold shadow-lg"
            >
              Start Free Trial
            </Link>
          </div>
          <p className="text-sm text-rose-200 mt-6">
            No credit card required &bull; 7-day free trial &bull; Cancel anytime
          </p>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm flex-wrap">
            <Link href="/security" className="text-white/90 hover:text-white underline">Security</Link>
            <Link href="/hipaa" className="text-white/90 hover:text-white underline">HIPAA Compliance</Link>
            <Link href="/privacy" className="text-white/90 hover:text-white underline">Privacy Policy</Link>
            <Link href="/support" className="text-white/90 hover:text-white underline">Help Center</Link>
          </div>
        </section>
      </main>
    </div>
  )
}

/* ─── Inline Helper Components ─── */

function ProblemCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function SafetyLoopStep({ step, icon, label, description }: { step: string; icon: React.ReactNode; label: string; description: string }) {
  // The ordinal lives IN the heading text ("1. Track…") so NLP parses the
  // sequence chronologically — not as a detached number above a heading.
  return (
    <li className="bg-card rounded-xl border-2 border-border p-5 text-center list-none">
      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-sm font-bold mb-3">
        {step}
      </div>
      <div className="flex justify-center mb-2">{icon}</div>
      <h3 className="font-semibold text-foreground mb-1">
        <span className="text-rose-600 dark:text-rose-400 font-bold">{step}.</span> {label}
      </h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </li>
  )
}

function UseCaseCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-rose-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-rose-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function CaregiverBenefit({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-left">
      <CheckCircleIcon className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  )
}

function RelatedLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="bg-card rounded-lg border-2 border-border p-4 hover:border-rose-300 hover:shadow-lg transition-all block">
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
