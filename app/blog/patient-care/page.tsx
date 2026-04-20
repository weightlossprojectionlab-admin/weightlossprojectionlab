/**
 * Patient Care Coordination - Marketing Blog Page
 *
 * Focused on care COORDINATION between multiple caregivers,
 * differentiated from /blog/patients which covers individual profile creation.
 */

import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { blogPostingSchema } from '@/lib/json-ld'
import { Metadata } from 'next'
import {
  ArrowPathIcon,
  ShieldCheckIcon,
  NewspaperIcon,
  ClipboardDocumentListIcon,
  ShareIcon,
  FolderOpenIcon,
  ExclamationTriangleIcon,
  PuzzlePieceIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { Screenshot } from '@/components/ui/Screenshot'

export const metadata: Metadata = {
  title: 'Care Coordination for Caregivers — Sync Your Entire Care Team | Wellness Projection Lab',
  description: 'Coordinate care across multiple caregivers with real-time sync, role-based access, shared activity feeds, and duty assignment. One patient profile, one source of truth — no one falls through the cracks.',
  keywords: 'care coordination, caregiver coordination, caregiver tools, family caregiver app, shared patient data, caregiver sync, caregiver communication, care team management, caregiver duty assignment, elderly care coordination',
  openGraph: {
    title: 'Coordinate Care Across Caregivers — No One Falls Through the Cracks',
    description: 'One patient profile, multiple caregivers, real-time sync. WPL coordinates people around shared health data so nothing gets missed.',
    type: 'article',
    images: [{ url: 'https://www.wellnessprojectionlab.com/screenshots/patient-care/patient-profile-vitals-desktop-light.png', width: 1200, height: 630, alt: 'Wellness Projection Lab - Patient Care' }],
    url: 'https://www.wellnessprojectionlab.com/blog/patient-care',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://www.wellnessprojectionlab.com/screenshots/patient-care/patient-profile-vitals-desktop-light.png'],
    title: 'Coordinate Care Across Caregivers — No One Falls Through the Cracks',
    description: 'One patient profile, multiple caregivers, real-time sync. WPL coordinates people around shared health data so nothing gets missed.',
  },
  alternates: {
    canonical: 'https://www.wellnessprojectionlab.com/blog/patient-care',
  },
}

export default function PatientCareBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd
        data={blogPostingSchema({
          headline: 'Care Coordination for Caregivers — Sync Your Entire Care Team',
          description: 'Coordinate care across multiple caregivers with real-time sync, role-based access, shared activity feeds, and duty assignment. One patient profile, one source of truth — no one falls through the cracks.',
          slug: 'patient-care',
          image: '/screenshots/patient-care/patient-profile-vitals-desktop-light.png',
          datePublished: '2026-01-15T00:00:00-05:00',
          keywords: 'care coordination, caregiver coordination, caregiver tools, family caregiver app, shared patient data, caregiver sync, caregiver communication, care team management, caregiver duty assignment, elderly care coordination',
        })}
      />
      {/* ───────────── 1. Hero ───────────── */}
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Care Coordination Hub</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Coordinate Care Across Caregivers&nbsp;&mdash; No&nbsp;One Falls Through the&nbsp;Cracks
            </h1>
            <p className="text-xl text-white/90 mb-8 leading-relaxed max-w-3xl mx-auto">
              One patient profile. Multiple caregivers. Real-time sync. WPL keeps every member of the care team informed, aligned, and ready to act&nbsp;&mdash; whether they&apos;re across the hall or across the country.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
              >
                Start Free Trial
              </Link>
              <Link
                href="/docs"
                className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-semibold"
              >
                View Documentation
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* ───────────── 2. The Problem ───────────── */}
        <section className="mb-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center">
            Caregiving Shouldn&apos;t Feel Like Guesswork
          </h2>
          <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            When multiple people share responsibility for a loved one&apos;s health, small gaps in communication become big problems fast.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-10 h-10 text-red-500" />}
              title="Caregiver Burden"
              description="Juggling medications, appointments, and vitals for multiple family members without a shared system leads to burnout and mistakes."
            />
            <ProblemCard
              icon={<PuzzlePieceIcon className="w-10 h-10 text-amber-500" />}
              title="Scattered Information"
              description="Critical details are spread across doctor&apos;s notes, text threads, sticky notes, and half a dozen apps nobody else can access."
            />
            <ProblemCard
              icon={<QuestionMarkCircleIcon className="w-10 h-10 text-orange-500" />}
              title="No Single Source of Truth"
              description="Without one shared record, every handoff starts with &ldquo;Wait, did anyone update the...?&rdquo; and ends with uncertainty."
            />
          </div>
        </section>

        {/* ───────────── 3. The Coordination Model ───────────── */}
        <section className="mb-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center">
            The WPL Coordination Model
          </h2>
          <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            A single, living health profile that connects every caregiver to the same data&nbsp;&mdash; in real time.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0">
            <ModelStep label="One Profile" sublabel="Complete health record" />
            <StepArrow />
            <ModelStep label="Multiple Caregivers" sublabel="Family, aides, providers" />
            <StepArrow />
            <ModelStep label="Shared Data" sublabel="Real-time sync across devices" />
            <StepArrow />
            <ModelStep label="Coordinated Actions" sublabel="No gaps, no duplicates" />
          </div>
        </section>

        {/* ───────────── 4. What Coordination Looks Like ───────────── */}
        <section className="mb-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center">
            What Coordination Looks Like
          </h2>
          <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            Real scenarios. Real families. Real peace of mind.
          </p>
          <div className="space-y-8">
            <ScenarioCard
              number={1}
              title="Sibling Caregiving Handoff"
              description="Mike logs Mom&apos;s morning vitals in NYC. His sister checks the dashboard from LA and schedules the afternoon appointment. No phone tag, no missed details."
              accentColor="blue"
            />
            <ScenarioCard
              number={2}
              title="Emergency Readiness"
              description="All of Barbara&apos;s medications, allergies, and recent vitals&nbsp;&mdash; accessible in 10 seconds from any caregiver&apos;s phone. When seconds matter, preparation wins."
              accentColor="indigo"
            />
            <ScenarioCard
              number={3}
              title="Provider Communication"
              description="Export a complete health summary before any appointment. No more &ldquo;I think she takes...&rdquo; conversations. Walk in with confidence and leave with a plan."
              accentColor="purple"
            />
          </div>
        </section>

        {/* ───────────── 5. Key Features ───────────── */}
        <section className="mb-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center">
            Built for Teams, Not Just Individuals
          </h2>
          <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            Every feature is designed to keep your entire care team in sync.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<ArrowPathIcon className="w-10 h-10 text-blue-600" />}
              title="Real-Time Sync"
              description="Updates to vitals, meds, and notes appear instantly across every caregiver&apos;s device. No refresh needed."
            />
            <FeatureCard
              icon={<ShieldCheckIcon className="w-10 h-10 text-blue-600" />}
              title="Role-Based Access"
              description="Control who can view, edit, or manage each patient&apos;s profile. Keep sensitive data visible only to those who need it."
            />
            <FeatureCard
              icon={<NewspaperIcon className="w-10 h-10 text-indigo-600" />}
              title="Activity Feed"
              description="A shared timeline of every action taken&nbsp;&mdash; who logged vitals, who updated meds, who scheduled an appointment."
            />
            <FeatureCard
              icon={<ClipboardDocumentListIcon className="w-10 h-10 text-indigo-600" />}
              title="Duty Assignment"
              description="Assign and track caregiver duties like medication reminders, meal prep, and appointment transport so nothing is missed."
            />
            <FeatureCard
              icon={<ShareIcon className="w-10 h-10 text-purple-600" />}
              title="Provider Sharing"
              description="Generate shareable health summaries for doctor visits, ER trips, or specialist referrals in one click."
            />
            <FeatureCard
              icon={<FolderOpenIcon className="w-10 h-10 text-purple-600" />}
              title="Document Hub"
              description="Store insurance cards, lab results, prescriptions, and advance directives in one secure, searchable location."
            />
          </div>
        </section>

        {/* ───────────── 6. Screenshot ───────────── */}
        <section className="mb-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-12 text-center">
            See the Coordination Dashboard
          </h2>
          <Screenshot
            src="/screenshots/patient-care/patient-profile-vitals-desktop-light.png"
            alt="WPL patient profile dashboard showing vitals tracking, medications, activity feed, and caregiver coordination tools in a unified interface"
            caption="A single view where every caregiver can see vitals, medications, recent activity, and upcoming duties"
            priority
            zoomable
          />
        </section>

        {/* ───────────── 7. Differentiator ───────────── */}
        <section className="mb-24">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-10 md:p-16 text-center border border-blue-200 dark:border-blue-800">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Other Apps Store Data.
            </h2>
            <p className="text-2xl sm:text-3xl font-semibold text-blue-600 dark:text-blue-400 mb-6">
              WPL Coordinates <span className="underline decoration-4 decoration-indigo-400">People</span> Around That Data.
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Health profiles are only useful if the right people can see them, act on them, and stay aligned. WPL is the only family health platform built from the ground up for multi-caregiver coordination.
            </p>
          </div>
        </section>

        {/* ───────────── 8. Trust + CTA ───────────── */}
        <section className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-12 text-center text-white">
          <UserGroupIcon className="w-14 h-14 mx-auto mb-6 text-white/80" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Care Is a Team Sport
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Give your team the right tools. Start coordinating today with a free 7-day trial.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
            >
              Start Free Trial
            </Link>
          </div>
          <p className="text-sm text-blue-200 mt-6">
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

/* ═══════════════════════════════════════════
   Inline Helper Components
   ═══════════════════════════════════════════ */

function ProblemCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 text-center">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  )
}

function ModelStep({ label, sublabel }: { label: string; sublabel: string }) {
  return (
    <div className="flex flex-col items-center text-center bg-card border-2 border-blue-200 dark:border-blue-800 rounded-xl px-6 py-5 w-52 shadow-sm">
      <span className="text-lg font-bold text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground mt-1">{sublabel}</span>
    </div>
  )
}

function StepArrow() {
  return (
    <div className="flex items-center justify-center px-2">
      <ArrowRightIcon className="w-6 h-6 text-blue-500 hidden md:block" />
      <svg
        className="w-6 h-6 text-blue-500 md:hidden"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l-4-4m4 4l4-4" />
      </svg>
    </div>
  )
}

function ScenarioCard({
  number,
  title,
  description,
  accentColor,
}: {
  number: number
  title: string
  description: string
  accentColor: 'blue' | 'indigo' | 'purple'
}) {
  const borderMap = {
    blue: 'border-l-blue-500',
    indigo: 'border-l-indigo-500',
    purple: 'border-l-purple-500',
  }
  const numBgMap = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  }

  return (
    <div className={`bg-card rounded-xl border-2 border-border border-l-4 ${borderMap[accentColor]} p-6 md:p-8`}>
      <div className="flex items-start gap-4">
        <span className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${numBgMap[accentColor]}`}>
          {number}
        </span>
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-blue-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  )
}
