/**
 * Vitals Tracking - Marketing Blog Page
 *
 * "Catch Problems Before They Become Emergencies"
 * Intelligent Vital Monitoring showcase page
 * Optimized for SEO with conversion funnel
 */

import Link from 'next/link'
import { Metadata } from 'next'
import {
  HeartIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentChartBarIcon,
  SparklesIcon,
  ShieldCheckIcon,
  EyeIcon,
  FireIcon,
  FaceSmileIcon,
  BoltIcon,
  BeakerIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  BellAlertIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { Screenshot } from '@/components/ui/Screenshot'

export const metadata: Metadata = {
  title: 'Catch Problems Before They Become Emergencies - Intelligent Vital Monitoring | Wellness Projection Lab',
  description: 'Detect health issues early with intelligent vital sign monitoring. Track BP, glucose, heart rate, SpO2, temperature, mood, and pain for your entire family with trend alerts and AI insights.',
  keywords: 'vitals tracking, blood pressure monitoring, glucose tracking, heart rate monitor, early detection, health alerts, vital signs, family health monitoring, abnormal vitals alert, remote patient monitoring',
  openGraph: {
    title: 'Catch Problems Before They Become Emergencies - Intelligent Vital Monitoring',
    description: 'Detect health issues early with intelligent vital sign monitoring. Track BP, glucose, heart rate, SpO2, temperature, mood, and pain for your entire family with trend alerts and AI insights.',
    type: 'article',
    url: 'https://weightlossproglab.com/blog/vitals-tracking',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Catch Problems Before They Become Emergencies - Intelligent Vital Monitoring',
    description: 'Detect health issues early with intelligent vital sign monitoring. Track BP, glucose, heart rate, SpO2, temperature, mood, and pain for your entire family with trend alerts and AI insights.',
  },
  alternates: {
    canonical: 'https://weightlossproglab.com/blog/vitals-tracking'
  }
}

export default function VitalsTrackingBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-red-600 via-rose-600 to-pink-600 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <ShieldCheckIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Intelligent Vital Monitoring</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Catch Problems Before They Become Emergencies
            </h1>
            <p className="text-xl text-white/90 mb-8 leading-relaxed max-w-3xl mx-auto">
              Your family&apos;s health tells a story in numbers. WPL tracks the patterns, spots the trends,
              and alerts you before a subtle shift becomes a serious problem.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors font-semibold shadow-lg"
              >
                Start Free Trial
              </Link>
              <Link
                href="/blog/medications"
                className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-semibold"
              >
                See Medication Tracking
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Problem Section */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">The Problem With Guessing</h2>
          <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Most families don&apos;t track vitals consistently. When something goes wrong, the warning signs were there all along.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon={<EyeIcon className="w-8 h-8 text-red-500" />}
              title="Invisible Trends"
              description="A single blood pressure reading looks fine. But a slow upward trend over weeks? That&apos;s invisible without consistent tracking and a system that watches the pattern."
            />
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />}
              title="The Doctor&apos;s Question You Can&apos;t Answer"
              description="&quot;How have your readings been?&quot; Without data, you guess. With WPL, you hand them a detailed report spanning weeks or months of real numbers."
            />
            <ProblemCard
              icon={<BellAlertIcon className="w-8 h-8 text-rose-500" />}
              title="No Early Warning for Family"
              description="Your elderly parent lives alone. Their blood pressure has been creeping up for three weeks. Without monitoring, nobody knows until it&apos;s an ER visit."
            />
          </div>
        </section>

        {/* What You Can Track */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">What You Can Track</h2>
          <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Seven vital categories. One unified view. Every reading builds a clearer picture of your family&apos;s health.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <VitalCard icon={<HeartIcon className="w-8 h-8" />} label="Blood Pressure" color="text-red-500" bgColor="bg-red-50 dark:bg-red-950/30" />
            <VitalCard icon={<BeakerIcon className="w-8 h-8" />} label="Blood Glucose" color="text-blue-500" bgColor="bg-blue-50 dark:bg-blue-950/30" />
            <VitalCard icon={<BoltIcon className="w-8 h-8" />} label="Heart Rate" color="text-pink-500" bgColor="bg-pink-50 dark:bg-pink-950/30" />
            <VitalCard icon={<ShieldCheckIcon className="w-8 h-8" />} label="SpO2 (Oxygen)" color="text-cyan-500" bgColor="bg-cyan-50 dark:bg-cyan-950/30" />
            <VitalCard icon={<FireIcon className="w-8 h-8" />} label="Temperature" color="text-orange-500" bgColor="bg-orange-50 dark:bg-orange-950/30" />
            <VitalCard icon={<FaceSmileIcon className="w-8 h-8" />} label="Mood" color="text-violet-500" bgColor="bg-violet-50 dark:bg-violet-950/30" />
            <VitalCard icon={<ExclamationTriangleIcon className="w-8 h-8" />} label="Pain Level" color="text-amber-500" bgColor="bg-amber-50 dark:bg-amber-950/30" />
          </div>
        </section>

        {/* The Early Detection Advantage */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">The Early Detection Advantage</h2>
          <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            WPL doesn&apos;t just store numbers. It watches for patterns that matter and alerts you when something shifts.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <AlertScenarioCard
              color="border-red-300 dark:border-red-800"
              alertBg="bg-red-50 dark:bg-red-950/40"
              alertColor="text-red-700 dark:text-red-300"
              iconColor="text-red-500"
              title="Hypertension Warning"
              alert="Barbara&apos;s BP has trended upward 3 consecutive weeks"
              description="Instead of discovering high blood pressure at an annual checkup, you catch the trend early and schedule a visit before it becomes dangerous."
            />
            <AlertScenarioCard
              color="border-orange-300 dark:border-orange-800"
              alertBg="bg-orange-50 dark:bg-orange-950/40"
              alertColor="text-orange-700 dark:text-orange-300"
              iconColor="text-orange-500"
              title="Pediatric Fever Watch"
              alert="Your child&apos;s temperature has been elevated for 2 days"
              description="A low-grade fever for one day might not worry you. But WPL notices it&apos;s been two days running and flags it so you can decide whether to call the pediatrician."
            />
            <AlertScenarioCard
              color="border-pink-300 dark:border-pink-800"
              alertBg="bg-pink-50 dark:bg-pink-950/40"
              alertColor="text-pink-700 dark:text-pink-300"
              iconColor="text-pink-500"
              title="Cardiac Fitness Shift"
              alert="Your resting heart rate increased 12% this month"
              description="A rising resting heart rate can signal stress, dehydration, or the onset of illness. WPL spots the shift before you feel the symptoms."
            />
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">Built for Real Life</h2>
          <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Whether you&apos;re watching over a parent from another city or managing your own chronic condition, WPL fits your situation.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <UseCaseCard
              icon={<UserGroupIcon className="w-10 h-10 text-red-500" />}
              title="Remote Elderly Parent Monitoring"
              description="Your mom lives 300 miles away. WPL lets you see her daily vitals, get alerts when readings are off, and share reports with her doctor — all without being in the same room."
            />
            <UseCaseCard
              icon={<ChartBarIcon className="w-10 h-10 text-rose-500" />}
              title="Chronic Disease Management"
              description="Diabetes, hypertension, thyroid conditions — chronic diseases require consistent tracking. WPL makes logging fast, surfaces trends automatically, and generates reports your specialist actually wants to see."
            />
            <UseCaseCard
              icon={<DocumentChartBarIcon className="w-10 h-10 text-pink-500" />}
              title="Pre-Appointment Data Prep"
              description="Walking into a doctor&apos;s appointment with 30 days of BP readings, glucose logs, and trend charts changes the conversation. Export a PDF in one tap and let the data speak."
            />
          </div>
        </section>

        {/* Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Everything You Need to Monitor Vitals</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<HeartIcon className="w-12 h-12 text-red-500" />}
              title="Comprehensive Vitals"
              description="Track BP, glucose, heart rate, SpO2, temperature, mood, and pain level — all from one screen for every family member."
            />
            <FeatureCard
              icon={<ChartBarIcon className="w-12 h-12 text-rose-500" />}
              title="Trend Charts"
              description="Interactive charts show vitals over days, weeks, or months with color-coded zones for normal, elevated, and critical ranges."
            />
            <FeatureCard
              icon={<ExclamationTriangleIcon className="w-12 h-12 text-amber-500" />}
              title="Abnormal Alerts"
              description="Automatic warnings when readings fall outside safe ranges or when trends indicate a developing problem."
            />
            <FeatureCard
              icon={<ClockIcon className="w-12 h-12 text-blue-500" />}
              title="Scheduled Reminders"
              description="Set daily, weekly, or custom schedules for each vital. Never forget a morning BP check or evening glucose reading again."
            />
            <FeatureCard
              icon={<DocumentChartBarIcon className="w-12 h-12 text-indigo-500" />}
              title="Exportable Reports"
              description="Generate clean PDF reports covering any date range. Share with doctors, specialists, or family members in one tap."
            />
            <FeatureCard
              icon={<SparklesIcon className="w-12 h-12 text-violet-500" />}
              title="AI Insights"
              description="WPL&apos;s AI analyzes your vitals patterns and surfaces actionable recommendations in your weekly health report."
            />
          </div>
        </section>

        {/* Screenshot */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">See It in Action</h2>
          <Screenshot
            src="/screenshots/vitals-tracking/vitals-reminder-popup-desktop-light.png"
            alt="Time to Check Vitals popup for Barbara Rice showing 6 vitals due today: Blood Pressure, Blood Sugar, Temperature, Pulse Oximeter, Weight, and Mood. Each vital shows when it was last logged with Log Now buttons, snooze and dismiss options, and a Log All Vitals wizard button."
            caption="Smart vitals reminder popup — WPL tracks what&apos;s due, what&apos;s overdue, and when each vital was last logged"
            priority
            zoomable
          />
        </section>

        {/* Related Features / Sibling Links */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">Explore the Platform</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RelatedLink href="/blog/medications" title="Medication Tracking" description="Never miss a dose with smart reminders and adherence monitoring" />
            <RelatedLink href="/blog/dashboard" title="Health Dashboard" description="Your centralized command center for all health data" />
            <RelatedLink href="/blog/family-care" title="Family Care" description="Manage health for every member of your household" />
            <RelatedLink href="/blog/wpl-health-reports" title="AI Health Reports" description="Weekly AI-powered insights from your tracked data" />
            <RelatedLink href="/blog/weight-tracking" title="Weight Tracking" description="Monitor weight trends alongside your vitals" />
            <RelatedLink href="/blog/appointments" title="Appointments" description="Bring your vitals data to every doctor visit" />
          </div>
        </section>

        {/* Trust + CTA */}
        <section className="bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Your Family&apos;s Vitals Shouldn&apos;t Be a Guessing Game
          </h2>
          <p className="text-xl text-red-100 mb-8 max-w-3xl mx-auto">
            Start tracking today. See the trends. Catch the problems early. Give your family the protection of data-driven health monitoring.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors font-semibold shadow-lg"
            >
              Start Free Trial
            </Link>
          </div>
          <p className="text-sm text-red-200 mt-6">
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

function VitalCard({ icon, label, color, bgColor }: { icon: React.ReactNode; label: string; color: string; bgColor: string }) {
  return (
    <div className={`${bgColor} rounded-xl border border-border p-5 text-center hover:shadow-md transition-shadow`}>
      <div className={`${color} flex justify-center mb-3`}>{icon}</div>
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </div>
  )
}

function AlertScenarioCard({
  color, alertBg, alertColor, iconColor, title, alert, description
}: {
  color: string; alertBg: string; alertColor: string; iconColor: string; title: string; alert: string; description: string
}) {
  return (
    <div className={`bg-card rounded-xl border-2 ${color} p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <BellAlertIcon className={`w-6 h-6 ${iconColor}`} />
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <div className={`${alertBg} rounded-lg p-4 mb-4`}>
        <p className={`text-sm font-medium ${alertColor}`}>{alert}</p>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  )
}

function UseCaseCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-red-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-red-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function RelatedLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="bg-card rounded-lg border-2 border-border p-4 hover:border-red-300 hover:shadow-lg transition-all block">
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
