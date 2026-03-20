/**
 * Medications - Marketing Blog Page
 *
 * "Every Pill, Every Person, Every Reminder — Handled"
 * Medication Safety System showcase page
 * Optimized for SEO with conversion funnel
 */

import Link from 'next/link'
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

export const metadata: Metadata = {
  title: 'Every Pill, Every Person, Every Reminder — Handled | Medication Safety System | Wellness Projection Lab',
  description: 'Manage medications for your entire family with smart reminders, adherence tracking, refill alerts, and provider-ready exports. Stop the "Did Mom take her pills?" anxiety for good.',
  keywords: 'medication tracking, prescription management, medication reminders, pill tracker, medication adherence, refill alerts, family medication management, medication safety, caregiver medication tracking',
  openGraph: {
    title: 'Every Pill, Every Person, Every Reminder — Handled | Medication Safety System',
    description: 'Manage medications for your entire family with smart reminders, adherence tracking, refill alerts, and provider-ready exports. Stop the "Did Mom take her pills?" anxiety for good.',
    type: 'article',
    url: 'https://weightlossproglab.com/blog/medications',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Every Pill, Every Person, Every Reminder — Handled | Medication Safety System',
    description: 'Manage medications for your entire family with smart reminders, adherence tracking, refill alerts, and provider-ready exports.',
  },
  alternates: {
    canonical: 'https://weightlossproglab.com/blog/medications'
  }
}

export default function MedicationsBlogPage() {
  return (
    <div className="min-h-screen bg-background">
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
              Every Pill, Every Person, Every Reminder — Handled
            </h1>
            <p className="text-xl text-white/90 mb-8 leading-relaxed max-w-3xl mx-auto">
              Managing medications for yourself is hard enough. Managing them for your whole family?
              WPL turns medication chaos into a system you can trust.
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <SafetyLoopStep
              step="1"
              icon={<ClipboardDocumentCheckIcon className="w-8 h-8 text-rose-500" />}
              label="Track"
              description="Log every medication, dose, and schedule"
            />
            <SafetyLoopStep
              step="2"
              icon={<BellIcon className="w-8 h-8 text-pink-500" />}
              label="Remind"
              description="Push notifications at the right time"
            />
            <SafetyLoopStep
              step="3"
              icon={<CheckCircleIcon className="w-8 h-8 text-fuchsia-500" />}
              label="Verify"
              description="Mark doses taken, build adherence history"
            />
            <SafetyLoopStep
              step="4"
              icon={<ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />}
              label="Alert"
              description="Notify caregivers if doses are missed"
            />
          </div>
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

        {/* Related Features / Sibling Links */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">Explore the Platform</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RelatedLink href="/blog/vitals-tracking" title="Vitals Tracking" description="Catch health problems before they become emergencies" />
            <RelatedLink href="/blog/dashboard" title="Health Dashboard" description="Your centralized command center for all health data" />
            <RelatedLink href="/blog/family-care" title="Family Care" description="Manage health for every member of your household" />
            <RelatedLink href="/blog/appointments" title="Appointments" description="Bring medication lists to every doctor visit" />
            <RelatedLink href="/blog/wpl-health-reports" title="AI Health Reports" description="Weekly AI-powered insights including medication adherence" />
            <RelatedLink href="/blog/medical-documents" title="Medical Documents" description="Store prescriptions and pharmacy records securely" />
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
  return (
    <div className="bg-card rounded-xl border-2 border-border p-5 text-center">
      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-sm font-bold mb-3">
        {step}
      </div>
      <div className="flex justify-center mb-2">{icon}</div>
      <h3 className="font-semibold text-foreground mb-1">{label}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
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
