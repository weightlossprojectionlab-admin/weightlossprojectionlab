/**
 * Meal Tracking - Marketing Blog Page
 *
 * #1 SEO keyword page — strongest conversion page for WPL
 * Reframed: "Know What Everyone's Eating — AI Does the Math"
 * Optimized for SEO with meal tracking keywords and conversion funnel
 */

import Link from 'next/link'
import { Metadata } from 'next'
import {
  CameraIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ClockIcon,
  PhotoIcon,
  AdjustmentsHorizontalIcon,
  HeartIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
  ArchiveBoxIcon,
  LightBulbIcon,
  HandThumbUpIcon,
  ChartBarIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline'

export const metadata: Metadata = {
  title: 'AI Meal Tracking — Photo Food Logging with Instant Nutrition Analysis | Wellness Projection Lab',
  description: 'Snap a photo of any meal and get instant AI-powered nutritional analysis. Track calories, macros, and allergens for every family member. Per-person dietary tracking with 85-95% accuracy.',
  keywords: 'meal tracking, food tracking app, photo food logger, AI calorie counter, nutrition tracker, family meal tracking, allergen detection, macro tracker, food diary, meal logging app, AI nutrition analysis, family food tracker',
  openGraph: {
    title: 'AI Meal Tracking — Photo Food Logging with Instant Nutrition Analysis',
    description: 'Snap a photo of any meal and get instant AI-powered nutritional analysis. Track calories, macros, and allergens for every family member with 85-95% accuracy.',
    type: 'article',
    url: 'https://weightlossproglab.com/blog/meal-tracking',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Meal Tracking — Photo Food Logging with Instant Nutrition Analysis',
    description: 'Snap a photo of any meal and get instant AI-powered nutritional analysis. Track calories, macros, and allergens for every family member with 85-95% accuracy.',
  },
  alternates: {
    canonical: 'https://weightlossproglab.com/blog/meal-tracking'
  }
}

export default function MealtrackingBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ============ HERO ============ */}
      <div className="relative bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm font-medium">AI-Powered Nutrition</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Know What Everyone&apos;s Eating &mdash; AI Does the Math
            </h1>
            <p className="text-xl text-white/90 mb-8 leading-relaxed max-w-3xl mx-auto">
              Photograph any meal and get instant nutritional analysis. Calories, macros, allergens &mdash; tracked per person,
              for every member of your household. No manual data entry required.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-amber-700 rounded-lg hover:bg-amber-50 transition-colors font-semibold shadow-lg"
              >
                Start Free Trial
              </Link>
              <Link
                href="/blog"
                className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-semibold"
              >
                Explore All Features
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ============ THE PROBLEM ============ */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Meal Tracking Shouldn&apos;t Feel Like a Second Job</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Most nutrition apps assume one person, one diet, one set of needs. Real life is more complicated.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon={<ClockIcon className="w-8 h-8 text-amber-600" />}
              title="Manual Calorie Counting Is Exhausting"
              description="Searching databases, weighing portions, logging every ingredient &mdash; most people quit within two weeks. Life is too busy for that."
            />
            <ProblemCard
              icon={<UserGroupIcon className="w-8 h-8 text-amber-600" />}
              title="Separate Tracking for Each Person"
              description="Your toddler, your spouse, your aging parent &mdash; each has different nutritional needs. One-size-fits-all trackers don&apos;t cut it."
            />
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-8 h-8 text-amber-600" />}
              title="Allergen Dangers When Cooking for Others"
              description="A missed ingredient can mean a trip to the ER. When you&apos;re preparing meals for family, allergen awareness isn&apos;t optional &mdash; it&apos;s critical."
            />
          </div>
        </section>

        {/* ============ HOW IT WORKS ============ */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Three Steps. Zero Typing.</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From photo to full nutritional breakdown in seconds &mdash; for every person at the table.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step={1}
              icon={<CameraIcon className="w-10 h-10 text-amber-600" />}
              title="Snap a Photo"
              description="Take a photo of the plate, the packaging, or even a restaurant menu item. Our AI handles the rest."
            />
            <StepCard
              step={2}
              icon={<SparklesIcon className="w-10 h-10 text-amber-600" />}
              title="AI Identifies Food &amp; Nutrients"
              description="The AI recognizes individual foods, estimates portions, and calculates calories, protein, carbs, fat, fiber, and micronutrients."
            />
            <StepCard
              step={3}
              icon={<ShieldCheckIcon className="w-10 h-10 text-amber-600" />}
              title="Per-Person Allergen Safety Check"
              description="Each family member&apos;s allergen profile is checked automatically. You get an instant warning if anything flagged is detected."
            />
          </div>
          <div className="flex justify-center mt-8">
            <div className="hidden md:flex items-center gap-4 text-muted-foreground text-sm">
              <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-medium">Photo taken</span>
              <ArrowRightIcon className="w-4 h-4" />
              <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-medium">AI analysis</span>
              <ArrowRightIcon className="w-4 h-4" />
              <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-medium">Safety verified</span>
              <ArrowRightIcon className="w-4 h-4" />
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">Logged per person</span>
            </div>
          </div>
        </section>

        {/* ============ USE CASES ============ */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Real Families. Real Scenarios.</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              WPL meal tracking adapts to whoever you&apos;re caring for &mdash; and the AI alerts keep everyone safe.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <UseCaseCard
              icon={<HeartIcon className="w-8 h-8 text-pink-500" />}
              title="Toddler Nutrition"
              description="Logging your child&apos;s meals for the pediatrician &mdash; just photograph the plate. No more guessing portion sizes or forgetting what they ate on Tuesday."
              alert="AI Alert: &quot;Today&apos;s iron intake is 40% below the recommended daily value for ages 1-3.&quot;"
            />
            <UseCaseCard
              icon={<ChartBarIcon className="w-8 h-8 text-blue-500" />}
              title="Spouse Macros"
              description="Tracking your partner&apos;s protein intake for their fitness goals. Photograph their meals and WPL logs it to their profile &mdash; no app-switching needed."
              alert="AI Alert: &quot;Marcus has hit 85% of his daily protein goal. Consider a high-protein snack before dinner.&quot;"
            />
            <UseCaseCard
              icon={<UserGroupIcon className="w-8 h-8 text-amber-600" />}
              title="Elderly Parent Care"
              description="Ensuring Mom is eating enough when you can&apos;t be there for every meal. Caregivers photograph meals, and AI flags nutritional gaps automatically."
              alert="AI Alert: &quot;Dorothy&apos;s calorie intake has dropped 30% this week. Daily average: 1,100 cal vs. 1,600 cal target.&quot;"
            />
          </div>
        </section>

        {/* ============ KEY FEATURES ============ */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Everything You Need to Track Nutrition</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Six powerful features that turn meal photos into actionable health data.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<CameraIcon className="w-10 h-10 text-amber-600" />}
              title="Photo AI Analysis"
              description="Point, shoot, done. AI identifies individual foods, estimates portions, and delivers full macro and micronutrient breakdowns in seconds."
            />
            <FeatureCard
              icon={<UserGroupIcon className="w-10 h-10 text-amber-600" />}
              title="Per-Person Tracking"
              description="One household, multiple profiles. Every meal is logged to the right person with their unique calorie targets and dietary needs."
            />
            <FeatureCard
              icon={<ShieldCheckIcon className="w-10 h-10 text-amber-600" />}
              title="Allergen Safety"
              description="Automatic cross-referencing against each family member&apos;s allergen list. Get instant warnings before anyone takes a bite."
            />
            <FeatureCard
              icon={<AdjustmentsHorizontalIcon className="w-10 h-10 text-amber-600" />}
              title="Dietary Preferences"
              description="Keto, vegan, low-sodium, diabetic-friendly &mdash; set dietary preferences per person, and AI evaluates every meal against them."
            />
            <FeatureCard
              icon={<PhotoIcon className="w-10 h-10 text-amber-600" />}
              title="Meal History Gallery"
              description="A beautiful visual timeline of every meal photographed, with full nutrition data attached. Scroll back days, weeks, or months."
            />
            <FeatureCard
              icon={<ArrowPathIcon className="w-10 h-10 text-amber-600" />}
              title="Family Meal Coordination"
              description="Cooking one meal for the whole family? Log it once and distribute to multiple profiles with individual portion adjustments."
            />
          </div>
        </section>

        {/* ============ THE PIPELINE ============ */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Meals Are Just the Beginning</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every meal you log feeds into a connected system that makes your entire kitchen smarter.
            </p>
          </div>
          <div className="bg-card border-2 border-border rounded-2xl p-8 md:p-12">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <PipelineStep
                icon={<CameraIcon className="w-8 h-8 text-amber-600" />}
                title="Meal Tracking"
                description="Every meal photographed builds a nutrition database unique to your family."
                link="/blog/meal-tracking"
                active
              />
              <PipelineStep
                icon={<ShoppingCartIcon className="w-8 h-8 text-green-600" />}
                title="Smart Shopping Lists"
                description="AI generates grocery lists based on what your family actually eats and what&apos;s running low."
                link="/blog/smart-shopping"
              />
              <PipelineStep
                icon={<ArchiveBoxIcon className="w-8 h-8 text-blue-600" />}
                title="Kitchen Inventory"
                description="Track what&apos;s in your pantry and fridge. Get alerts before items expire or run out."
                link="/blog/inventory-management"
              />
            </div>
            <div className="hidden md:flex justify-center items-center gap-2 mt-8 text-sm text-muted-foreground">
              <span className="font-medium text-amber-700">Meals logged</span>
              <ArrowRightIcon className="w-4 h-4" />
              <span className="font-medium text-green-700">Shopping lists generated</span>
              <ArrowRightIcon className="w-4 h-4" />
              <span className="font-medium text-blue-700">Inventory updated</span>
            </div>
          </div>
        </section>

        {/* ============ ACCURACY & TRUST ============ */}
        <section className="mb-24">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-8 md:p-12">
            <div className="max-w-3xl mx-auto text-center">
              <LightBulbIcon className="w-12 h-12 text-amber-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-foreground mb-4">Accuracy You Can Count On</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                WPL&apos;s AI delivers <span className="font-semibold text-amber-700 dark:text-amber-400">85&ndash;95% accuracy</span> on
                food identification and nutritional estimates out of the box. When something isn&apos;t quite right, you correct it &mdash; and
                the AI learns from your feedback. The more your family uses it, the smarter it gets.
              </p>
              <div className="grid sm:grid-cols-3 gap-6 mt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">85&ndash;95%</div>
                  <div className="text-sm text-muted-foreground mt-1">Initial accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">+2&ndash;5%</div>
                  <div className="text-sm text-muted-foreground mt-1">Improvement with corrections</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">&lt; 3 sec</div>
                  <div className="text-sm text-muted-foreground mt-1">Analysis time per photo</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ TRUST BADGES ============ */}
        <section className="mb-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TrustBadge
              icon={<ShieldCheckIcon className="w-6 h-6 text-amber-600" />}
              label="HIPAA Compliant"
            />
            <TrustBadge
              icon={<DocumentCheckIcon className="w-6 h-6 text-amber-600" />}
              label="SOC 2 Practices"
            />
            <TrustBadge
              icon={<HandThumbUpIcon className="w-6 h-6 text-amber-600" />}
              label="No Data Sold"
            />
            <TrustBadge
              icon={<CheckCircleIcon className="w-6 h-6 text-amber-600" />}
              label="7-Day Free Trial"
            />
          </div>
        </section>

        {/* ============ INTERCONNECTION LINKS ============ */}
        <section className="mb-24">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Connected Features</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <InterconnectLink
              href="/blog/smart-shopping"
              title="Smart Shopping"
              description="AI grocery lists from your meal data"
            />
            <InterconnectLink
              href="/blog/inventory-management"
              title="Kitchen Inventory"
              description="Track pantry and fridge in real time"
            />
            <InterconnectLink
              href="/blog/weight-tracking"
              title="Weight Tracking"
              description="See how nutrition impacts the scale"
            />
            <InterconnectLink
              href="/blog/wpl-health-reports"
              title="AI Health Reports"
              description="Weekly insights from your meal patterns"
            />
          </div>
        </section>

        {/* ============ CTA ============ */}
        <section className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Stop Counting Calories. Start Photographing Meals.</h2>
          <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
            Join families who track nutrition the easy way. One photo, full analysis, every person covered.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-amber-700 rounded-lg hover:bg-amber-50 transition-colors font-semibold shadow-lg"
            >
              Start Free Trial
            </Link>
          </div>
          <p className="text-sm text-white/80 mt-6">
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

/* ================================================================
   HELPER COMPONENTS
   ================================================================ */

function ProblemCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-red-200 dark:border-red-900 p-6">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function StepCard({ step, icon, title, description }: { step: number; icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 text-center relative">
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
        {step}
      </div>
      <div className="flex justify-center mb-4 mt-2">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}

function UseCaseCard({ icon, title, description, alert }: { icon: React.ReactNode; title: string; description: string; alert: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-amber-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">{alert}</p>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-amber-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function PipelineStep({ icon, title, description, link, active }: { icon: React.ReactNode; title: string; description: string; link: string; active?: boolean }) {
  return (
    <Link href={link} className={`block text-center p-6 rounded-xl transition-all hover:shadow-md ${active ? 'bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700' : 'hover:bg-muted/50'}`}>
      <div className="flex justify-center mb-3">{icon}</div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-4">
      {icon}
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
  )
}

function InterconnectLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="bg-card rounded-lg border-2 border-border p-4 hover:border-amber-300 hover:shadow-lg transition-all block">
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
