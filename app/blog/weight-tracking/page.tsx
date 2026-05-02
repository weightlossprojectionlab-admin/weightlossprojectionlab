/**
 * Weight Tracking - Marketing Blog Page
 *
 * Reframed around Self-Teaching Projections as the killer feature.
 * "See Where You're Headed — Not Just Where You've Been"
 */

import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { blogPostingSchema, faqPageSchema } from '@/lib/json-ld'
import { Metadata } from 'next'
import {
  SparklesIcon,
  ScaleIcon,
  ChartBarIcon,
  FlagIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  TrophyIcon,
  UserGroupIcon,
  BellAlertIcon,
  ExclamationTriangleIcon,
  EyeSlashIcon,
  HeartIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  CpuChipIcon,
  LightBulbIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

const PAGE_TITLE = 'Weight Loss Projections — Self-Teaching Weight Tracker for Families'
const PAGE_DESCRIPTION =
  'See where your weight is headed — not just yesterday\u2019s number. A self-teaching weight tracker that projects your trajectory for you, your kids, or an aging parent, with shared family tracking and smart alerts.'
const PAGE_IMAGE =
  'https://www.wellnessprojectionlab.com/screenshots/family-care/family-dashboard-overview-desktop-light.png'
const PAGE_URL = 'https://www.wellnessprojectionlab.com/blog/weight-tracking'

export const metadata: Metadata = {
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESCRIPTION,
  keywords:
    'weight loss projection calculator, self-teaching weight tracker, weight loss prediction app, family weight tracker, how long to reach weight loss goal, track child growth curve, monitor elderly parent weight, weight trajectory app',
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    type: 'article',
    images: [{ url: PAGE_IMAGE, width: 1200, height: 630, alt: 'Self-teaching weight loss projection tracker — Wellness Projection Lab' }],
    url: PAGE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    images: [PAGE_IMAGE],
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

const FAQ = [
  {
    question: 'How accurate is a self-teaching weight loss projection?',
    answer:
      'Projections improve as the model sees more of your data. After about 2\u20134 weeks of consistent logging, the trajectory line tracks real outcomes with a confidence range shown on the chart. Big changes in habits, medications, or life events will shift the projection, which is exactly the point — it reflects your current pattern, not a generic formula.',
  },
  {
    question: 'Can I predict when I\u2019ll hit my weight loss goal?',
    answer:
      'Yes. Set a target weight and the projection engine continuously recalculates your estimated completion date based on your actual trend. If you\u2019re off pace, you\u2019ll see it early — not the week before the deadline.',
  },
  {
    question: 'Can I track my whole family\u2019s weight in one app?',
    answer:
      'Yes. Every person in your household gets their own profile with its own weight log, projection timeline, and privacy controls — kids, partners, aging parents, and yourself on one account.',
  },
  {
    question: 'Can I track a child\u2019s growth curve?',
    answer:
      'Yes. A child\u2019s profile logs weight (and optionally height) over time, and the chart makes percentile trends legible — useful to bring to pediatrician visits.',
  },
  {
    question: 'Can I monitor an aging parent\u2019s weight remotely?',
    answer:
      'Yes. Your parent or their in-home caregiver can log weight weekly, and you\u2019ll see the trajectory from anywhere. Rapid unintentional weight loss in older adults is a known warning sign, and the system can alert you when it spots one.',
  },
  {
    question: 'Do I need a smart scale?',
    answer:
      'No. One-tap manual entry works fine. If you have a smart scale, you can add weigh-ins the same way — the projection engine doesn\u2019t care where the number came from.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes — a free 7-day trial with full access. No credit card required. Cancel anytime.',
  },
]

export default function WeightTrackingBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd
        data={blogPostingSchema({
          headline: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
          slug: 'weight-tracking',
          image: '/screenshots/family-care/family-dashboard-overview-desktop-light.png',
          datePublished: '2026-01-15T00:00:00-05:00',
          keywords:
            'weight loss projection calculator, self-teaching weight tracker, weight loss prediction app, family weight tracker, weight trajectory app, track child growth curve, monitor elderly parent weight',
        })}
      />
      <JsonLd data={faqPageSchema(FAQ)} />

      {/* ── Hero Section ── */}
      <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <CpuChipIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Self-Teaching Projections</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Weight Loss Projections: See Where You&apos;re Headed, Not Just Where You&apos;ve Been
            </h1>
            <p className="text-lg sm:text-xl text-white/90 mb-10 leading-relaxed max-w-3xl mx-auto">
              A self-teaching weight tracker that turns raw weigh-ins into a real trajectory — a clear
              projection of when you&apos;ll hit your goal, how a child&apos;s growth curve is trending,
              or when an aging parent&apos;s weight needs attention. One account, every person in your
              family.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-violet-700 rounded-lg hover:bg-violet-50 transition-colors font-semibold shadow-lg"
              >
                Start Free Trial
              </Link>
              <Link
                href="/blog/ai-health-reports"
                className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-semibold"
              >
                See Health Reports
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ── The Problem ── */}
        <section className="mb-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center">
            Why Traditional Scales Fall Short
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            A number on a scale is a snapshot. You deserve a motion picture.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon={<ScaleIcon className="w-10 h-10 text-violet-500" />}
              title="Scales Only Show Today"
              description="You weigh yourself, see a number, and have zero context. Up 2 lbs — is that water retention or a real trend? No scale can tell you."
            />
            <ProblemCard
              icon={<EyeSlashIcon className="w-10 h-10 text-violet-500" />}
              title="No Trajectory Insight"
              description="Without pattern analysis you're flying blind. You can't see whether your current habits will actually get you to your goal on time."
            />
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-10 h-10 text-violet-500" />}
              title="Motivation Dies in the Dark"
              description="When you can't see the future, every plateau feels like failure. People quit not because they aren't progressing — but because they can't see it."
            />
          </div>
        </section>

        {/* ── The Projection Engine (Centerpiece) ── */}
        <section className="mb-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center">
            The Projection Engine
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Four steps between a weigh-in and a clear view of your future.
          </p>

          <div className="relative max-w-4xl mx-auto">
            {/* Connecting line (hidden on mobile) */}
            <div className="hidden md:block absolute top-24 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              <ProjectionStep
                step={1}
                icon={<ScaleIcon className="w-8 h-8 text-white" />}
                title="Log Weight"
                description="One-tap entry from your dashboard. Takes under 5 seconds."
              />
              <ProjectionStep
                step={2}
                icon={<CpuChipIcon className="w-8 h-8 text-white" />}
                title="The System Analyzes Patterns"
                description="Our engine detects trends, plateaus, and inflection points in your data."
              />
              <ProjectionStep
                step={3}
                icon={<ArrowTrendingUpIcon className="w-8 h-8 text-white" />}
                title="Projects Trajectory"
                description="See where you'll be in 2 weeks, 1 month, or 3 months at your current pace."
              />
              <ProjectionStep
                step={4}
                icon={<LightBulbIcon className="w-8 h-8 text-white" />}
                title="Adjusts Recommendations"
                description="Get personalized nudges so you stay on track or course-correct early."
              />
            </div>
          </div>
        </section>

        {/* ── Use Cases ── */}
        <section className="mb-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center">
            Real-Life Projections That Matter
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Whether it's your milestone, your child's growth, or your parent's safety — projections turn data into peace of mind.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <UseCaseCard
              icon={<HeartIcon className="w-10 h-10 text-fuchsia-500" />}
              scenario="Wedding Prep"
              persona="Sarah, 32"
              story="Sarah set a goal weight 6 months before her wedding. Three months in, the projection engine told her something no scale could:"
              alert="At this pace, you'll hit your goal 2 weeks before the big day."
              outcome="She stayed the course with confidence instead of crash-dieting out of panic."
            />
            <UseCaseCard
              icon={<ArrowTrendingUpIcon className="w-10 h-10 text-violet-500" />}
              scenario="Child Growth"
              persona="Marcus & Tina, parents of Leo (age 7)"
              story="Leo's pediatrician asked about his growth trend. Instead of guessing, Marcus pulled up the projection:"
              alert="Your child's growth curve is tracking in the 65th percentile."
              outcome="The doctor was impressed. No extra tests needed — the data spoke for itself."
            />
            <UseCaseCard
              icon={<BellAlertIcon className="w-10 h-10 text-red-500" />}
              scenario="Elderly Parent"
              persona="David, caring for his mother Barbara (78)"
              story="Barbara lives alone. David logs her weight weekly during Sunday calls. One week, an alert appeared:"
              alert="Barbara has lost 4% body weight in 2 weeks — this may need attention."
              outcome="David called her doctor immediately. Early intervention caught a medication issue before it became serious."
            />
          </div>
        </section>

        {/* ── Key Features ── */}
        <section className="mb-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center">
            Everything You Need to Project, Track & Celebrate
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Six powerful capabilities, each designed to keep you moving forward.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<CpuChipIcon className="w-10 h-10 text-violet-600" />}
              title="Self-Teaching Projections"
              description="See where your weight will be in 2 weeks, 1 month, or 3 months. The engine learns your patterns and refines forecasts over time."
            />
            <FeatureCard
              icon={<UserGroupIcon className="w-10 h-10 text-violet-600" />}
              title="Multi-Person Tracking"
              description="Track yourself, your kids, and your parents in one account. Each person gets their own projection timeline and privacy settings."
            />
            <FeatureCard
              icon={<TrophyIcon className="w-10 h-10 text-violet-600" />}
              title="Milestone Celebrations"
              description="Hit 5, 10, or 20 lbs lost? Earn achievement badges and share wins with your accountability circle."
            />
            <FeatureCard
              icon={<ChartBarIcon className="w-10 h-10 text-violet-600" />}
              title="Interactive Charts"
              description="Zoom, pan, and annotate your weight timeline. Overlay projections against actuals to see how accurate the system has been."
            />
            <FeatureCard
              icon={<FlagIcon className="w-10 h-10 text-violet-600" />}
              title="Goal Setting"
              description="Set a target weight and date. The projection engine continuously recalculates whether you're on pace or need to adjust."
            />
            <FeatureCard
              icon={<BellAlertIcon className="w-10 h-10 text-violet-600" />}
              title="Smart Reminders"
              description="Custom check-in reminders — daily, weekly, or bi-weekly. Miss a weigh-in? The system nudges you before gaps widen."
            />
          </div>
        </section>

        {/* ── Family Accountability ── */}
        <section className="mb-24">
          <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 rounded-2xl p-8 sm:p-12">
            <div className="max-w-3xl mx-auto text-center">
              <UserGroupIcon className="w-12 h-12 text-violet-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Track Together, Stay Accountable
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                Same household, same system, separate goals. Everyone gets their own projection
                timeline and privacy controls while sharing one simple account. When someone in
                your circle hits a milestone, the whole family can celebrate. When someone needs
                attention, the right person gets alerted.
              </p>
              <Link
                href="/blog/family-care"
                className="inline-flex items-center gap-2 text-violet-600 font-semibold hover:text-violet-700 transition-colors"
              >
                Learn more about Family Care
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Feature Descriptions (in lieu of screenshots) ── */}
        <section className="mb-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center">
            What You'll See Inside
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            A quick walkthrough of the core screens.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <ScreenDescription
              title="Dashboard Quick-Log"
              items={[
                'One-tap weight entry right from your home screen',
                'Instantly see your latest projection update',
                'Color-coded trend indicator (green = on track, amber = slowing, red = off track)',
              ]}
            />
            <ScreenDescription
              title="Projection Timeline"
              items={[
                'Interactive chart with actual vs. projected weight curves',
                'Drag the timeline to explore past and future',
                'Tap any point to see the projection confidence range',
              ]}
            />
            <ScreenDescription
              title="Goal Tracker"
              items={[
                'Progress bar showing percentage toward your target',
                'Estimated completion date that updates in real time',
                'Weekly pace indicator with trend arrows',
              ]}
            />
            <ScreenDescription
              title="Family Overview"
              items={[
                'All household members in a single scrollable list',
                'Per-person projection summaries at a glance',
                'Alert badges when someone needs attention',
              ]}
            />
          </div>
        </section>

        {/* ── Trust Badges ── */}
        <section className="mb-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <TrustBadge
              icon={<ShieldCheckIcon className="w-8 h-8 text-violet-600" />}
              label="HIPAA Compliant"
            />
            <TrustBadge
              icon={<ClockIcon className="w-8 h-8 text-violet-600" />}
              label="7-Day Free Trial"
            />
            <TrustBadge
              icon={<CheckCircleIcon className="w-8 h-8 text-violet-600" />}
              label="No Credit Card Required"
            />
            <TrustBadge
              icon={<SparklesIcon className="w-8 h-8 text-violet-600" />}
              label="Self-Teaching Insights"
            />
          </div>
        </section>

        {/* ── FAQ ── */}
        <section aria-labelledby="weight-tracking-faq" className="mb-24">
          <h2 id="weight-tracking-faq" className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Answers to what families ask most about projection-based weight tracking.
          </p>
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.question}
                className="group bg-card rounded-xl border-2 border-border p-5 open:shadow-md transition-shadow"
              >
                <summary className="cursor-pointer list-none font-semibold text-foreground flex items-start justify-between gap-4">
                  <span>{item.question}</span>
                  <span className="text-violet-600 dark:text-violet-400 text-xl leading-none group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Interconnection Links ── */}
        <section className="mb-24">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Explore the Platform
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <RelatedLink
              href="/caregivers/aging-parents"
              title="Caring for Aging Parents"
              description="Remote monitoring, medication tracking, and shared visibility"
            />
            <RelatedLink
              href="/blog/meal-tracking"
              title="Meal Tracking"
              description="AI photo capture (Gemini Vision) + self-teaching nutrition analysis"
            />
            <RelatedLink
              href="/blog/ai-health-reports"
              title="Self-Teaching Health Reports"
              description="Automated health summaries and trend reports"
            />
            <RelatedLink
              href="/blog/family-care"
              title="Family Care"
              description="Multi-person health management made simple"
            />
          </div>
        </section>

        {/* ── CTA Section ── */}
        <section className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Stop Guessing. Start Projecting.
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-3xl mx-auto">
            Join Wellness Projection Lab and see where your health is heading — not just where it's been. Your first 7 days are free.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-violet-700 rounded-lg hover:bg-violet-50 transition-colors font-semibold shadow-lg"
            >
              Start Free Trial
            </Link>
          </div>
          <p className="text-sm text-white/70 mt-6">
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

/* ──────────────────────────────────────────────
   Helper Components
   ────────────────────────────────────────────── */

function ProblemCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 text-center">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  )
}

function ProjectionStep({ step, icon, title, description }: { step: number; icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-4 shadow-lg">
        {icon}
      </div>
      <span className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-1">Step {step}</span>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}

function UseCaseCard({
  icon,
  scenario,
  persona,
  story,
  alert,
  outcome,
}: {
  icon: React.ReactNode
  scenario: string
  persona: string
  story: string
  alert: string
  outcome: string
}) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 flex flex-col">
      <div className="mb-3">{icon}</div>
      <span className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-1">{scenario}</span>
      <h3 className="text-lg font-semibold text-foreground mb-1">{persona}</h3>
      <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{story}</p>
      <div className="bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-lg px-4 py-3 mb-4">
        <p className="text-sm font-medium text-violet-700 dark:text-violet-300 italic">{`\u201C${alert}\u201D`}</p>
      </div>
      <p className="text-muted-foreground text-sm mt-auto">{outcome}</p>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-violet-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  )
}

function ScreenDescription({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircleIcon className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 bg-card rounded-xl border border-border p-4 text-center">
      {icon}
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
  )
}

function RelatedLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="bg-card rounded-lg border-2 border-border p-4 hover:border-violet-300 hover:shadow-lg transition-all block">
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
