/**
 * Appointments - Marketing Blog Page
 *
 * "Never Miss a Visit — For Anyone in Your Family"
 * Family-centered appointment coordination with driver assignment and smart reminders
 */

import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { blogPostingSchema } from '@/lib/json-ld'
import { Metadata } from 'next'
import {
  SparklesIcon,
  CalendarIcon,
  BellAlertIcon,
  UserGroupIcon,
  MapPinIcon,
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  TruckIcon,
  CheckCircleIcon,
  LinkIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { Screenshot } from '@/components/ui/Screenshot'

export const metadata: Metadata = {
  title: 'Family Appointment Hub — Never Miss a Visit | Wellness Projection Lab',
  description:
    'Coordinate doctor visits for every family member in one calendar. Color-coded schedules, driver assignment, multi-level reminders, and visit notes — so no appointment falls through the cracks.',
  keywords:
    'family appointment scheduling, healthcare calendar, doctor visit coordination, appointment reminders, driver assignment, caregiver scheduling, medical appointments, family health management',
  openGraph: {
    title: 'Never Miss a Visit — For Anyone in Your Family',
    description:
      'Coordinate doctor visits for every family member in one calendar. Color-coded schedules, driver assignment, multi-level reminders, and visit notes.',
    type: 'article',
    images: [{ url: 'https://www.wellnessprojectionlab.com/screenshots/appointments/family-calendar-desktop-light.png', width: 1200, height: 630, alt: 'Wellness Projection Lab - Appointments' }],
    url: 'https://www.wellnessprojectionlab.com/blog/appointments',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://www.wellnessprojectionlab.com/screenshots/appointments/family-calendar-desktop-light.png'],
    title: 'Never Miss a Visit — For Anyone in Your Family',
    description:
      'Coordinate doctor visits for every family member in one calendar. Color-coded schedules, driver assignment, multi-level reminders, and visit notes.',
  },
  alternates: {
    canonical: 'https://www.wellnessprojectionlab.com/blog/appointments',
  },
}

export default function AppointmentsBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd
        data={blogPostingSchema({
          headline: 'Family Appointment Hub — Never Miss a Visit',
          description: 'Coordinate doctor visits for every family member in one calendar. Color-coded schedules, driver assignment, multi-level reminders, and visit notes — so no appointment falls through the cracks.',
          slug: 'appointments',
          image: '/screenshots/appointments/family-calendar-desktop-light.png',
          datePublished: '2026-01-15T00:00:00-05:00',
          keywords: 'family appointment scheduling, healthcare calendar, doctor visit coordination, appointment reminders, driver assignment, caregiver scheduling, medical appointments, family health management',
        })}
      />
      {/* ── Hero ── */}
      <div className="relative bg-gradient-to-br from-pink-600 via-rose-600 to-red-600 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Family Appointment Hub</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Never Miss a Visit — For Anyone in Your Family
            </h1>
            <p className="text-xl text-white/90 mb-8 leading-relaxed max-w-3xl mx-auto">
              One calendar for every family member&apos;s doctor visits. Color-coded by person,
              with driver assignments, multi-level reminders, and visit notes — so no
              appointment ever falls through the cracks.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-rose-600 rounded-lg hover:bg-rose-50 transition-colors font-semibold shadow-lg"
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
        {/* ── Problem ── */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">
            Managing Family Health Visits Is Chaos
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            When you&apos;re responsible for more than just yourself, keeping track of who sees
            which doctor and when becomes a full-time job.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-10 h-10 text-rose-500" />}
              title="Multiple People, Multiple Doctors"
              description="Pediatricians, specialists, dentists, therapists — multiply that by every family member and you&apos;re drowning in dates."
            />
            <ProblemCard
              icon={<TruckIcon className="w-10 h-10 text-rose-500" />}
              title="No Driver Coordination"
              description="Who&apos;s driving Mom to her cardiologist? Who&apos;s picking up the kids after the dentist? It&apos;s a guessing game every week."
            />
            <ProblemCard
              icon={<ClockIcon className="w-10 h-10 text-rose-500" />}
              title="Forgotten Follow-Ups"
              description="That 6-month follow-up gets lost in a sticky note. By the time you remember, the gap has become a health risk."
            />
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">
            How It Works
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            A family calendar built for healthcare — not just events.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step="1"
              title="Color-Coded Family Calendar"
              description="Every family member gets their own color. See at a glance who has appointments this week, this month, or this quarter."
            />
            <StepCard
              step="2"
              title="Assign a Driver"
              description="Tag which family member or caregiver is responsible for transportation. No more last-minute scrambles."
            />
            <StepCard
              step="3"
              title="Multi-Level Reminders"
              description="Automatic notifications 7 days, 3 days, and 1 day before each visit — sent to the patient and the driver."
            />
          </div>
        </section>

        {/* ── Screenshots ── */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">
            Appointments in Action
          </h2>

          <div className="mb-12">
            <Screenshot
              src="/screenshots/appointments/family-calendar-desktop-light.png"
              alt="Family Calendar for December 2025 showing 6 appointments with filter options for All Patients and All Appointments. Calendar displays appointments on Dec 2 (9:30 AM - Barbara Rice), Dec 20 (12:30 PM - Barbara Rice), and Dec 23 (9:30 AM - Barbara Rice) with Today button and month navigation"
              caption="Family-wide appointment calendar with filtering and month navigation"
              priority
              zoomable
            />
          </div>

          <Screenshot
            src="/screenshots/appointments/upcoming-appointments-desktop-light.png"
            alt="Upcoming Appointments showing Dr. Surekha Collur appointment for Barbara Rice on Thu, Jan 15 at 12:30 PM with Driver Needed badge, and Dr. Yuni appointment for Barbara Rice on Mon, Jan 26 at 10:15 AM"
            caption="Upcoming appointments with driver assignment and patient details"
            zoomable
          />
        </section>

        {/* ── Use Cases ── */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">
            Real-World Scenarios
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            Families use the Appointment Hub in ways a generic calendar never supports.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <UseCaseCard
              number="01"
              title="Three Kids, One Month"
              description="Coordinating 3 kids&apos; pediatrician, dentist, and specialist visits across one month — all visible on a single color-coded calendar."
            />
            <UseCaseCard
              number="02"
              title="Elderly Parent Care"
              description="Scheduling an elderly parent&apos;s appointments and assigning which sibling drives — everyone knows their responsibility."
            />
            <UseCaseCard
              number="03"
              title="Your Own Checkups Too"
              description="Tracking your own annual checkups alongside your family&apos;s appointments so nothing slips through the cracks."
            />
          </div>
        </section>

        {/* ── Features ── */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">
            Features Built for Families
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<CalendarIcon className="w-12 h-12 text-rose-600" />}
              title="Family Calendar"
              description="Visual calendar with every family member&apos;s appointments color-coded for instant clarity."
            />
            <FeatureCard
              icon={<MapPinIcon className="w-12 h-12 text-rose-600" />}
              title="Driver Assignment"
              description="Assign a driver to each appointment. Everyone knows who&apos;s responsible for transportation."
            />
            <FeatureCard
              icon={<BellAlertIcon className="w-12 h-12 text-rose-600" />}
              title="Smart Reminders"
              description="Tiered notifications at 7, 3, and 1 day before — sent to both the patient and the driver."
            />
            <FeatureCard
              icon={<ClipboardDocumentListIcon className="w-12 h-12 text-rose-600" />}
              title="Visit Notes"
              description="Log visit summaries, diagnoses, and follow-up tasks right after the appointment ends."
            />
            <FeatureCard
              icon={<LinkIcon className="w-12 h-12 text-rose-600" />}
              title="Provider Linking"
              description="Link each appointment to a provider profile with contact info, specialty, and location."
            />
            <FeatureCard
              icon={<ArrowDownTrayIcon className="w-12 h-12 text-rose-600" />}
              title="Calendar Export"
              description="Export to Google Calendar, iCal, or Outlook so visits sync across every device."
            />
          </div>
        </section>

        {/* ── Differentiator ── */}
        <section className="mb-20">
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 rounded-2xl p-10 md:p-14 border border-rose-200 dark:border-rose-800">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">
              Why Not Just Use Google Calendar?
            </h2>
            <p className="text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-8">
              Google Calendar doesn&apos;t assign drivers, remind caregivers, or link to medical
              records. It wasn&apos;t built for families managing health — WPL was.
            </p>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <ComparisonItem label="Driver assignment per visit" wpl />
              <ComparisonItem label="Generic event creation" />
              <ComparisonItem label="Caregiver-specific reminders" wpl />
              <ComparisonItem label="One reminder for the event creator" />
              <ComparisonItem label="Linked visit notes &amp; follow-ups" wpl />
              <ComparisonItem label="No medical context" />
            </div>
          </div>
        </section>

        {/* ── Related Features ── */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">
            Explore Related Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RelatedLink href="/blog/family-care" title="Family Care" description="Multi-patient household health management" />
            <RelatedLink href="/blog/medications" title="Medications" description="Prescription tracking and refill reminders" />
            <RelatedLink href="/blog/providers" title="Providers" description="Doctor profiles, specialties, and contact info" />
            <RelatedLink href="/blog/dashboard" title="Dashboard" description="Centralized health command center" />
            <RelatedLink href="/blog/vitals-tracking" title="Vitals Tracking" description="Blood pressure, glucose, and more" />
            <RelatedLink href="/blog/medical-documents" title="Medical Documents" description="Secure document storage and sharing" />
          </div>
        </section>

        {/* ── Trust + CTA ── */}
        <section className="bg-gradient-to-r from-rose-600 to-pink-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            No More Missed Appointments. No More &ldquo;Who&apos;s Driving Mom?&rdquo;
          </h2>
          <p className="text-xl text-rose-100 mb-8 max-w-3xl mx-auto">
            Start coordinating your family&apos;s health visits in minutes. One calendar, every
            person, every reminder, every driver — handled.
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
          <div className="flex items-center justify-center gap-6 mt-8 text-sm">
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

/* ── Helper Components ── */

function ProblemCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 text-center">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function StepCard({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 relative">
      <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-lg mb-4">
        {step}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function UseCaseCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-rose-300 hover:shadow-lg transition-all">
      <span className="text-sm font-bold text-rose-600 mb-2 block">{number}</span>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
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

function ComparisonItem({ label, wpl }: { label: string; wpl?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${wpl ? 'bg-rose-100 dark:bg-rose-900/40' : 'bg-gray-100 dark:bg-gray-800/40'}`}>
      {wpl ? (
        <CheckCircleIcon className="w-6 h-6 text-rose-600 flex-shrink-0" />
      ) : (
        <span className="w-6 h-6 flex items-center justify-center text-gray-400 flex-shrink-0">—</span>
      )}
      <span className={`text-sm ${wpl ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{label}</span>
      {wpl && <span className="ml-auto text-xs font-bold text-rose-600">WPL</span>}
    </div>
  )
}

function RelatedLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="bg-card rounded-lg border-2 border-border p-4 hover:border-rose-300 hover:shadow-lg transition-all block group">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <ArrowRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-rose-600 transition-colors" />
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
