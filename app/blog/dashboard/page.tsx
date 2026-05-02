/**
 * Dashboard Feature - Marketing Blog Page
 *
 * Repositioned as "Family Health Command Center" — the single pane of glass
 * for monitoring everyone you care about.
 *
 * Structure: Hero → Problem → What It Shows → Use Cases → Screenshots →
 *            Key Capabilities → Differentiator → Trust → CTA
 */

import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { blogPostingSchema } from '@/lib/json-ld'
import { Metadata } from 'next'
import {
  SparklesIcon,
  UserGroupIcon,
  ChartBarIcon,
  BellAlertIcon,
  ArrowRightIcon,
  CheckIcon,
  XMarkIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  EyeIcon,
  ArrowsRightLeftIcon,
  LightBulbIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { DemoRequestButton } from '@/components/DemoRequestButton'
import { Screenshot, MobileFrame } from '@/components/ui/Screenshot'

export const metadata: Metadata = {
  title: 'Family Health Dashboard — See Everyone&apos;s Health in One Glance | Wellness Projection Lab',
  description: 'Your family health command center. Monitor weight, meals, vitals, and self-teaching insights for every family member from one intelligent dashboard. Proactive alerts, care coordination, and privacy controls.',
  keywords: 'family health dashboard, health command center, family health monitoring, multi-person dashboard, caregiver dashboard, health insights dashboard, family wellness tracking, centralized health view',
  openGraph: {
    title: 'Family Health Dashboard — See Everyone\'s Health in One Glance',
    description: 'Your family health command center. Monitor weight, meals, vitals, and self-teaching insights for every family member from one intelligent dashboard.',
    type: 'article',
    images: [{ url: 'https://www.wellnessprojectionlab.com/screenshots/family-care/family-dashboard-overview-desktop-light.png', width: 1200, height: 630, alt: 'Wellness Projection Lab - Dashboard' }],
    url: 'https://www.wellnessprojectionlab.com/blog/dashboard',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://www.wellnessprojectionlab.com/screenshots/family-care/family-dashboard-overview-desktop-light.png'],
    title: 'Family Health Dashboard — See Everyone\'s Health in One Glance',
    description: 'Your family health command center. Monitor weight, meals, vitals, and self-teaching insights for every family member from one intelligent dashboard.',
  },
  alternates: {
    canonical: 'https://www.wellnessprojectionlab.com/blog/dashboard'
  }
}

export default function DashboardBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd
        data={blogPostingSchema({
          headline: 'Family Health Dashboard — See Everyone&apos;s Health in One Glance',
          description: 'Your family health command center. Monitor weight, meals, vitals, and self-teaching insights for every family member from one intelligent dashboard. Proactive alerts, care coordination, and privacy controls.',
          slug: 'dashboard',
          image: '/screenshots/family-care/family-dashboard-overview-desktop-light.png',
          datePublished: '2026-01-15T00:00:00-05:00',
          keywords: 'family health dashboard, health command center, family health monitoring, multi-person dashboard, caregiver dashboard, health insights dashboard, family wellness tracking, centralized health view',
        })}
      />

      {/* ============================================ */}
      {/* HERO — Emotional hook + clear value prop     */}
      {/* ============================================ */}
      <div className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Family Health Command Center</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              See Everyone&apos;s Health in One Glance
            </h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed max-w-3xl mx-auto">
              Stop wondering if everyone is okay. The WPL Dashboard gives you a single, intelligent view of your entire family&apos;s health — so you always know exactly what needs attention and what&apos;s going well.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
              >
                Start Free Trial
              </Link>
              <DemoRequestButton
                source="blog/dashboard"
                className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-semibold"
              >
                View Demo
              </DemoRequestButton>
            </div>
            <p className="text-sm text-white/70 mt-4">
              No credit card required &bull; 7-day free trial &bull; Cancel anytime
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ============================================ */}
        {/* THE PROBLEM — Why current approaches fail    */}
        {/* ============================================ */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">The Problem With How Families Track Health Today</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your family&apos;s health data is everywhere — and nowhere useful. That&apos;s how important things slip through the cracks.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-8 h-8 text-red-500" />}
              title="Checking Multiple Apps"
              description="One app for weight, another for meals, a third for medications, a notebook for vitals. You spend more time switching between tools than actually understanding anyone&apos;s health."
            />
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-8 h-8 text-red-500" />}
              title="No Centralized View"
              description="There&apos;s no single screen that answers the question: &apos;How is my family doing right now?&apos; You piece together a picture from fragments — and pieces always get missed."
            />
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-8 h-8 text-red-500" />}
              title="Reactive, Not Proactive"
              description="You only find out about health issues after they become problems. No app is watching for declining trends, missed medications, or subtle changes across your household."
            />
          </div>
        </section>

        {/* ============================================ */}
        {/* WHAT THE DASHBOARD SHOWS — 4-step visual    */}
        {/* ============================================ */}
        <section id="how-it-works" className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">What Your Dashboard Shows You</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From the moment you log in, the Dashboard organizes everything into a clear, actionable picture.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StepCard
              step="1"
              title="Family Overview"
              description="See every family member&apos;s status at a glance — who&apos;s on track, who needs attention, and recent activity across the household."
              color="bg-purple-500"
            />
            <StepCard
              step="2"
              title="Individual Profiles"
              description="Tap into any family member&apos;s profile for detailed weight trends, meal history, vital signs, medications, and upcoming appointments."
              color="bg-blue-500"
            />
            <StepCard
              step="3"
              title="Self-Teaching Insights"
              description="Platform-generated health analysis surfaces patterns you&apos;d never catch manually — declining intake, weight plateaus, vital sign trends."
              color="bg-indigo-500"
            />
            <StepCard
              step="4"
              title="Action Items"
              description="A prioritized list of what needs your attention today: overdue check-ins, medication reminders, abnormal readings, and care tasks."
              color="bg-emerald-500"
            />
          </div>
          <div className="hidden md:flex items-center justify-center mt-6">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="w-12 h-0.5 bg-purple-500" />
              <ArrowRightIcon className="w-5 h-5 text-purple-500" />
              <span className="w-12 h-0.5 bg-blue-500" />
              <ArrowRightIcon className="w-5 h-5 text-blue-500" />
              <span className="w-12 h-0.5 bg-indigo-500" />
              <ArrowRightIcon className="w-5 h-5 text-indigo-500" />
              <span className="w-12 h-0.5 bg-emerald-500" />
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* USE CASES — 3 emotional scenarios            */}
        {/* ============================================ */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">How Families Actually Use the Dashboard</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real routines that bring peace of mind to everyday caregiving.
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            <ScenarioCard
              title="Morning Check-In Routine"
              time="7:00 AM"
              gradient="from-purple-500 to-blue-500"
              narrative="Before the day starts, Maria opens the Dashboard with her coffee. She sees that her father&apos;s blood pressure reading from last night was slightly elevated, her daughter&apos;s weight is on track this week, and her husband logged a healthy breakfast. One screen. Thirty seconds. She knows everyone is okay — or exactly where to focus her attention."
              outcome="Peace of mind before the day even begins."
            />
            <ScenarioCard
              title="Caregiver Handoff Between Shifts"
              time="3:00 PM"
              gradient="from-blue-500 to-indigo-500"
              narrative="James is taking over evening care for his mother from his sister. He opens the Dashboard and immediately sees: morning medications were given on time, lunch was logged with a photo, and there&apos;s one action item — Mom&apos;s afternoon vitals haven&apos;t been recorded yet. No phone call needed. No guessing about what happened during the day."
              outcome="Seamless handoffs without a single dropped ball."
            />
            <ScenarioCard
              title="Weekly Family Health Review"
              time="Sunday Evening"
              gradient="from-indigo-500 to-purple-500"
              narrative="Every Sunday, the Patel family sits down and reviews the Dashboard together. They look at weight progress for the adults, meal quality scores for the kids, and check if any upcoming appointments need drivers assigned. The self-teaching insights flag that their son&apos;s vegetable intake dropped 40% this week — time to get creative with dinner."
              outcome="A 10-minute ritual that keeps the whole family aligned."
            />
          </div>
        </section>

        {/* ============================================ */}
        {/* SCREENSHOT SHOWCASE                          */}
        {/* ============================================ */}
        <section className="mb-24">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">See It In Action</h2>

          <div className="mb-12">
            <Screenshot
              src="/screenshots/family-care/admin-dashboard-full-desktop-light.png"
              alt="Family Health Dashboard showing all family members with health snapshots, active medications, and vital check times"
              caption="Your entire family&apos;s health — one glance, zero guesswork"
              priority
              zoomable
            />
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Screenshot
              src="/screenshots/family-care/family-dashboard-overview-desktop-light.png"
              alt="Family health overview dashboard with quick stats and member snapshots"
              caption="Instant overview: who needs attention, who&apos;s on track"
              zoomable
            />
            <Screenshot
              src="/screenshots/family-care/all-management-tools-desktop-light.png"
              alt="14 family health management tools grid including meals, weight, vitals, and medications"
              caption="14 integrated tools — from medications to meal tracking to household duties"
              zoomable
            />
          </div>

          <h3 className="text-2xl font-bold text-foreground mb-6 text-center">Works On Every Device</h3>
          <div className="flex flex-wrap justify-center gap-8">
            <MobileFrame variant="ios" caption="Check on everyone from your phone">
              <Screenshot
                src="/screenshots/family-care/family-dashboard-mobile-light.png"
                alt="Mobile family health dashboard"
                variant="mobile"
              />
            </MobileFrame>
            <MobileFrame variant="ios" caption="Every tool accessible on the go">
              <Screenshot
                src="/screenshots/family-care/management-tools-desktop-light.png"
                alt="Management tools on mobile view"
                variant="mobile"
              />
            </MobileFrame>
          </div>
        </section>

        {/* ============================================ */}
        {/* KEY CAPABILITIES — 6 benefit-first cards     */}
        {/* ============================================ */}
        <section className="mb-24">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Everything You Need, Nothing You Don&apos;t</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<EyeIcon className="w-12 h-12 text-emerald-600" />}
              title="Family Overview"
              benefit="Know how everyone is doing in under 10 seconds"
              description="Every family member&apos;s status displayed at a glance — weight trends, recent meals, vital signs, and last activity. One screen replaces five separate check-ins."
            />
            <FeatureCard
              icon={<ArrowsRightLeftIcon className="w-12 h-12 text-emerald-600" />}
              title="Profile Switching"
              benefit="Go from household view to individual detail instantly"
              description="Tap any family member to dive into their full health profile — weight charts, meal logs, vitals history, medications, and self-teaching insights. Switch back with one tap."
            />
            <FeatureCard
              icon={<BellAlertIcon className="w-12 h-12 text-emerald-600" />}
              title="Smart Alerts"
              benefit="Get notified before small issues become big problems"
              description="Proactive notifications for declining trends, missed medications, overdue check-ins, and abnormal vital signs. The system watches so you don&apos;t have to."
            />
            <FeatureCard
              icon={<LightBulbIcon className="w-12 h-12 text-emerald-600" />}
              title="Self-Teaching Health Insights"
              benefit="Understand patterns you would never catch manually"
              description="Platform-generated analysis across meals, weight, vitals, and activity. Detects correlations, flags anomalies, and suggests next steps tailored to each person."
            />
            <FeatureCard
              icon={<ClipboardDocumentCheckIcon className="w-12 h-12 text-emerald-600" />}
              title="Care Coordination"
              benefit="Keep every caregiver on the same page automatically"
              description="Assign tasks, track completions, and share the activity feed with family members. No more phone tag to find out what happened during someone else&apos;s shift."
            />
            <FeatureCard
              icon={<LockClosedIcon className="w-12 h-12 text-emerald-600" />}
              title="Privacy Controls"
              benefit="Share only what each person needs to see"
              description="Granular role-based permissions let you control who sees what. Each family member&apos;s data is protected with HIPAA-compliant storage, encryption, and access controls."
            />
          </div>
        </section>

        {/* ============================================ */}
        {/* DIFFERENTIATOR — Side-by-side comparison     */}
        {/* ============================================ */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">This Isn&apos;t Just Another Health App</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Most apps show YOUR data. The WPL Dashboard shows EVERYONE&apos;s data — intelligently.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border-2 border-border">
            {/* Other Apps */}
            <div className="p-8 bg-red-50 dark:bg-red-950/20">
              <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-6">Other Health Apps</h3>
              <div className="space-y-4">
                {[
                  'Shows only YOUR data — one person per app',
                  'Separate logins for each family member',
                  'No cross-person pattern detection',
                  'Alerts only for your own metrics',
                  'No caregiver coordination tools',
                  'Export your data, but nobody else sees it',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <XMarkIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-red-800 dark:text-red-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* WPL Dashboard */}
            <div className="p-8 bg-green-50 dark:bg-green-950/20">
              <h3 className="text-xl font-bold text-green-700 dark:text-green-400 mb-6">WPL Dashboard</h3>
              <div className="space-y-4">
                {[
                  'Shows EVERYONE&apos;s data from one intelligent view',
                  'One login — unlimited family members',
                  'Self-teaching system detects patterns across the entire household',
                  'Smart alerts for every person you care about',
                  'Built-in care coordination and task management',
                  'Shared activity feed with role-based privacy',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-green-800 dark:text-green-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* TRUST BADGES                                 */}
        {/* ============================================ */}
        <section className="mb-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <TrustBadge
              icon={<ShieldCheckIcon className="w-8 h-8 text-emerald-600" />}
              value="HIPAA"
              label="Compliant & Encrypted"
            />
            <TrustBadge
              icon={<UserGroupIcon className="w-8 h-8 text-emerald-600" />}
              value="Unlimited"
              label="Family Members"
            />
            <TrustBadge
              icon={<ChartBarIcon className="w-8 h-8 text-emerald-600" />}
              value="14+"
              label="Integrated Health Tools"
            />
            <TrustBadge
              icon={<SparklesIcon className="w-8 h-8 text-emerald-600" />}
              value="Self-Teaching"
              label="Proactive Insights"
            />
          </div>
        </section>

        {/* ============================================ */}
        {/* RELATED FEATURES — Sibling pages             */}
        {/* ============================================ */}
        <section className="mb-24">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Explore What Powers the Dashboard</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <RelatedLink href="/blog/meal-tracking" title="Meal Tracking" description="AI photo capture (Gemini Vision) + self-teaching nutrition analysis" />
            <RelatedLink href="/blog/weight-tracking" title="Weight Tracking" description="Trend charts, goal setting, and progress visualization" />
            <RelatedLink href="/blog/vitals-tracking" title="Vitals Tracking" description="Blood pressure, glucose, temperature, and more" />
            <RelatedLink href="/blog/medications" title="Medications" description="Medication schedules, reminders, and adherence tracking" />
          </div>
        </section>

        {/* ============================================ */}
        {/* FINAL CTA — Emotional close                  */}
        {/* ============================================ */}
        <section className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Your Family&apos;s Health Shouldn&apos;t Require 5 Separate Logins
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            One dashboard. One intelligent system. Everyone you care about — visible, protected, and connected. See it all in one glance and know exactly what needs your attention.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
            >
              Start Your Free Trial
            </Link>
            <DemoRequestButton
              source="blog/dashboard-cta"
              className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-semibold"
            >
              Request a Demo
            </DemoRequestButton>
          </div>
          <p className="text-sm text-white/70 mt-6">
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

// ==================== HELPER COMPONENTS ====================

function ProblemCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-red-200 dark:border-red-900/50 p-6">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function StepCard({ step, title, description, color }: { step: string; title: string; description: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-4`}>
        {step}
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function ScenarioCard({
  title,
  time,
  gradient,
  narrative,
  outcome,
}: {
  title: string
  time: string
  gradient: string
  narrative: string
  outcome: string
}) {
  return (
    <div className="bg-card rounded-2xl border-2 border-border overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all">
      <div className={`bg-gradient-to-r ${gradient} p-6 text-white`}>
        <p className="text-sm text-white/80 font-medium mb-1">{time}</p>
        <h3 className="text-2xl font-bold">{title}</h3>
      </div>
      <div className="p-6">
        <p className="text-muted-foreground leading-relaxed mb-4">{narrative}</p>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <CheckIcon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">{outcome}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  benefit,
  description,
}: {
  icon: React.ReactNode
  title: string
  benefit: string
  description: string
}) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-emerald-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm font-medium text-emerald-600 mb-3">{benefit}</p>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function TrustBadge({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="text-center p-6 rounded-xl bg-card border-2 border-border">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function RelatedLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="bg-card rounded-lg border-2 border-border p-4 hover:border-emerald-300 hover:shadow-lg transition-all block">
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
