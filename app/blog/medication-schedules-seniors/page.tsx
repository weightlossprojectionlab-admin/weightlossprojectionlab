import Link from 'next/link'
import {
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  UserGroupIcon,
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

const PAGE_SLUG = 'medication-schedules-seniors'
const PAGE_TITLE = 'Managing Daily Medication Schedules for Seniors: Tips for Accuracy and Compliance'
const PAGE_DESCRIPTION =
  'A senior on several medications is easy to lose track of. Here is a step-by-step way to build an accurate daily medication schedule — and actually stick to it — without living in fear of a missed or doubled dose.'
const DATE_PUBLISHED = '2026-07-18T10:10:00-05:00'
const DATE_MODIFIED = '2026-07-18T10:10:00-05:00'

const author = getBlogAuthor('founder')

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I build an accurate medication schedule?',
    answer:
      'Start from the real source: the prescription labels and the pharmacy list. Write down each medicine, its dose, and exactly when it is taken (with or without food). Then group them into time slots — morning, midday, evening, bedtime — so the day has a clear rhythm.',
  },
  {
    question: 'What is the best way to avoid missed or doubled doses?',
    answer:
      'Two things: a reminder at each scheduled time, and a simple record of what was actually taken. When you can see that the morning dose is already checked off, you never have to guess or risk giving it twice.',
  },
  {
    question: 'How do I keep the schedule right when a doctor changes it?',
    answer:
      'Update the schedule in one place the moment it changes, and make sure every caregiver sees the same version. Problems happen when one person is working from last month’s instructions.',
  },
  {
    question: 'What about refills?',
    answer:
      'Track the supply, not just the schedule. Set a reminder to refill before you run out — ideally a week ahead — so a lapse never interrupts the routine.',
  },
]

const CONFIG: BlogPostConfig = {
  slug: PAGE_SLUG,
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords:
    'medication schedule for seniors, medication management elderly, avoid missed doses, medication compliance, senior medication reminders, how to organize medications',
  datePublished: DATE_PUBLISHED,
  dateModified: DATE_MODIFIED,
  appUrl: '/medications',
  appDescription: 'Track medications, schedules, and reminders for every family member.',
  faqItems: FAQ_ITEMS,
}

export const metadata = buildBlogPostMetadata(CONFIG)

export default function MedicationSchedulesSeniorsPage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={buildBlogPostJsonLd(CONFIG)} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Caregiver Guide · How-To</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">{PAGE_TITLE}</h1>
          <p className="text-xl text-muted-foreground mb-6">
            The more medications someone takes, the more a small slip can matter. A clear schedule turns a stressful
            guessing game into a routine you can trust.
          </p>
          <AuthorByline author={author} datePublished={DATE_PUBLISHED} dateModified={DATE_MODIFIED} />
        </div>

        <div className="mb-10"><SeriesNav slug={PAGE_SLUG} variant="top" /></div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-3">Why medication timing is so easy to get wrong</h2>
          <p className="text-muted-foreground leading-relaxed">
            Several medicines, different times, some with food and some without, plus refills that run out at
            different rates — it is a lot to hold in your head. Most mistakes are not carelessness; they are the
            natural result of tracking a complex schedule from memory.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">The problems this solves</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <ProblemCard icon={<ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />} title="Missed doses" description="A dose slips by unnoticed on a busy or hard day, and no one is sure whether it happened." />
            <ProblemCard icon={<ArrowPathIcon className="w-8 h-8 text-amber-500" />} title="Doubled doses" description="Unsure if it was given, a second caregiver gives it again — the riskiest kind of mistake." />
            <ProblemCard icon={<ClockIcon className="w-8 h-8 text-amber-500" />} title="Wrong timing" description="A medicine that needs food, or a specific time, gets taken the wrong way and works less well." />
            <ProblemCard icon={<UserGroupIcon className="w-8 h-8 text-amber-500" />} title="Caregivers out of sync" description="One person has the current plan; another is working from an old one." />
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Build the schedule, step by step</h2>
          <ol className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 p-0">
            <HowToStep step={1} label="List every medication" description="From the labels: name, dose, and any 'with food' or timing notes. Include vitamins and over-the-counter items." />
            <HowToStep step={2} label="Group into time slots" description="Morning, midday, evening, bedtime. A clear rhythm is easier to follow than a scattered list." />
            <HowToStep step={3} label="Add a reminder + a check-off" description="A nudge at each time, and a simple record of what was taken, so no one has to guess." />
            <HowToStep step={4} label="Track refills" description="Watch the supply and set a refill reminder about a week before you run out." />
          </ol>
        </section>

        <section className="mb-16">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-2">Tip</div>
            <p className="text-muted-foreground leading-relaxed">
              Snap a photo of each prescription label when you set it up. A tool that reads the label can pull the
              drug name and dose for you, so the schedule starts accurate instead of hand-typed and error-prone.
            </p>
          </div>
        </section>

        <FaqAccordion items={FAQ_ITEMS} intro="What caregivers ask about keeping a senior's medications accurate and on time." />

        <div className="mb-10"><SeriesNav slug={PAGE_SLUG} variant="bottom" /></div>
        <div className="mb-16"><AuthorBio author={author} /></div>

        <CtaBand
          title="Every pill, every person, on time"
          subtitle="Build medication schedules with reminders and a shared record — so missed and doubled doses stop being a worry."
          primaryHref="/medications"
          primaryLabel="Set Up Medications"
        />

        <p className="text-center text-sm text-muted-foreground mt-8">
          Educational information for caregivers — not medical advice. Always follow your pharmacist and prescriber&apos;s
          instructions. <Link href="/security" className="underline">How we keep your data secure.</Link>
        </p>
      </main>
    </div>
  )
}
