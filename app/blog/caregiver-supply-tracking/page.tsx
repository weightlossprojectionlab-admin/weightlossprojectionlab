import Link from 'next/link'
import {
  CubeIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import { JsonLd } from '@/components/seo/JsonLd'
import { type FAQItem } from '@/lib/json-ld'
import { buildBlogPostMetadata, buildBlogPostJsonLd, type BlogPostConfig } from '@/lib/blog-post'
import { getBlogAuthor } from '@/lib/blog-authors'
import { AuthorByline, AuthorBio } from '@/components/blog/AuthorByline'
import { SeriesNav } from '@/components/blog/SeriesNav'
import { FaqAccordion } from '@/components/blog/FaqAccordion'
import { CtaBand } from '@/components/blog/CtaBand'
import { ProblemCard, HowToStep } from '@/components/blog/cards'

const PAGE_SLUG = 'caregiver-supply-tracking'
const PAGE_TITLE = 'Beyond the Kitchen: Tracking Essential Medical & Household Supplies'
const PAGE_DESCRIPTION =
  'Running out of gauze, formula, or a special-diet staple can stall an entire care plan. Here is a simple way to track medical and household supplies by urgency and frequency — so you never scramble again.'
const DATE_PUBLISHED = '2026-07-18T09:10:00-05:00'
const DATE_MODIFIED = '2026-07-18T09:10:00-05:00'

const author = getBlogAuthor('founder')

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What counts as a caregiver "essential supply"?',
    answer:
      'Anything the care plan depends on: medications and refills, wound-care items like gauze and tape, incontinence supplies, formula or special-diet foods, and equipment parts such as CPAP filters. If running out would change someone’s day, it belongs on the list.',
  },
  {
    question: 'How should I organize supplies so nothing runs out?',
    answer:
      'Sort by two things: urgency (how bad is it if you run out today?) and frequency (how fast do you go through it?). High-urgency, fast-use items get the closest watch and the earliest reminders. Everything else can be checked less often.',
  },
  {
    question: 'Can I use a kitchen inventory tool for medical supplies?',
    answer:
      'Yes. The same idea that tracks pantry items — scan or add an item, set where it lives, and get a nudge before it runs low — works just as well for gauze, formula, or filters. One system for everything the household needs.',
  },
  {
    question: 'Do I need to count everything perfectly?',
    answer:
      'No. Start with the five or ten items that would hurt most to run out of. A rough system you actually keep up beats a perfect count you abandon after a week.',
  },
]

const CONFIG: BlogPostConfig = {
  slug: PAGE_SLUG,
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords:
    'caregiver supplies, medical supply tracking, how to manage home health supplies inventory, how to manage senior health supplies, caregiver inventory checklist, household essentials tracker, sandwich generation caregiving help, never run out of caregiver supplies',
  datePublished: DATE_PUBLISHED,
  dateModified: DATE_MODIFIED,
  appUrl: '/inventory',
  appDescription: 'Track household and medical supplies alongside the rest of your family’s care.',
  faqItems: FAQ_ITEMS,
}

export const metadata = buildBlogPostMetadata(CONFIG)

export default function CaregiverSupplyTrackingPage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={buildBlogPostJsonLd(CONFIG)} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <div className="mb-8">
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Caregiver Guide</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">{PAGE_TITLE}</h1>
          <p className="text-xl text-muted-foreground mb-6">
            A care plan only works if you have the supplies to follow it. Here is how to make sure the important
            things are always in the cupboard — without keeping it all in your head.
          </p>
          <AuthorByline author={author} datePublished={DATE_PUBLISHED} dateModified={DATE_MODIFIED} />
        </div>

        <div className="mb-10">
          <SeriesNav slug={PAGE_SLUG} variant="top" />
        </div>

        {/* Definition */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-3">Why supplies are part of health, not separate from it</h2>
          <p className="text-muted-foreground leading-relaxed">
            We think of health as vitals and medications. But the plan quietly depends on <strong>stuff</strong>: the
            gauze for a dressing change, the formula for a feeding, the filter for the machine. When a supply runs out,
            the care stops — even if everything else is perfect. That makes supplies a health issue, not just an errand.
          </p>
        </section>

        {/* The problem */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">The stress of running out</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />}
              title="The empty box at the worst time"
              description="You reach for the last dressing or the last scoop of formula and there is none — usually at night or on a weekend."
            />
            <ProblemCard
              icon={<CubeIcon className="w-8 h-8 text-amber-500" />}
              title="Guessing what's left"
              description="Supplies are spread across a closet, a bathroom, and the car. No one really knows how much is on hand."
            />
            <ProblemCard
              icon={<ArrowTrendingUpIcon className="w-8 h-8 text-amber-500" />}
              title="Panic-buying doubles"
              description="Not sure if you are low, you buy more — and end up with a year of one item and none of another."
            />
            <ProblemCard
              icon={<ClipboardDocumentListIcon className="w-8 h-8 text-amber-500" />}
              title="No one else can restock"
              description="Because the list lives in your head, a helper cannot pick things up for you without a dozen questions."
            />
          </div>
        </section>

        {/* The method */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Sort supplies by urgency and frequency</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            You do not need to track everything the same way. Rate each item on two simple questions, and let that
            decide how closely you watch it.
          </p>
          <ol className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 p-0">
            <HowToStep step={1} label="List the must-haves" description="Write down the items where running out would change someone's day. Start with 5–10." />
            <HowToStep step={2} label="Mark how urgent" description="How bad is it to run out today? Medications and wound care rank highest." />
            <HowToStep step={3} label="Mark how fast you use it" description="Daily-use items need earlier reminders than once-a-month ones." />
            <HowToStep step={4} label="Set a 'reorder at' point" description="Pick the amount that should trigger a restock — before you hit zero, not after." />
          </ol>
        </section>

        {/* Reuse the kitchen tool */}
        <section className="mb-16">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-2">Tip</div>
            <p className="text-muted-foreground leading-relaxed">
              You may already have the right tool. A kitchen inventory feature — scan or add an item, set where it
              lives, track expiration dates, and get a nudge before it runs low — works just as well for medical and
              household supplies. Use it as a template for everything the household depends on, not just food. One
              system, one place to look, and any helper can see what to buy.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <FaqAccordion
          items={FAQ_ITEMS}
          intro="Common questions about keeping caregiver supplies stocked without the stress."
        />

        {/* Series + author */}
        <div className="mb-10">
          <SeriesNav slug={PAGE_SLUG} variant="bottom" />
        </div>
        <div className="mb-16">
          <AuthorBio author={author} />
        </div>

        {/* CTA → the actual feature */}
        <CtaBand
          title="Never run out of what the care plan needs"
          subtitle="Track medical and household supplies in the same place as the rest of your family's care — with reminders before you hit zero."
          primaryHref="/inventory"
          primaryLabel="Open Inventory"
        />

        <p className="text-center text-sm text-muted-foreground mt-8">
          Educational information for caregivers — not medical advice. Always work with qualified healthcare providers
          for medical decisions. <Link href="/security" className="underline">How we keep your data secure.</Link>
        </p>
      </main>
    </div>
  )
}
