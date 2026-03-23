/**
 * Smart Shopping - Marketing Blog Page
 *
 * "From Meal Plan to Grocery Cart — Automatically"
 * Intelligent shopping list generation with allergen filtering and inventory awareness
 */

import Link from 'next/link'
import { Metadata } from 'next'
import {
  SparklesIcon,
  ShoppingCartIcon,
  NoSymbolIcon,
  CurrencyDollarIcon,
  ClipboardDocumentCheckIcon,
  ShareIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ListBulletIcon,
  LightBulbIcon,
  ArchiveBoxIcon,
  QrCodeIcon,
  MapPinIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'

export const metadata: Metadata = {
  title: 'Intelligent Shopping — From Meal Plan to Grocery Cart | Wellness Projection Lab',
  description:
    'Auto-generate grocery lists from your family meal plans. WPL checks pantry inventory, filters allergens per person, suggests budget-friendly alternatives, and shares lists with caregivers.',
  keywords:
    'smart shopping list, AI grocery list, meal plan shopping, allergen filtering, pantry inventory, budget groceries, family shopping list, caregiver grocery shopping',
  openGraph: {
    title: 'From Meal Plan to Grocery Cart — Automatically',
    description:
      'Auto-generate grocery lists from your family meal plans. Checks inventory, filters allergens per person, and shares lists with caregivers.',
    type: 'article',
    url: 'https://weightlossproglab.com/blog/smart-shopping',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'From Meal Plan to Grocery Cart — Automatically',
    description:
      'Auto-generate grocery lists from your family meal plans. Checks inventory, filters allergens per person, and shares lists with caregivers.',
  },
  alternates: {
    canonical: 'https://weightlossproglab.com/blog/smart-shopping',
  },
}

export default function SmartShoppingBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <div className="relative bg-gradient-to-br from-lime-600 via-green-600 to-emerald-600 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1542838132-92c53300491e?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Intelligent Shopping</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              From Meal Plan to Grocery Cart &mdash; Automatically
            </h1>
            <p className="text-xl text-white/90 mb-8 leading-relaxed max-w-3xl mx-auto">
              Your family&apos;s meal plans generate the grocery list. WPL checks what you
              already have, filters allergens for each person, and keeps you on budget &mdash;
              so the healthy plan actually makes it to the table.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-semibold shadow-lg"
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
            Healthy Plans Die at the Grocery Store
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            The meal plan is perfect on paper. But turning it into an actual shopping trip? That&apos;s
            where families fall off track.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-10 h-10 text-emerald-600" />}
              title="Plans Without Lists"
              description="A nutritionist builds the meal plan, but nobody translates it into a grocery list. The plan sits unused."
            />
            <ProblemCard
              icon={<ListBulletIcon className="w-10 h-10 text-emerald-600" />}
              title="Manual List-Making Is Friction"
              description="Scanning recipes, checking the fridge, writing it all down &mdash; it takes 30 minutes you don&apos;t have."
            />
            <ProblemCard
              icon={<NoSymbolIcon className="w-10 h-10 text-emerald-600" />}
              title="Allergens Get Forgotten"
              description="When you&apos;re shopping for multiple people with different restrictions, one missed label can mean a trip to the ER."
            />
          </div>
        </section>

        {/* ── The Pipeline ── */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">
            The Smart Shopping Pipeline
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            Four automated steps between your meal plan and a safe, budget-aware grocery list.
          </p>
          <div className="relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-200 dark:bg-emerald-800 -translate-y-1/2 z-0" />
            <div className="grid md:grid-cols-4 gap-6 relative z-10">
              <PipelineStep
                step="1"
                title="Meal Plans"
                description="Your weekly meal plans &mdash; built by you, your nutritionist, or AI &mdash; feed directly into the pipeline."
              />
              <PipelineStep
                step="2"
                title="AI Generates List"
                description="WPL reads every recipe and ingredient, then compiles a unified shopping list with quantities."
              />
              <PipelineStep
                step="3"
                title="Checks Inventory"
                description="Cross-references your pantry and fridge inventory &mdash; items you already have are excluded automatically."
              />
              <PipelineStep
                step="4"
                title="Filters Allergens"
                description="Each family member&apos;s allergen profile is applied. Unsafe items are flagged or swapped with safe alternatives."
              />
            </div>
          </div>
        </section>

        {/* ── Use Cases ── */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">
            Real-World Scenarios
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            Smart Shopping adapts to your family&apos;s unique needs.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <UseCaseCard
              number="01"
              title="Three Dietary Restrictions"
              description="A family of five with gluten-free, nut-free, and dairy-free members. WPL auto-generates separate safe items for each person from one shared meal plan."
            />
            <UseCaseCard
              number="02"
              title="Caregiver Shopping"
              description="A caregiver shopping for an elderly parent doesn&apos;t have to guess. The list comes straight from the meal plan the nutritionist assigned."
            />
            <UseCaseCard
              number="03"
              title="Budget-Conscious Family"
              description="Set a weekly grocery budget and WPL prioritizes essentials, suggests affordable swaps, and flags when you&apos;re approaching the limit."
            />
          </div>
        </section>

        {/* ── Features ── */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">
            Features That Make Shopping Smarter
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<ShoppingCartIcon className="w-12 h-12 text-emerald-600" />}
              title="Auto-Generated Lists"
              description="AI reads your meal plans and compiles a ready-to-shop grocery list with exact quantities."
            />
            <FeatureCard
              icon={<NoSymbolIcon className="w-12 h-12 text-emerald-600" />}
              title="Allergen Filtering"
              description="Per-person allergen profiles ensure no unsafe items make it onto the list."
            />
            <FeatureCard
              icon={<CurrencyDollarIcon className="w-12 h-12 text-emerald-600" />}
              title="Budget Tracking"
              description="Set weekly limits, track spending, and get notified before you go over budget."
            />
            <FeatureCard
              icon={<ArchiveBoxIcon className="w-12 h-12 text-emerald-600" />}
              title="Inventory Integration"
              description="Cross-references your pantry so you never buy what you already have."
            />
            <FeatureCard
              icon={<ShareIcon className="w-12 h-12 text-emerald-600" />}
              title="Family Sharing"
              description="Share the list with family members or caregivers so anyone can pick up what&apos;s needed."
            />
            <FeatureCard
              icon={<LightBulbIcon className="w-12 h-12 text-emerald-600" />}
              title="Smart Suggestions"
              description="Recommends healthier or more affordable alternatives based on dietary goals and past purchases."
            />
            <FeatureCard
              icon={<QrCodeIcon className="w-12 h-12 text-emerald-600" />}
              title="Scan While You Shop"
              description="Start a guided shopping session and scan barcodes as items go in your cart. Items check off the list automatically."
            />
            <FeatureCard
              icon={<MapPinIcon className="w-12 h-12 text-emerald-600" />}
              title="Location-Aware Reminders"
              description="Get notified when you&apos;re near stores you frequent &mdash; Walmart, Target, Kroger &mdash; with a summary of items you need."
            />
            <FeatureCard
              icon={<EyeIcon className="w-12 h-12 text-emerald-600" />}
              title="Live Shopping Visibility"
              description="Family members see your shopping progress in real-time, so nobody makes a duplicate run for the same items."
            />
          </div>
        </section>

        {/* ── Guided Shopping Session ── */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">
            Guided Shopping: Scan as You Go
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            Start an active shopping session and let WPL guide you through the store.
          </p>
          <div className="relative">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-200 dark:bg-emerald-800 -translate-y-1/2 z-0" />
            <div className="grid md:grid-cols-4 gap-6 relative z-10">
              <PipelineStep
                step="1"
                title="Start Session"
                description="Tap &ldquo;Start Shopping&rdquo; on your list. Family members are notified you&apos;re at the store."
              />
              <PipelineStep
                step="2"
                title="Scan &amp; Check Off"
                description="Scan each barcode as it goes in the cart. The item checks off automatically and updates inventory."
              />
              <PipelineStep
                step="3"
                title="Add On the Fly"
                description="Spot something not on the list? Scan or manually add it mid-session &mdash; no need to leave the flow."
              />
              <PipelineStep
                step="4"
                title="Done &amp; Synced"
                description="End the session. Purchased items move to inventory, and family sees the final haul."
              />
            </div>
          </div>
        </section>

        {/* ── Interconnection Pipeline ── */}
        <section className="mb-20">
          <div className="bg-gradient-to-br from-emerald-50 to-lime-50 dark:from-emerald-950/30 dark:to-lime-950/30 rounded-2xl p-10 md:p-14 border border-emerald-200 dark:border-emerald-800">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">
              The Whole Pipeline, Connected
            </h2>
            <p className="text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-10">
              Smart Shopping isn&apos;t a standalone feature. It&apos;s one link in a chain that
              turns health goals into real outcomes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 text-sm md:text-base">
              <PipelineLink href="/blog/meal-tracking" label="Meals" />
              <ArrowRightIcon className="w-5 h-5 text-emerald-500 hidden md:block" />
              <span className="text-emerald-500 md:hidden">&rarr;</span>
              <PipelineLink href="/blog/smart-shopping" label="Shopping" active />
              <ArrowRightIcon className="w-5 h-5 text-emerald-500 hidden md:block" />
              <span className="text-emerald-500 md:hidden">&rarr;</span>
              <PipelineLink href="/blog/inventory" label="Inventory" />
              <ArrowRightIcon className="w-5 h-5 text-emerald-500 hidden md:block" />
              <span className="text-emerald-500 md:hidden">&rarr;</span>
              <span className="px-4 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-medium">
                Less Waste
              </span>
              <ArrowRightIcon className="w-5 h-5 text-emerald-500 hidden md:block" />
              <span className="text-emerald-500 md:hidden">&rarr;</span>
              <span className="px-4 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-medium">
                Better Health
              </span>
            </div>
          </div>
        </section>

        {/* ── Related Features ── */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">
            Explore Related Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RelatedLink href="/blog/meal-tracking" title="Meal Tracking" description="Log meals, scan barcodes, and track macros" />
            <RelatedLink href="/blog/inventory" title="Inventory" description="Pantry and fridge tracking to reduce waste" />
            <RelatedLink href="/blog/family-care" title="Family Care" description="Multi-patient household health management" />
            <RelatedLink href="/blog/ai-health-reports" title="AI Health Reports" description="Personalized insights powered by AI" />
            <RelatedLink href="/blog/dashboard" title="Dashboard" description="Centralized health command center" />
            <RelatedLink href="/blog/profile" title="Profile" description="Dietary preferences and allergen profiles" />
          </div>
        </section>

        {/* ── Trust + CTA ── */}
        <section className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Stop Making Lists. Start Checking Them Off.
          </h2>
          <p className="text-xl text-emerald-100 mb-8 max-w-3xl mx-auto">
            Let WPL turn your meal plans into safe, budget-aware grocery lists &mdash;
            automatically. More time cooking, less time planning.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-semibold shadow-lg"
            >
              Start Free Trial
            </Link>
          </div>
          <p className="text-sm text-emerald-200 mt-6">
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

function PipelineStep({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 text-center">
      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg mb-4 mx-auto">
        {step}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function UseCaseCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-emerald-300 hover:shadow-lg transition-all">
      <span className="text-sm font-bold text-emerald-600 mb-2 block">{number}</span>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-emerald-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function PipelineLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-emerald-600 text-white shadow-md'
          : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800/60'
      }`}
    >
      {label}
    </Link>
  )
}

function RelatedLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="bg-card rounded-lg border-2 border-border p-4 hover:border-emerald-300 hover:shadow-lg transition-all block group">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <ArrowRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
