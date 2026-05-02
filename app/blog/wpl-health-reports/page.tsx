/**
 * WPL Health Reports - Marketing Blog Page
 *
 * "Your Family's Health — Interpreted, Not Just Tracked"
 * Showcases the unique Self-Teaching Health Intelligence feature of WPL
 */

import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { blogPostingSchema } from '@/lib/json-ld'
import { Metadata } from 'next'
import {
  CheckCircleIcon,
  SparklesIcon,
  DocumentTextIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  HeartIcon,
  UserGroupIcon,
  BellAlertIcon,
  ShieldCheckIcon,
  MagnifyingGlassCircleIcon,
  ScaleIcon,
  BeakerIcon,
  ExclamationCircleIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'

export const metadata: Metadata = {
  title: 'Self-Teaching Health Reports — Your Family\'s Health Interpreted, Not Just Tracked | Wellness Projection Lab',
  description:
    'WPL delivers weekly self-teaching health reports for every family member. Meal pattern analysis, weight trend insights, vital sign correlations, and actionable recommendations — all in one place.',
  keywords:
    'self-teaching health reports, family health tracking, weekly health insights, personalized health recommendations, meal pattern analysis, weight trend insights, vital sign monitoring, family wellness, WPL health intelligence',
  openGraph: {
    title: 'Self-Teaching Health Reports — Your Family\'s Health Interpreted, Not Just Tracked',
    description:
      'WPL delivers weekly self-teaching health reports for every family member. Meal pattern analysis, weight trend insights, vital sign correlations, and actionable recommendations.',
    type: 'article',
    images: [{ url: 'https://www.wellnessprojectionlab.com/screenshots/family-care/family-dashboard-overview-desktop-light.png', width: 1200, height: 630, alt: 'Wellness Projection Lab - Wpl Health Reports' }],
    url: 'https://www.wellnessprojectionlab.com/blog/wpl-health-reports',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://www.wellnessprojectionlab.com/screenshots/family-care/family-dashboard-overview-desktop-light.png'],
    title: 'Self-Teaching Health Reports — Your Family\'s Health Interpreted, Not Just Tracked',
    description:
      'WPL delivers weekly self-teaching health reports for every family member. Meal patterns, weight trends, vital correlations, and actionable recommendations.',
  },
  alternates: {
    canonical: 'https://www.wellnessprojectionlab.com/blog/wpl-health-reports',
  },
}

export default function AiHealthReportsBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd
        data={blogPostingSchema({
          headline: 'Self-Teaching Health Reports — Your Family\'s Health Interpreted, Not Just Tracked',
          description: 'WPL delivers weekly self-teaching health reports for every family member. Meal pattern analysis, weight trend insights, vital sign correlations, and actionable recommendations — all in one place.',
          slug: 'wpl-health-reports',
          image: '/screenshots/family-care/family-dashboard-overview-desktop-light.png',
          datePublished: '2026-01-15T00:00:00-05:00',
          keywords: 'self-teaching health reports, family health tracking, weekly health insights, personalized health recommendations, meal pattern analysis, weight trend insights, vital sign monitoring, family wellness, WPL health intelligence',
        })}
      />
      {/* ─── 1. Hero ─── */}
      <section className="relative bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-600 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-5 py-2 mb-8">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm font-semibold tracking-wide">Self-Teaching Health Intelligence</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
              Your Family's Health — <br className="hidden md:block" />
              <span className="text-cyan-200">Interpreted</span>, Not Just Tracked
            </h1>

            <p className="text-xl md:text-2xl text-white/90 mb-10 leading-relaxed max-w-3xl mx-auto">
              Every week, WPL's self-teaching engine reads your family's meals, weight, and vitals — then
              tells you what it all <em>means</em>. Per person. In plain language.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/dashboard"
                className="px-8 py-4 bg-white text-cyan-700 rounded-lg hover:bg-cyan-50 transition-colors font-bold shadow-lg text-lg"
              >
                Start Free Trial
              </Link>
              <Link
                href="/blog/meal-tracking"
                className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-semibold text-lg"
              >
                See How Tracking Works
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* ─── 2. The Problem ─── */}
        <section className="mb-24">
          <SectionHeading
            overline="The Problem"
            title="Data Without Interpretation Is Just Noise"
            subtitle="Most health apps collect numbers and leave you to figure out what they mean. That's not health management — that's homework."
          />

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <ProblemCard
              icon={<ChartBarIcon className="w-10 h-10 text-red-400" />}
              title="Data Without Interpretation"
              description="You log meals, steps, and weight every day — but the app never tells you if those numbers are good, bad, or trending the wrong way."
            />
            <ProblemCard
              icon={<MagnifyingGlassCircleIcon className="w-10 h-10 text-red-400" />}
              title="You Don't Know What Patterns Mean"
              description="Is a 2lb fluctuation normal? Is skipping breakfast hurting your kid's energy? Without context, raw data creates more anxiety than clarity."
            />
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-10 h-10 text-red-400" />}
              title="No One Connecting the Dots"
              description="Meals affect weight. Weight affects vitals. Vitals signal risk. But no app connects those dots across every family member — until now."
            />
          </div>
        </section>

        {/* ─── 3. What the Report Contains ─── */}
        <section className="mb-24">
          <SectionHeading
            overline="Inside Your Report"
            title="What the Report Contains"
            subtitle="Every Monday, each family member receives a personalized health brief covering four critical dimensions."
          />

          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <ReportBlock
              icon={<BeakerIcon className="w-8 h-8 text-cyan-600" />}
              color="cyan"
              title="Meal Pattern Analysis"
              bullets={[
                'Macro & micro nutrient balance over the week',
                'Meal timing consistency and skipped-meal detection',
                'Caloric trend vs. personal goals',
              ]}
            />
            <ReportBlock
              icon={<ScaleIcon className="w-8 h-8 text-sky-600" />}
              color="sky"
              title="Weight Trend Insights"
              bullets={[
                'Rolling 7-day and 30-day trend lines',
                'Plateau detection with possible causes',
                'Projected trajectory at current pace',
              ]}
            />
            <ReportBlock
              icon={<HeartIcon className="w-8 h-8 text-blue-600" />}
              color="blue"
              title="Vital Sign Correlations"
              bullets={[
                'Blood pressure, heart rate, and glucose patterns',
                'Cross-reference vitals with meal and weight data',
                'Anomaly flagging with severity indicators',
              ]}
            />
            <ReportBlock
              icon={<LightBulbIcon className="w-8 h-8 text-cyan-600" />}
              color="cyan"
              title="Actionable Recommendations"
              bullets={[
                'Plain-language next steps for each family member',
                'Suggested dietary adjustments and meal swaps',
                'When to see a doctor vs. when to adjust at home',
              ]}
            />
          </div>
        </section>

        {/* ─── 4. Sample Insights ─── */}
        <section className="mb-24">
          <SectionHeading
            overline="Real Examples"
            title="Sample Insights"
            subtitle="Here's what an actual WPL health alert looks like in your weekly report."
          />

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <InsightCard
              severity="warning"
              insight="Your caloric intake dropped 15% this week. This may slow your progress if sustained — consider adding a protein-rich snack in the afternoon."
              person="You"
            />
            <InsightCard
              severity="alert"
              insight="Your child's protein intake has been below target for 5 consecutive days. This could affect growth and energy levels."
              person="Ethan (Age 9)"
            />
            <InsightCard
              severity="critical"
              insight="Barbara's blood pressure trend is creeping upward over the last 3 weeks — consider scheduling a checkup with her physician."
              person="Barbara (Age 72)"
            />
          </div>
        </section>

        {/* ─── 5. Emotional Use Cases ─── */}
        <section className="mb-24">
          <SectionHeading
            overline="Real Life, Real Impact"
            title="How Families Use Self-Teaching Health Reports"
            subtitle="These aren't hypothetical scenarios — they're the moments that matter most."
          />

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <UseCaseCard
              icon={<UserGroupIcon className="w-10 h-10 text-cyan-600" />}
              title="The Weekly Family Health Review"
              description="Sunday evening, the Garcias sit down and review everyone's report together. Dad's sodium is high. Mom's weight is trending perfectly. The kids need more vegetables. One report. Five minutes. A week of better decisions."
            />
            <UseCaseCard
              icon={<ExclamationCircleIcon className="w-10 h-10 text-sky-600" />}
              title="Catching Nutritional Gaps in Kids"
              description="Lisa didn't realize her 8-year-old was consistently low on iron until WPL flagged it three weeks in a row. A simple dietary tweak — more spinach and lean beef — and the alerts stopped."
            />
            <UseCaseCard
              icon={<HeartIcon className="w-10 h-10 text-blue-600" />}
              title="Monitoring an Elderly Parent's Decline"
              description="James lives 200 miles from his mother. WPL's weekly report alerted him that her caloric intake had dropped 20% over a month and her blood pressure was rising. He scheduled a doctor visit before it became a crisis."
            />
          </div>
        </section>

        {/* ─── 6. Key Features ─── */}
        <section className="mb-24">
          <SectionHeading
            overline="Feature Set"
            title="Everything Inside Your Self-Teaching Health Report"
            subtitle="Six powerful capabilities working together every single week."
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            <FeatureCard
              icon={<DocumentTextIcon className="w-10 h-10 text-cyan-600" />}
              title="Weekly Automated Reports"
              description="Delivered every Monday morning. No action required — your insights are waiting when you wake up."
            />
            <FeatureCard
              icon={<UserGroupIcon className="w-10 h-10 text-cyan-600" />}
              title="Per-Person Insights"
              description="Every family member gets their own section with personalized analysis, not a generic household average."
            />
            <FeatureCard
              icon={<ChartBarIcon className="w-10 h-10 text-sky-600" />}
              title="Pattern Detection"
              description="The system identifies recurring trends — like skipped breakfasts every Thursday or weekend sodium spikes — that you'd never spot manually."
            />
            <FeatureCard
              icon={<BellAlertIcon className="w-10 h-10 text-sky-600" />}
              title="Risk Alerts"
              description="Flagged early warnings for weight plateaus, abnormal vital trends, missed medications, or nutritional deficiencies."
            />
            <FeatureCard
              icon={<ShoppingCartIcon className="w-10 h-10 text-blue-600" />}
              title="Shopping List Integration"
              description="Reports include a suggested shopping list based on nutritional gaps identified that week. One tap to add items."
            />
            <FeatureCard
              icon={<ArrowTrendingUpIcon className="w-10 h-10 text-blue-600" />}
              title="Progress Tracking"
              description="Week-over-week comparisons that celebrate wins and gently surface areas that need attention."
            />
          </div>
        </section>

        {/* ─── 7. Differentiator ─── */}
        <section className="mb-24">
          <div className="relative bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 dark:from-cyan-950/30 dark:via-sky-950/30 dark:to-blue-950/30 rounded-3xl p-12 md:p-16 text-center border border-cyan-200 dark:border-cyan-800">
            <SparklesIcon className="w-12 h-12 text-cyan-600 mx-auto mb-6" />
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-6">
              Other Apps Give You Data. <br />
              <span className="text-cyan-600">WPL Gives You Answers.</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
              No competitor delivers weekly self-teaching health reports broken down per family member.
              Not MyFitnessPal. Not Apple Health. Not Fitbit. This is the feature that turns
              passive tracking into active family health management.
            </p>
            <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <DiffCard label="Typical Apps" value="Raw numbers" negative />
              <DiffCard label="Wearables" value="Step counts" negative />
              <DiffCard label="WPL" value="Interpreted insights per person" positive />
            </div>
          </div>
        </section>

        {/* ─── 8. Related Features ─── */}
        <section className="mb-24">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Explore Related Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <RelatedLink
              href="/dashboard"
              title="Dashboard"
              description="Your centralized health command center"
            />
            <RelatedLink
              href="/blog/meal-tracking"
              title="Meal Tracking"
              description="AI meal photo capture (Gemini Vision) with self-teaching nutrition guidance"
            />
            <RelatedLink
              href="/blog/vitals-tracking"
              title="Vitals Tracking"
              description="Blood pressure, heart rate, glucose & more"
            />
            <RelatedLink
              href="/blog/weight-tracking"
              title="Weight Tracking"
              description="Trend lines, projections, and goal pacing"
            />
          </div>
        </section>

        {/* ─── 9. Trust + CTA ─── */}
        <section className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 rounded-3xl p-12 md:p-16 text-center text-white">
          <ShieldCheckIcon className="w-12 h-12 mx-auto mb-6 text-white/80" />
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            Start Getting Answers, Not Just Numbers
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
            Your first self-teaching health report is generated within 7 days of tracking.
            No credit card required to start your free 7-day trial.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-10 py-4 bg-white text-cyan-700 rounded-lg hover:bg-cyan-50 transition-colors font-bold shadow-lg text-lg"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="px-10 py-4 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-semibold text-lg"
            >
              View Pricing
            </Link>
          </div>
          <p className="text-sm text-white/70 mt-8">
            No credit card required &bull; 7-day free trial &bull; Cancel anytime &bull; HIPAA compliant
          </p>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm">
            <Link href="/security" className="text-white/80 hover:text-white underline">
              Security
            </Link>
            <Link href="/hipaa" className="text-white/80 hover:text-white underline">
              HIPAA Compliance
            </Link>
            <Link href="/privacy" className="text-white/80 hover:text-white underline">
              Privacy Policy
            </Link>
            <Link href="/support" className="text-white/80 hover:text-white underline">
              Help Center
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Inline Helper Components
   ═══════════════════════════════════════════ */

function SectionHeading({
  overline,
  title,
  subtitle,
}: {
  overline: string
  title: string
  subtitle: string
}) {
  return (
    <div className="text-center max-w-3xl mx-auto">
      <span className="inline-block text-sm font-semibold tracking-widest uppercase text-cyan-600 mb-3">
        {overline}
      </span>
      <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">{title}</h2>
      <p className="text-lg text-muted-foreground leading-relaxed">{subtitle}</p>
    </div>
  )
}

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
    <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-800 p-8">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function ReportBlock({
  icon,
  color,
  title,
  bullets,
}: {
  icon: React.ReactNode
  color: 'cyan' | 'sky' | 'blue'
  title: string
  bullets: string[]
}) {
  const bgMap = {
    cyan: 'bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800',
    sky: 'bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800',
    blue: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
  }
  return (
    <div className={`rounded-2xl border p-8 ${bgMap[color]}`}>
      <div className="flex items-center gap-3 mb-5">
        {icon}
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
      </div>
      <ul className="space-y-3">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-muted-foreground">
            <CheckCircleIcon className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function InsightCard({
  severity,
  insight,
  person,
}: {
  severity: 'warning' | 'alert' | 'critical'
  insight: string
  person: string
}) {
  const styles = {
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      label: 'Heads Up',
    },
    alert: {
      bg: 'bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-700',
      badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      label: 'Attention Needed',
    },
    critical: {
      bg: 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      label: 'Action Required',
    },
  }
  const s = styles[severity]
  return (
    <div className={`rounded-2xl border-2 p-6 ${s.bg}`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full ${s.badge}`}>
          {s.label}
        </span>
        <span className="text-sm text-muted-foreground font-medium">{person}</span>
      </div>
      <p className="text-foreground leading-relaxed font-medium">{insight}</p>
    </div>
  )
}

function UseCaseCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-card rounded-2xl border-2 border-border p-8 hover:border-cyan-300 hover:shadow-lg transition-all">
      <div className="mb-5">{icon}</div>
      <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
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
    <div className="bg-card rounded-2xl border-2 border-border p-8 hover:border-cyan-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function DiffCard({
  label,
  value,
  positive,
  negative,
}: {
  label: string
  value: string
  positive?: boolean
  negative?: boolean
}) {
  return (
    <div
      className={`rounded-xl p-5 text-center ${
        positive
          ? 'bg-cyan-100 dark:bg-cyan-900/40 border-2 border-cyan-400 dark:border-cyan-600'
          : 'bg-white/60 dark:bg-white/5 border border-gray-200 dark:border-gray-700'
      }`}
    >
      <p className="text-sm font-semibold text-muted-foreground mb-1">{label}</p>
      <p
        className={`text-lg font-bold ${
          positive ? 'text-cyan-700 dark:text-cyan-300' : negative ? 'text-gray-500' : 'text-foreground'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function RelatedLink({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="bg-card rounded-xl border-2 border-border p-5 hover:border-cyan-300 hover:shadow-lg transition-all block"
    >
      <h3 className="font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
