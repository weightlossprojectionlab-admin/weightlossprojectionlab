/**
 * Family Care - Core Product Hook Page
 *
 * Repositioned from generic feature showcase to the platform's
 * core differentiator: intelligent multi-person health monitoring.
 *
 * Structure: Problem → Solution Loop → Use Cases → Differentiator → Features → CTA
 */

import Link from 'next/link'
import { Metadata } from 'next'
import {
  SparklesIcon,
  UserGroupIcon,
  ChartBarIcon,
  BellAlertIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  CheckIcon,
  XMarkIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { Screenshot, MobileFrame } from '@/components/ui/Screenshot'

export const metadata: Metadata = {
  title: 'Family Health Tracking — Intelligent Monitoring for Everyone You Care About | Wellness Projection Lab',
  description: 'Multi-person intelligent health monitoring for your entire family. AI-powered alerts for newborns to seniors. Track nutrition, weight, vitals, and medications — one dashboard, proactive insights.',
  keywords: 'family health monitoring, multi-person health tracking, AI health alerts, pediatric tracking, elderly care monitoring, family care dashboard, caregiver coordination, family health app',
  openGraph: {
    title: 'Family Health Tracking — Intelligent Monitoring for Everyone You Care About',
    description: 'Multi-person intelligent health monitoring for your entire family. AI-powered alerts from newborns to seniors.',
    type: 'article',
    url: 'https://weightlossproglab.com/blog/family-care',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Family Health Tracking — Intelligent Monitoring for Everyone You Care About',
    description: 'Multi-person intelligent health monitoring for your entire family. AI-powered alerts from newborns to seniors.',
  },
  alternates: {
    canonical: 'https://weightlossproglab.com/blog/family-care'
  }
}

export default function FamilyCareBlogPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* ============================================ */}
      {/* HERO — Emotional hook + clear value prop     */}
      {/* ============================================ */}
      <div className="relative bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 text-white overflow-hidden">
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
              <span className="text-sm font-medium">Multi-Person Intelligent Monitoring</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              One Place to Protect Your Family&apos;s Health
            </h1>
            <p className="text-xl text-white/90 mb-8 leading-relaxed max-w-3xl mx-auto">
              Track your child&apos;s nutrition, your partner&apos;s progress, and your parents&apos; wellness — all in one intelligent system that alerts you before problems happen.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors font-semibold shadow-lg"
              >
                Start Free Trial
              </Link>
              <a
                href="#how-it-works"
                className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-semibold"
              >
                See How It Works
              </a>
            </div>
            <p className="text-sm text-white/70 mt-4">
              No credit card required &bull; 7-day free trial &bull; Cancel anytime
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ============================================ */}
        {/* THE PROBLEM — Why solo tracking fails        */}
        {/* ============================================ */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">The Problem With How Families Track Health Today</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your family&apos;s health is scattered across apps, spreadsheets, and memory. That&apos;s how things get missed.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-8 h-8 text-red-500" />}
              title="Scattered Across Apps"
              description="One app for your weight, another for your kid's meals, a notebook for Mom's medications. Nothing connects. Data lives in silos that can't talk to each other."
            />
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-8 h-8 text-red-500" />}
              title="No Early Warning System"
              description="By the time you notice a problem, it's already a problem. No app is watching for patterns across your family — declining intake, missed medications, weight plateaus."
            />
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-8 h-8 text-red-500" />}
              title="No Family-Wide Picture"
              description="You can't see how everyone is doing at a glance. There's no single place that answers: 'Is my family healthy right now?'"
            />
          </div>
        </section>

        {/* ============================================ */}
        {/* THE SYSTEM LOOP — Track → Analyze → Alert    */}
        {/* ============================================ */}
        <section id="how-it-works" className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">We Don&apos;t Just Track Data — We Interpret It</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              One intelligent engine that monitors everyone and surfaces what matters.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <LoopStep
              step="1"
              title="Track"
              description="Log meals, weight, vitals, symptoms, and medications for every family member."
              color="bg-blue-500"
            />
            <LoopStep
              step="2"
              title="Analyze"
              description="AI detects patterns, projects trends, and flags anomalies across all profiles."
              color="bg-purple-500"
            />
            <LoopStep
              step="3"
              title="Alert"
              description="Get notified before problems happen — low intake, missed meds, declining trends."
              color="bg-amber-500"
            />
            <LoopStep
              step="4"
              title="Improve"
              description="Act on insights: adjust goals, coordinate care, and track outcomes together."
              color="bg-green-500"
            />
          </div>
          <div className="hidden md:flex items-center justify-center mt-6">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="w-12 h-0.5 bg-blue-500" />
              <ArrowRightIcon className="w-5 h-5 text-blue-500" />
              <span className="w-12 h-0.5 bg-purple-500" />
              <ArrowRightIcon className="w-5 h-5 text-purple-500" />
              <span className="w-12 h-0.5 bg-amber-500" />
              <ArrowRightIcon className="w-5 h-5 text-amber-500" />
              <span className="w-12 h-0.5 bg-green-500" />
              <ArrowRightIcon className="w-5 h-5 text-green-500" />
              <span className="text-xs font-medium text-green-600">repeat</span>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* USE-CASE BLOCKS — Age-specific personas      */}
        {/* ============================================ */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Same Engine. Different Outputs.</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Whether it&apos;s your newborn, your partner, or your aging parent — the system adapts to their life stage.
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            <UseCaseCard
              emoji="👶"
              title="Children"
              subtitle="Newborns through age 12"
              features={[
                'Feeding insights & growth tracking',
                'Life stage detection (Newborn → Infant → Toddler → Child)',
                'Pediatric health conditions monitoring',
                'Weight in ounces for newborns',
                'Vaccination & well-visit reminders',
              ]}
              alertExample={`"Your child's caloric intake has been below target for 3 days — consider checking with your pediatrician."`}
              gradient="from-pink-500 to-rose-500"
            />
            <UseCaseCard
              emoji="👤"
              title="Adults"
              subtitle="Partners, siblings, yourself"
              features={[
                'Weight loss projections & goal tracking',
                'AI-powered nutrition analysis',
                'Meal pattern & habit detection',
                'Activity level monitoring',
                'BMI trends with smart recommendations',
              ]}
              alertExample='"Your progress has slowed this week. A recent change in meal timing may be a factor."'
              gradient="from-blue-500 to-indigo-500"
            />
            <UseCaseCard
              emoji="👴"
              title="Aging Parents"
              subtitle="Elderly care & caregiving"
              features={[
                'Vital sign monitoring & trend alerts',
                'Medication tracking & refill reminders',
                'Health decline pattern detection',
                'Caregiver duty coordination',
                'Appointment & transportation management',
              ]}
              alertExample='"A health trend for Barbara may need attention — weight has decreased 4% over 2 weeks."'
              gradient="from-amber-500 to-orange-500"
            />
          </div>
        </section>

        {/* ============================================ */}
        {/* DIFFERENTIATOR — Why this is different       */}
        {/* ============================================ */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">This Isn&apos;t Another Health App</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Most apps track one person. We monitor your entire family intelligently.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border-2 border-border">
            {/* Other Apps */}
            <div className="p-8 bg-red-50 dark:bg-red-950/20">
              <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-6">Other Health Apps</h3>
              <div className="space-y-4">
                {[
                  'Solo tracking — one person per app',
                  'Manual logging with no interpretation',
                  'No proactive alerts',
                  'Separate accounts for each family member',
                  'No caregiver coordination',
                  'Generic insights, not personalized',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <XMarkIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-red-800 dark:text-red-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* WPL Family Care */}
            <div className="p-8 bg-green-50 dark:bg-green-950/20">
              <h3 className="text-xl font-bold text-green-700 dark:text-green-400 mb-6">WPL Family Care</h3>
              <div className="space-y-4">
                {[
                  'Multi-person monitoring from one dashboard',
                  'AI interprets data and detects patterns',
                  'Proactive alerts before problems happen',
                  'All family members under one account',
                  'Caregiver duties, assignments, and scheduling',
                  'Life-stage-aware insights (newborns to seniors)',
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
        {/* SCREENSHOT SHOWCASE                          */}
        {/* ============================================ */}
        <section className="mb-24">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">See It In Action</h2>

          <div className="mb-12">
            <Screenshot
              src="/screenshots/family-care/admin-dashboard-full-desktop-light.png"
              alt="Family Admin Dashboard showing 5 Family Members Under Care with health snapshots, active medications, and vital check times"
              caption="Your entire family's health — one glance, zero guesswork"
              priority
              zoomable
            />
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Screenshot
              src="/screenshots/family-care/family-dashboard-overview-desktop-light.png"
              alt="Family health overview with quick stats and member snapshots"
              caption="Instant overview: who needs attention, who's on track"
              zoomable
            />
            <Screenshot
              src="/screenshots/family-care/all-management-tools-desktop-light.png"
              alt="14 family health management tools grid"
              caption="14 integrated tools — from medications to meal tracking to household duties"
              zoomable
            />
          </div>

          <h3 className="text-2xl font-bold text-foreground mb-6 text-center">Works On Every Device</h3>
          <div className="flex flex-wrap justify-center gap-8">
            <MobileFrame variant="ios">
              <Screenshot
                src="/screenshots/family-care/family-dashboard-mobile-light.png"
                alt="Mobile family dashboard"
                caption="Check on everyone from your phone"
                variant="mobile"
              />
            </MobileFrame>
            <MobileFrame variant="ios">
              <Screenshot
                src="/screenshots/patient-care/family-members-list-mobile-light.png"
                alt="Family members list on mobile"
                caption="Switch between family members instantly"
                variant="mobile"
              />
            </MobileFrame>
            <MobileFrame variant="ios">
              <Screenshot
                src="/screenshots/patient-care/patient-cards-mobile-light.png"
                alt="Patient cards with vitals and dashboard access"
                caption="Vitals and dashboard per person"
                variant="mobile"
              />
            </MobileFrame>
          </div>
        </section>

        {/* ============================================ */}
        {/* KEY CAPABILITIES — Refined feature cards     */}
        {/* ============================================ */}
        <section className="mb-24">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Everything Your Family Needs</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<UserGroupIcon className="w-12 h-12 text-emerald-600" />}
              title="Multi-Person Dashboard"
              description="See every family member's status at a glance. Quick-switch between profiles. One login, unlimited people."
            />
            <FeatureCard
              icon={<ChartBarIcon className="w-12 h-12 text-emerald-600" />}
              title="AI Health Insights"
              description="Pattern detection across meals, weight, vitals, and symptoms. The system learns what's normal for each person."
            />
            <FeatureCard
              icon={<BellAlertIcon className="w-12 h-12 text-emerald-600" />}
              title="Smart Alerts"
              description="Proactive notifications: declining trends, missed medications, overdue check-ins, and abnormal vitals."
            />
            <FeatureCard
              icon={<CalendarIcon className="w-12 h-12 text-emerald-600" />}
              title="Family Calendar"
              description="Appointments color-coded by person. Driver assignment. Reminders that reach the right caregiver."
            />
            <FeatureCard
              icon={<ClipboardDocumentListIcon className="w-12 h-12 text-emerald-600" />}
              title="Care Task Coordination"
              description="Assign household duties, track completions, and balance caregiver workload with analytics and scheduling."
            />
            <FeatureCard
              icon={<LockClosedIcon className="w-12 h-12 text-emerald-600" />}
              title="Privacy & HIPAA Controls"
              description="Granular role-based permissions. Each person's data is protected. HIPAA-compliant storage and access."
            />
          </div>
        </section>

        {/* ============================================ */}
        {/* TRUST & SOCIAL PROOF                         */}
        {/* ============================================ */}
        <section className="mb-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <TrustBadge value="14" label="Care Categories" />
            <TrustBadge value="Newborn → Senior" label="Full Life Stage Support" />
            <TrustBadge value="HIPAA" label="Compliant & Encrypted" />
            <TrustBadge value="7-Day" label="Free Trial, No Card" />
          </div>
        </section>

        {/* ============================================ */}
        {/* FINAL CTA — Emotional close                  */}
        {/* ============================================ */}
        <section className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Your Family&apos;s Health Shouldn&apos;t Live in 5 Different Apps
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
            One dashboard. One intelligent system. Everyone you care about — monitored, protected, and connected.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors font-semibold shadow-lg"
            >
              Start Your Free Trial
            </Link>
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

function LoopStep({ step, title, description, color }: { step: string; title: string; description: string; color: string }) {
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

function UseCaseCard({
  emoji,
  title,
  subtitle,
  features,
  alertExample,
  gradient,
}: {
  emoji: string
  title: string
  subtitle: string
  features: string[]
  alertExample: string
  gradient: string
}) {
  return (
    <div className="bg-card rounded-2xl border-2 border-border overflow-hidden hover:border-emerald-300 hover:shadow-lg transition-all">
      <div className={`bg-gradient-to-r ${gradient} p-6 text-white`}>
        <span className="text-4xl">{emoji}</span>
        <h3 className="text-2xl font-bold mt-2">{title}</h3>
        <p className="text-sm text-white/80">{subtitle}</p>
      </div>
      <div className="p-6">
        <ul className="space-y-3 mb-6">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <CheckIcon className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <BellAlertIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300 italic">{alertExample}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-emerald-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function TrustBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center p-6 rounded-xl bg-card border-2 border-border">
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
