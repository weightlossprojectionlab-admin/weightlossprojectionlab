/**
 * Inventory Management - Marketing Blog Page
 *
 * "Know What You Have. Know What You Need. Waste Nothing."
 * Reframed around the $1,500/year food waste problem and smart kitchen management.
 */

import Link from 'next/link'
import { Metadata } from 'next'
import {
  ArchiveBoxIcon,
  BellAlertIcon,
  MinusCircleIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  QrCodeIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { Screenshot } from '@/components/ui/Screenshot'

export const metadata: Metadata = {
  title: 'Smart Kitchen Inventory Management - Stop Wasting $1,500/Year in Food | Wellness Projection Lab',
  description: 'The average family wastes $1,500 per year in food. Track your pantry and fridge, get expiration alerts, auto-deplete items when used in meals, and cut food waste by up to 40%.',
  keywords: 'kitchen inventory management, food waste reduction, pantry tracking, expiration alerts, barcode scanning, grocery savings, fridge tracker, smart kitchen',
  openGraph: {
    title: 'Smart Kitchen Inventory Management - Stop Wasting $1,500/Year in Food',
    description: 'The average family wastes $1,500 per year in food. Track your pantry and fridge, get expiration alerts, auto-deplete items when used in meals, and cut food waste by up to 40%.',
    type: 'article',
    url: 'https://weightlossproglab.com/blog/inventory-management',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smart Kitchen Inventory Management - Stop Wasting $1,500/Year in Food',
    description: 'The average family wastes $1,500 per year in food. Track your pantry and fridge, get expiration alerts, auto-deplete items when used in meals, and cut food waste by up to 40%.',
  },
  alternates: {
    canonical: 'https://weightlossproglab.com/blog/inventory-management'
  }
}

export default function InventoryManagementBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-amber-600 via-orange-600 to-rose-600 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1556911220-bff31c812dba?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Smart Kitchen Management</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Know What You Have. Know What You Need. Waste Nothing.
            </h1>
            <p className="text-xl text-white/90 mb-4 leading-relaxed">
              The average American family throws away <span className="font-bold text-white text-2xl">$1,500 worth of food</span> every single year.
              That&apos;s money in the trash, meals never eaten, and groceries bought twice.
            </p>
            <p className="text-lg text-white/80 mb-8">
              WPL&apos;s smart inventory system puts you back in control of your kitchen.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-amber-700 rounded-lg hover:bg-amber-50 transition-colors font-semibold shadow-lg"
              >
                Start Saving Today
              </Link>
              <Link
                href="/blog/smart-shopping"
                className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-semibold"
              >
                See Smart Shopping
              </Link>
            </div>
            {/* Stat Bar */}
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
              <StatBadge value="$1,500" label="Avg. wasted per year" />
              <StatBadge value="40%" label="Waste cut in month 1" />
              <StatBadge value="30 sec" label="To scan a grocery trip" />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Problem Section */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">The Food Waste Problem Is Real</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            It&apos;s not that you don&apos;t care. It&apos;s that kitchens are hard to manage without a system.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-10 h-10 text-amber-500" />}
              title="Forgetting What&apos;s in the Fridge"
              description="You buy lettuce, not realizing there&apos;s a bag already wilting in the back of the crisper drawer. Sound familiar?"
            />
            <ProblemCard
              icon={<ShoppingBagIcon className="w-10 h-10 text-amber-500" />}
              title="Buying Duplicates"
              description="Without a clear picture of what you have, duplicate purchases pile up. Three jars of mayo, two bags of rice."
            />
            <ProblemCard
              icon={<BellAlertIcon className="w-10 h-10 text-amber-500" />}
              title="Food Expiring Unnoticed"
              description="That yogurt from two weeks ago, the chicken pushed behind the leftovers. Food expires silently and money disappears."
            />
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">How It Works</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Four simple steps that turn your kitchen into a zero-waste machine.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            <StepCard
              step={1}
              title="Track Your Items"
              description="Add items manually, scan barcodes, or let AI detect ingredients from your meal logs. Fridge, freezer, pantry, counter — all organized."
            />
            <StepCard
              step={2}
              title="Get Expiration Alerts"
              description="Receive notifications 7, 3, and 1 day before items expire. No more surprise discoveries in the back of the fridge."
            />
            <StepCard
              step={3}
              title="Auto-Deplete When Used"
              description="Log a meal? The ingredients are automatically deducted from your inventory. Your stock is always accurate."
            />
            <StepCard
              step={4}
              title="Restock Suggestions"
              description="Running low on staples? AI notices your patterns and suggests what to add to your next shopping list."
            />
          </div>
        </section>

        {/* Screenshot Showcase */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">See It in Action</h2>
          <p className="text-center text-muted-foreground mb-8 max-w-3xl mx-auto">
            Track all items in stock across fridge, freezer, pantry, and counter. Get expiration alerts,
            scan barcodes to add items, and never waste food again.
          </p>
          <Screenshot
            src="/screenshots/inventory/kitchen-inventory-grandma-desktop-light.png"
            alt="Kitchen Inventory showing 13 Expired Items Found alert with Clean Up Now button. Overview stats: 24 Total Items, 13 Expiring Soon, 13 Expired. Filter tabs for All, Fridge (3), Freezer (0), Pantry (21), Counter (0). Inventory list with expiration tracking and Used Up / Buy Again buttons for each item."
            caption="Complete kitchen inventory with expiration tracking and category filtering - Stay organized and reduce food waste"
            priority
            zoomable
          />
        </section>

        {/* Use Cases */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">Real Families. Real Results.</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Here&apos;s how people are using smart inventory management every day.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <UseCaseCard
              scenario="Checking Mom&apos;s Fridge Remotely"
              description="Your mother lives alone. You open the app during lunch and see she&apos;s low on eggs and her milk expires tomorrow. You order a grocery delivery before she even notices."
              outcome="Peace of mind from 500 miles away"
            />
            <UseCaseCard
              scenario="Scanning Barcodes After a Grocery Trip"
              description="You get home from the store, pull out your phone, and scan each item as you put it away. In under 30 seconds, everything is tracked with expiration dates."
              outcome="Full inventory in seconds, not spreadsheets"
            />
            <UseCaseCard
              scenario="Reducing Food Waste by 40%"
              description="A family of four started tracking inventory and got expiration alerts. In the first month, they threw away 40% less food and saved over $120 in groceries."
              outcome="$120 saved in the very first month"
            />
          </div>
        </section>

        {/* Features Grid */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Everything You Need to Run a Smarter Kitchen</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<ArchiveBoxIcon className="w-12 h-12 text-amber-600" />}
              title="Pantry & Fridge Tracking"
              description="Catalog all food items across fridge, freezer, pantry, and counter with quantities, categories, and expiration dates."
            />
            <FeatureCard
              icon={<BellAlertIcon className="w-12 h-12 text-amber-600" />}
              title="Expiration Alerts"
              description="Get notified 7, 3, and 1 day before foods expire. Batch cleanup tools let you clear expired items in one tap."
            />
            <FeatureCard
              icon={<MinusCircleIcon className="w-12 h-12 text-amber-600" />}
              title="Auto-Consumption"
              description="When you log a meal, the ingredients are automatically deducted from your inventory. No manual updates needed."
            />
            <FeatureCard
              icon={<ChartBarIcon className="w-12 h-12 text-amber-600" />}
              title="Waste Analytics"
              description="Track how much food is wasted vs. consumed over time. Spot patterns and adjust your buying habits."
            />
            <FeatureCard
              icon={<QrCodeIcon className="w-12 h-12 text-amber-600" />}
              title="Barcode Scanning"
              description="Scan barcodes to instantly add items with nutritional data, brand info, and typical expiration windows."
            />
            <FeatureCard
              icon={<ShoppingBagIcon className="w-12 h-12 text-amber-600" />}
              title="Restock Suggestions"
              description="AI learns what you use regularly and suggests items for your next shopping list when stock runs low."
            />
          </div>
        </section>

        {/* Pipeline Connection */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">Part of the Full Kitchen Pipeline</h2>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            Inventory doesn&apos;t live in a vacuum. It&apos;s connected to everything you eat, buy, and plan.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 text-sm md:text-base">
            <PipelineStep label="Meals" href="/blog/meal-tracking" />
            <ArrowRightIcon className="w-5 h-5 text-muted-foreground hidden md:block" />
            <span className="text-muted-foreground md:hidden">&rarr;</span>
            <PipelineStep label="Shopping" href="/blog/smart-shopping" />
            <ArrowRightIcon className="w-5 h-5 text-muted-foreground hidden md:block" />
            <span className="text-muted-foreground md:hidden">&rarr;</span>
            <PipelineStep label="Inventory" href="/blog/inventory-management" active />
            <ArrowRightIcon className="w-5 h-5 text-muted-foreground hidden md:block" />
            <span className="text-muted-foreground md:hidden">&rarr;</span>
            <PipelineStep label="Less Waste" />
            <ArrowRightIcon className="w-5 h-5 text-muted-foreground hidden md:block" />
            <span className="text-muted-foreground md:hidden">&rarr;</span>
            <PipelineStep label="Savings" />
          </div>
        </section>

        {/* Related Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">Explore Related Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RelatedLink href="/blog/meal-tracking" title="Meal Tracking" description="Log meals and auto-deplete inventory ingredients" />
            <RelatedLink href="/blog/smart-shopping" title="Smart Shopping" description="Generate shopping lists from what you need to restock" />
            <RelatedLink href="/blog/dashboard" title="Dashboard" description="Centralized health and kitchen command center" />
            <RelatedLink href="/blog/family-care" title="Family Care" description="Manage kitchen inventory for the whole household" />
            <RelatedLink href="/blog/vitals-tracking" title="Vitals Tracking" description="Connect nutrition to health outcomes" />
            <RelatedLink href="/blog/weight-tracking" title="Weight Tracking" description="See how better nutrition impacts your goals" />
          </div>
        </section>

        {/* Trust + CTA */}
        <section className="bg-gradient-to-r from-amber-600 to-rose-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Your Kitchen Is Smarter Than You Think</h2>
          <p className="text-xl text-amber-100 mb-8 max-w-3xl mx-auto">
            Stop throwing money in the trash. Start tracking what you have, get alerts before food expires,
            and let your meal logs do the inventory work for you.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-amber-700 rounded-lg hover:bg-amber-50 transition-colors font-semibold shadow-lg"
            >
              Start Free Trial
            </Link>
          </div>
          <p className="text-sm text-amber-200 mt-6">
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

// --- Helper Components ---

function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-white/80">{label}</div>
    </div>
  )
}

function ProblemCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 text-center">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 text-center relative">
      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center mx-auto mb-4 text-lg">
        {step}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}

function UseCaseCard({ scenario, description, outcome }: { scenario: string; description: string; outcome: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-3">{scenario}</h3>
      <p className="text-muted-foreground text-sm mb-4">{description}</p>
      <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
        <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
        <span>{outcome}</span>
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

function PipelineStep({ label, href, active }: { label: string; href?: string; active?: boolean }) {
  const base = `px-5 py-3 rounded-lg font-semibold transition-all ${
    active
      ? 'bg-amber-600 text-white shadow-lg'
      : 'bg-card border-2 border-border text-foreground hover:border-amber-300'
  }`
  if (href) {
    return <Link href={href} className={base}>{label}</Link>
  }
  return <span className={base}>{label}</span>
}

function RelatedLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="bg-card rounded-lg border-2 border-border p-4 hover:border-amber-300 hover:shadow-lg transition-all block">
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
