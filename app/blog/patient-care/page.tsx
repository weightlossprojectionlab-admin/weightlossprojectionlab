/**
 * Patient Care - Marketing Blog Page
 *
 * Hybrid marketing page showcasing WLPL Patient Care
 * Optimized for SEO with top-notch backlinks and conversion funnel
 */

import Link from 'next/link'
import { Metadata } from 'next'
import {
  CheckCircleIcon,
  SparklesIcon,
  UserCircleIcon,
  HeartIcon, BeakerIcon, CalendarIcon, DocumentTextIcon, UserGroupIcon
} from '@heroicons/react/24/outline'
import { Screenshot } from '@/components/ui/Screenshot'

export const metadata: Metadata = {
  title: 'Comprehensive Patient Care - Full Health Profiles for Every Family Member | Weight Loss Projection Lab',
  description: 'Create detailed patient profiles with complete health histories, vital signs, medications, appointments, and medical documents. Perfect for caregivers managing elderly parents or children with complex medical needs.',
  keywords: 'patient care, patient profiles, health records, medical history, patient management, caregiver tools, elderly care',
  openGraph: {
    title: 'Comprehensive Patient Care - Full Health Profiles for Every Family Member',
    description: 'Create detailed patient profiles with complete health histories, vital signs, medications, appointments, and medical documents. Perfect for caregivers managing elderly parents or children with complex medical needs.',
    type: 'article',
    url: 'https://weightlossproglab.com/blog/patient-care',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Comprehensive Patient Care - Full Health Profiles for Every Family Member',
    description: 'Create detailed patient profiles with complete health histories, vital signs, medications, appointments, and medical documents. Perfect for caregivers managing elderly parents or children with complex medical needs.',
  },
  alternates: {
    canonical: 'https://weightlossproglab.com/blog/patient-care'
  }
}

export default function PatientcareBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm font-medium">WLPL Feature</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">Full Health Profiles for Every Family Member</h1>
            <p className="text-xl text-white/90 mb-8 leading-relaxed">
              Create detailed profiles for each patient and family member with complete health histories, vital signs, medications, appointments, and medical documents. Perfect for caregivers managing elderly parents, children with complex needs, or any family member requiring health coordination.
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
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Patient Profile in Action</h2>
          <Screenshot
            src="/screenshots/patient-care/patient-profile-vitals-desktop-light.png"
            alt="Patient profile dashboard for test user (Child) showing Quick Actions sidebar with Info, Meals, Meds, Vitals, Appt, Steps, Appts, Shop, Recipes, Docs, Duties, and Settings. Main view displays current weight (130.0 lbs, -2% to goal), today's calories (0/2,000), activity (0 steps), blood pressure trend chart (Diastolic and Systolic over time), vitals history with blood pressure readings, pulse oximeter, blood sugar, weight, and temperature logs. Also shows Recent Meals, Current Medications, and Recent Documents sections."
            caption="Complete patient profile with vitals tracking, medications, and quick access to all health management tools"
            priority
            zoomable
          />
        </section>

        {/* Key Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Key Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<UserCircleIcon className="w-12 h-12 text-blue-600" />}
              title="Detailed Profiles"
              description="Store demographics, medical history, insurance, emergency contacts"
            />
            <FeatureCard
              icon={<HeartIcon className="w-12 h-12 text-blue-600" />}
              title="Vital Signs Tracking"
              description="Monitor blood pressure, glucose, heart rate, temperature, SpO2"
            />
            <FeatureCard
              icon={<BeakerIcon className="w-12 h-12 text-blue-600" />}
              title="Medication Management"
              description="Track prescriptions, dosages, schedules, and adherence"
            />
            <FeatureCard
              icon={<CalendarIcon className="w-12 h-12 text-blue-600" />}
              title="Appointment History"
              description="Full calendar of past and upcoming doctor visits with notes"
            />
            <FeatureCard
              icon={<DocumentTextIcon className="w-12 h-12 text-blue-600" />}
              title="Medical Documents"
              description="Store insurance cards, lab results, imaging reports, prescriptions"
            />
            <FeatureCard
              icon={<UserGroupIcon className="w-12 h-12 text-blue-600" />}
              title="Care Team Collaboration"
              description="Invite family members and caregivers with role-based access"
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
