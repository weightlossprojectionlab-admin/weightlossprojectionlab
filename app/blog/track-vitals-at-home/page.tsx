import Link from 'next/link'
import {
  HeartIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline'
import { JsonLd } from '@/components/seo/JsonLd'
import { type FAQItem } from '@/lib/json-ld'
import { buildBlogPostMetadata, buildBlogPostJsonLd, type BlogPostConfig } from '@/lib/blog-post'
import { getBlogAuthor } from '@/lib/blog-authors'
import { AuthorByline, AuthorBio } from '@/components/blog/AuthorByline'
import { SeriesNav } from '@/components/blog/SeriesNav'
import { FaqAccordion } from '@/components/blog/FaqAccordion'
import { CtaBand } from '@/components/blog/CtaBand'
import { Sources } from '@/components/blog/Sources'
import { ProblemCard, HowToStep } from '@/components/blog/cards'

const PAGE_SLUG = 'track-vitals-at-home'
const PAGE_TITLE = 'How to Track Vital Signs at Home (Without Getting Overwhelmed)'
const PAGE_DESCRIPTION =
  'You do not need to become a nurse to monitor a loved one at home. Here is a simple, low-stress way to track vital signs like blood pressure and blood sugar — just enough to spot trends and share them with the doctor.'
const DATE_PUBLISHED = '2026-07-18T10:20:00-05:00'
const DATE_MODIFIED = '2026-07-18T10:20:00-05:00'

const author = getBlogAuthor('founder')

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Which vital signs should I track at home?',
    answer:
      'Track what the doctor cares about for that person’s conditions — often blood pressure, blood sugar, weight, oxygen level, or temperature. You do not need to track everything. Ask which two or three numbers matter most and focus there.',
  },
  {
    question: 'How do I track vitals without getting overwhelmed?',
    answer:
      'Keep it small and regular. Pick a set time (like after breakfast), record just the numbers that matter, and let a tool store the history for you. The goal is a simple trend line over time, not a spreadsheet you dread.',
  },
  {
    question: 'Why does writing readings down matter?',
    answer:
      'A single reading is a snapshot; the trend is the story. Recorded over days and weeks, the numbers show whether something is stable, improving, or drifting — which is exactly what a doctor needs to make good decisions.',
  },
  {
    question: 'When should I call the doctor about a reading?',
    answer:
      'Ask your provider up front what numbers should prompt a call, and write those limits down. This article is educational and not medical advice — your care team sets the thresholds for your specific situation.',
  },
]

const CONFIG: BlogPostConfig = {
  slug: PAGE_SLUG,
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords:
    'track vital signs at home, home blood pressure monitoring, how to monitor vitals caregiver, blood sugar tracking at home, vital signs log, chronic disease self-management, patient-controlled health record, personal health record tracking',
  datePublished: DATE_PUBLISHED,
  dateModified: DATE_MODIFIED,
  appUrl: '/patients',
  appDescription: 'Log vitals at home and watch the trends over time for every family member.',
  faqItems: FAQ_ITEMS,
  citations: [
    { label: 'MedlinePlus (NIH) — Vital Signs', url: 'https://medlineplus.gov/vitalsigns.html' },
    { label: 'MedlinePlus (NIH) — High Blood Pressure', url: 'https://medlineplus.gov/highbloodpressure.html' },
  ],
}

export const metadata = buildBlogPostMetadata(CONFIG)

export default function TrackVitalsAtHomePage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={buildBlogPostJsonLd(CONFIG)} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Caregiver Guide · How-To</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">{PAGE_TITLE}</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Home monitoring sounds clinical and scary. It does not have to be. A few numbers, tracked simply, can give
            you real peace of mind — and your loved one&apos;s doctor a clearer picture.
          </p>
          <AuthorByline author={author} datePublished={DATE_PUBLISHED} dateModified={DATE_MODIFIED} />
        </div>

        <div className="mb-10"><SeriesNav slug={PAGE_SLUG} variant="top" /></div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-3">You are tracking trends, not diagnosing</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your job at home is not to interpret every reading — it is to <strong>capture</strong> them so the pattern
            is there when it matters. A steady record lets the doctor see what a single office visit never could, and
            lets you catch a slow drift before it becomes an emergency.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">What makes home tracking feel overwhelming</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <ProblemCard icon={<HeartIcon className="w-8 h-8 text-amber-500" />} title="Tracking too much" description="Trying to log every possible number turns a simple habit into a chore no one keeps up." />
            <ProblemCard icon={<CalendarDaysIcon className="w-8 h-8 text-amber-500" />} title="No set routine" description="Readings taken 'whenever' leave gaps, so the trend is impossible to read." />
            <ProblemCard icon={<ArrowTrendingUpIcon className="w-8 h-8 text-amber-500" />} title="Numbers with no memory" description="Written on scraps of paper, readings can't show whether things are getting better or worse." />
            <ProblemCard icon={<FaceSmileIcon className="w-8 h-8 text-amber-500" />} title="Fear of 'doing it wrong'" description="Worry about the numbers can make caregivers avoid tracking altogether." />
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">A low-stress routine that sticks</h2>
          <ol className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 p-0">
            <HowToStep step={1} label="Track only what matters" description="Ask the doctor which two or three numbers to watch, and ignore the rest." />
            <HowToStep step={2} label="Pick a set time" description="Same moment each day — like after breakfast — so readings are comparable and easy to remember." />
            <HowToStep step={3} label="Record the number" description="Log it in one place that keeps the history, so the trend builds itself over time." />
            <HowToStep step={4} label="Bring the trend to visits" description="Share the pattern with the doctor instead of a single reading from that morning." />
          </ol>
        </section>

        <section className="mb-16">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-2">Ask your care team</div>
            <p className="text-muted-foreground leading-relaxed">
              Before you start, ask which numbers to track, how often, and what readings should prompt a phone call.
              Write those limits down. Home tracking works best as a partnership with the doctor — you capture the
              trend, they set the thresholds.
            </p>
          </div>
        </section>

        <FaqAccordion items={FAQ_ITEMS} intro="Common questions about monitoring vitals at home without the overwhelm." />

        <div className="mb-10"><SeriesNav slug={PAGE_SLUG} variant="bottom" /></div>
        <div className="mb-16"><AuthorBio author={author} /></div>

        <CtaBand
          title="Turn scattered readings into a clear trend"
          subtitle="Log vitals at home for each person you care for, watch the trend build over time, and bring it to every appointment."
          primaryHref="/patients"
          primaryLabel="Start Tracking Vitals"
        />

        <Sources items={CONFIG.citations} />

        <p className="text-center text-sm text-muted-foreground mt-8">
          Educational information for caregivers — not medical advice. Your care team sets the right targets and
          thresholds for your situation. <Link href="/security" className="underline">How we keep your data secure.</Link>
        </p>
      </main>
    </div>
  )
}
