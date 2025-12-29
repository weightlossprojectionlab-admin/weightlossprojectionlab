/**
 * Family Care - Marketing Blog Page
 *
 * Hybrid marketing page showcasing WLPL Family Care
 * Optimized for SEO with top-notch backlinks and conversion funnel
 */

import Link from 'next/link'
import { Metadata } from 'next'
import {
  CheckCircleIcon,
  SparklesIcon,
  UserCircleIcon,
  UserGroupIcon, ChartBarIcon, BellAlertIcon, CalendarIcon, ClipboardDocumentListIcon, LockClosedIcon
} from '@heroicons/react/24/outline'
import { Screenshot, MobileFrame, ScreenshotGallery } from '@/components/ui/Screenshot'

export const metadata: Metadata = {
  title: 'Family Care Dashboard - Coordinate Health for Your Whole Family | Weight Loss Projection Lab',
  description: 'Centralized family health dashboard for tracking multiple family members. View aggregate health data, coordinate care between siblings, and manage family-wide health goals with role-based access.',
  keywords: 'family care, family health dashboard, care coordination, multi-patient view, family health tracking, caregiver dashboard',
  openGraph: {
    title: 'Family Care Dashboard - Coordinate Health for Your Whole Family',
    description: 'Centralized family health dashboard for tracking multiple family members. View aggregate health data, coordinate care between siblings, and manage family-wide health goals with role-based access.',
    type: 'article',
    url: 'https://weightlossproglab.com/blog/family-care',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Family Care Dashboard - Coordinate Health for Your Whole Family',
    description: 'Centralized family health dashboard for tracking multiple family members. View aggregate health data, coordinate care between siblings, and manage family-wide health goals with role-based access.',
  },
  alternates: {
    canonical: 'https://weightlossproglab.com/blog/family-care'
  }
}

export default function FamilycareBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 text-white overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1920&q=80)',
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
            <h1 className="text-5xl md:text-6xl font-bold mb-6">Coordinate Health for Your Whole Family</h1>
            <p className="text-xl text-white/90 mb-8 leading-relaxed">
              Centralized family health dashboard for tracking multiple patients and family members. View aggregate health data, coordinate care between caregivers, and manage health goals with role-based access for each person under your care.
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
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Family Dashboard in Action</h2>

          {/* Primary Dashboard Screenshot */}
          <div className="mb-12">
            <Screenshot
              src="/screenshots/family-care/admin-dashboard-full-desktop-light.png"
              alt="Family Admin Dashboard showing 5 Family Members Under Care (4 people, 0 pets), 0 Pending Tasks, 0 Pending Invites, 3 Unread Notifications, and 2 Upcoming Appointments (next 30 days). Overview tab displays Family Member Health Snapshots for Barbara Rice (parent, 9 active medications), test user (Child/Pet, 0 medications), Robert Edmonds (Sibling, 0 medications), Darlene Rice (Sibling, 0 medications), and percy rice (Care Recipient, 1 medication) with last vital check times"
              caption="Complete Family Admin Dashboard - Monitor all family members' health from one centralized hub"
              priority
              zoomable
            />
          </div>

          {/* Secondary Screenshots */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Screenshot
              src="/screenshots/family-care/family-dashboard-overview-desktop-light.png"
              alt="WLPL Family Admin Dashboard showing 5 family members under care, pending tasks, invites, notifications, and upcoming appointments with family member health snapshots including active medications and last vital checks"
              caption="Family health overview with quick stats and member snapshots"
              zoomable
            />
            <Screenshot
              src="/screenshots/family-care/all-management-tools-desktop-light.png"
              alt="All Management Tools grid showing 14 feature cards: Family Member Profiles, Medications, Appointments, Caregivers, Documents, Progress Tracking, Notifications, Healthcare Providers, Households, Shopping Lists, Kitchen Inventory, Role Management, Family Invitations, and Household Duties - each with colorful icons and descriptions"
              caption="Complete suite of 14 family health management tools"
              zoomable
            />
          </div>

          {/* Mobile Views */}
          <h3 className="text-2xl font-bold text-foreground mb-6 text-center">Works Perfectly on Mobile</h3>
          <div className="flex flex-wrap justify-center gap-8">
            <MobileFrame variant="ios">
              <Screenshot
                src="/screenshots/family-care/family-dashboard-mobile-light.png"
                alt="Mobile Family Admin Dashboard showing 5 family members under care, 0 pending tasks, 0 pending invites, and unread notifications"
                caption="Mobile dashboard overview"
                variant="mobile"
              />
            </MobileFrame>
            <MobileFrame variant="ios">
              <Screenshot
                src="/screenshots/patient-care/family-members-list-mobile-light.png"
                alt="Family Members list on mobile showing Barbara Rice (76 years old, Female) with options to view vitals and dashboard, with Family Premium badge and 5 of unlimited members indicator"
                caption="Family members profiles"
                variant="mobile"
              />
            </MobileFrame>
            <MobileFrame variant="ios">
              <Screenshot
                src="/screenshots/patient-care/patient-cards-mobile-light.png"
                alt="Patient cards showing test user (Child), Robert Edmonds (56 years old Sibling Male), and Darlene Rice (53 years old Sibling Female) with Vitals and View Dashboard buttons"
                caption="Individual patient cards"
                variant="mobile"
              />
            </MobileFrame>
          </div>
        </section>

        {/* Onboarding Teaser - FOMO */}
        <section className="mb-20">
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-12 text-white text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Add Family Members in 4 Simple Steps
              </h2>
              <p className="text-lg text-white/90 mb-6 leading-relaxed">
                Our guided onboarding process makes it effortless to add family members to your care network.
                Just enter basic info, health vitals, and medical conditions—our AI handles the rest, including
                BMI analysis, risk factor detection, and personalized health goal recommendations.
              </p>
              <div className="flex flex-wrap gap-4 justify-center text-sm text-white/80 mb-8">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>Intelligent Health Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>Automatic Risk Detection</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>Smart Goal Setting</span>
                </div>
              </div>
              <Link
                href="/pricing"
                className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
              >
                Start Free Trial & See It Yourself
              </Link>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Key Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<UserGroupIcon className="w-12 h-12 text-blue-600" />}
              title="Multi-Patient Overview"
              description="View health stats for all patients and family members at once with quick-switch navigation between profiles"
            />
            <FeatureCard
              icon={<ChartBarIcon className="w-12 h-12 text-blue-600" />}
              title="Aggregate Health Data"
              description="See combined weight trends, meal logs, and vital signs across all family members under your care"
            />
            <FeatureCard
              icon={<BellAlertIcon className="w-12 h-12 text-blue-600" />}
              title="Health Notifications"
              description="Get alerts for any patient's weight check-ins, appointments, medication reminders, or abnormal vital signs"
            />
            <FeatureCard
              icon={<CalendarIcon className="w-12 h-12 text-blue-600" />}
              title="Shared Calendar"
              description="Track appointments for all patients with color-coding per family member and driver assignment"
            />
            <FeatureCard
              icon={<ClipboardDocumentListIcon className="w-12 h-12 text-blue-600" />}
              title="Care Coordination"
              description="Assign care tasks to family caregivers (e.g., 'Take Mom to doctor', 'Pick up Dad's prescriptions')"
            />
            <FeatureCard
              icon={<LockClosedIcon className="w-12 h-12 text-blue-600" />}
              title="Privacy Controls"
              description="Granular permissions - control who sees what for each patient and family member based on their role"
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
