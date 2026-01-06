/**
 * Appointments - Marketing Blog Page
 *
 * Hybrid marketing page showcasing WPL Appointments
 * Optimized for SEO with top-notch backlinks and conversion funnel
 */

import Link from 'next/link'
import { Metadata } from 'next'
import {
  CheckCircleIcon,
  SparklesIcon,
  UserCircleIcon,
  CalendarIcon, BellAlertIcon, UserIcon, MapPinIcon, ClipboardDocumentListIcon, ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { Screenshot } from '@/components/ui/Screenshot'

export const metadata: Metadata = {
  title: 'Appointment Scheduling - Never Miss a Doctor Visit | Wellness Projection Lab',
  description: 'Schedule and manage healthcare appointments for your entire family. Set reminders, assign transportation, track visit history, and sync with your calendar—all in one HIPAA-compliant system.',
  keywords: 'appointment scheduling, healthcare appointments, doctor visits, medical calendar, appointment reminders, patient appointments',
  openGraph: {
    title: 'Appointment Scheduling - Never Miss a Doctor Visit',
    description: 'Schedule and manage healthcare appointments for your entire family. Set reminders, assign transportation, track visit history, and sync with your calendar—all in one HIPAA-compliant system.',
    type: 'article',
    url: 'https://weightlossproglab.com/blog/appointments',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Appointment Scheduling - Never Miss a Doctor Visit',
    description: 'Schedule and manage healthcare appointments for your entire family. Set reminders, assign transportation, track visit history, and sync with your calendar—all in one HIPAA-compliant system.',
  },
  alternates: {
    canonical: 'https://weightlossproglab.com/blog/appointments'
  }
}

export default function AppointmentsBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-pink-600 via-rose-600 to-red-600 text-white overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm font-medium">WPL Feature</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">Never Miss a Doctor Visit</h1>
            <p className="text-xl text-white/90 mb-8 leading-relaxed">
              Schedule and manage healthcare appointments for your entire family. Set reminders, assign transportation, track visit history, and sync with your calendar—all in one HIPAA-compliant system.
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
        {/* Screenshot Showcase */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Appointments in Action</h2>

          {/* Primary Calendar View */}
          <div className="mb-12">
            <Screenshot
              src="/screenshots/appointments/family-calendar-desktop-light.png"
              alt="Family Calendar for December 2025 showing 6 appointments with filter options for All Patients and All Appointments. Calendar displays appointments on Dec 2 (9:30 AM - Barbara Rice), Dec 20 (12:30 PM - Barbara Rice), and Dec 23 (9:30 AM - Barbara Rice) with Today button and month navigation"
              caption="Family-wide appointment calendar with filtering and month navigation"
              priority
              zoomable
            />
          </div>

          {/* Upcoming List View */}
          <Screenshot
            src="/screenshots/appointments/upcoming-appointments-desktop-light.png"
            alt="Upcoming Appointments showing Dr. Surekha Collur appointment for Barbara Rice on Thu, Jan 15 at 12:30 PM with Driver Needed badge, and Dr. Yuni appointment for Barbara Rice on Mon, Jan 26 at 10:15 AM"
            caption="Upcoming appointments with driver assignment and patient details"
            zoomable
          />
        </section>

        {/* Key Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Key Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<CalendarIcon className="w-12 h-12 text-blue-600" />}
              title="Appointment Calendar"
              description="Visual calendar with all family member appointments color-coded"
            />
            <FeatureCard
              icon={<BellAlertIcon className="w-12 h-12 text-blue-600" />}
              title="Smart Reminders"
              description="Notifications 7, 3, and 1 day before appointment time"
            />
            <FeatureCard
              icon={<UserIcon className="w-12 h-12 text-blue-600" />}
              title="Provider Integration"
              description="Link appointments to provider profiles with contact info and specialties"
            />
            <FeatureCard
              icon={<MapPinIcon className="w-12 h-12 text-blue-600" />}
              title="Transportation Coordination"
              description="Assign drivers to appointments and track who's providing transportation"
            />
            <FeatureCard
              icon={<ClipboardDocumentListIcon className="w-12 h-12 text-blue-600" />}
              title="Visit Notes"
              description="Log visit summaries, diagnoses, and follow-up tasks after appointments"
            />
            <FeatureCard
              icon={<ArrowDownTrayIcon className="w-12 h-12 text-blue-600" />}
              title="Calendar Export"
              description="Export to Google Calendar, iCal, or Outlook for cross-platform syncing"
            />
          </div>
        </section>

        {/* Who Benefits */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Who Benefits?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <BenefitCard
              emoji="👤"
              title="Solo Users"
              benefits={[
                'Personal health tracking and goal management',
                'Intelligent insights tailored to your needs',
                'Privacy-focused data control',
                'Mobile and desktop access'
              ]}
            />
            <BenefitCard
              emoji="👨‍👩‍👧‍👦"
              title="Families"
              benefits={[
                'Track health for multiple family members',
                'Coordinate care between caregivers',
                'Shared calendar and notifications',
                'Individual privacy controls per member'
              ]}
            />
            <BenefitCard
              emoji="🩺"
              title="Healthcare Providers"
              benefits={[
                'Monitor patient data between visits',
                'Receive alerts for abnormal values',
                'Export reports for medical records',
                'HIPAA-compliant access and storage'
              ]}
            />
          </div>
        </section>

        {/* Related Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">Related Platform Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RelatedLink href="/blog/dashboard" title="Dashboard" description="Centralized health command center" />
            <RelatedLink href="/blog/profile" title="Profile" description="Personalized health settings" />
            <RelatedLink href="/blog/family-care" title="Family Care" description="Multi-patient health management" />
            <RelatedLink href="/pricing" title="Pricing" description="Flexible plans for every need" />
            <RelatedLink href="/support" title="Support" description="Get help when you need it" />
            <RelatedLink href="/docs" title="Documentation" description="Comprehensive platform guides" />
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Start your free 14-day trial and experience the power of comprehensive health tracking.
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
            No credit card required • 14-day free trial • Cancel anytime
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

// Helper Components
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-blue-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function BenefitCard({ emoji, title, benefits }: { emoji: string; title: string; benefits: string[] }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6">
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className="text-xl font-semibold text-foreground mb-4">{title}</h3>
      <ul className="space-y-2">
        {benefits.map((benefit, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RelatedLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="bg-card rounded-lg border-2 border-border p-4 hover:border-blue-300 hover:shadow-lg transition-all block">
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
