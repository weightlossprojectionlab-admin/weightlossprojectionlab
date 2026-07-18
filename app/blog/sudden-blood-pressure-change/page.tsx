import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { type FAQItem } from '@/lib/json-ld'
import { buildBlogPostMetadata, buildBlogPostJsonLd, type BlogPostConfig } from '@/lib/blog-post'
import { getBlogAuthor } from '@/lib/blog-authors'
import { AuthorByline, AuthorBio } from '@/components/blog/AuthorByline'
import { SeriesNav } from '@/components/blog/SeriesNav'
import { FaqAccordion } from '@/components/blog/FaqAccordion'
import { CtaBand } from '@/components/blog/CtaBand'
import { Sources } from '@/components/blog/Sources'

const PAGE_SLUG = 'sudden-blood-pressure-change'
const PAGE_TITLE = 'What Does a Sudden Change in Blood Pressure Mean?'
const PAGE_DESCRIPTION =
  'A blood pressure reading that suddenly looks high or low can be alarming. In plain, non-medical language, here is what can cause sudden changes, why one reading is not the whole story, and the warning signs that mean you should get help right away.'
const DATE_PUBLISHED = '2026-07-18T10:50:00-05:00'
const DATE_MODIFIED = '2026-07-18T10:50:00-05:00'

const author = getBlogAuthor('founder')

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What can cause a sudden change in blood pressure?',
    answer:
      'Everyday things move blood pressure a lot: stress, pain, caffeine, a full bladder, activity, standing up quickly, poor sleep, or a recent medication change. Illness and dehydration can shift it too. A single high or low reading often reflects the moment, not a lasting change.',
  },
  {
    question: 'Is one high or low reading something to worry about?',
    answer:
      'Usually a single reading is not the full picture — the trend over time matters more. Wait a few minutes, sit calmly, and measure again with the correct cuff size and position. If repeated readings stay unusual for that person, share them with their doctor.',
  },
  {
    question: 'When is a blood pressure change an emergency?',
    answer:
      'Call 911 or seek emergency care if a very high or low reading comes with symptoms like chest pain, trouble breathing, a severe headache, confusion, weakness or numbness, fainting, or vision changes. Those symptoms — not the number alone — are the reason to act immediately.',
  },
  {
    question: 'How can tracking help?',
    answer:
      'Recording readings over days and weeks turns scary one-off numbers into a trend your doctor can actually use. It helps tell a stressful-moment spike apart from a real, lasting change.',
  },
]

const CONFIG: BlogPostConfig = {
  slug: PAGE_SLUG,
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords:
    'sudden change in blood pressure, why did my blood pressure spike, blood pressure suddenly high, blood pressure suddenly low, what causes blood pressure to change',
  datePublished: DATE_PUBLISHED,
  dateModified: DATE_MODIFIED,
  appUrl: '/patients',
  appDescription: 'Log blood pressure at home and watch the trend over time.',
  faqItems: FAQ_ITEMS,
  citations: [
    { label: 'MedlinePlus (NIH) — High Blood Pressure / Hypertension', url: 'https://medlineplus.gov/highbloodpressure.html' },
    { label: 'American Heart Association — High Blood Pressure', url: 'https://www.heart.org/en/health-topics/high-blood-pressure' },
  ],
}

export const metadata = buildBlogPostMetadata(CONFIG)

export default function SuddenBloodPressureChangePage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={buildBlogPostJsonLd(CONFIG)} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Caregiver Guide · Vitals, Explained</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">{PAGE_TITLE}</h1>
          <p className="text-xl text-muted-foreground mb-6">
            A number that suddenly looks off can send anyone into a panic. Here is a calm, plain-English look at what it
            might mean — and, importantly, when it is time to get help right away.
          </p>
          <AuthorByline author={author} datePublished={DATE_PUBLISHED} dateModified={DATE_MODIFIED} />
        </div>

        {/* Emergency callout — up top for YMYL safety */}
        <div className="mb-10 rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5">
          <p className="text-sm text-red-800 dark:text-red-200">
            <strong>If in doubt, get help.</strong> Call 911 or seek emergency care if a blood pressure change comes
            with chest pain, trouble breathing, a severe headache, confusion, weakness or numbness, fainting, or vision
            changes. This article is educational and is not a substitute for professional medical advice.
          </p>
        </div>

        <div className="mb-10"><SeriesNav slug={PAGE_SLUG} variant="top" /></div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-3">The short answer</h2>
          <p className="text-muted-foreground leading-relaxed">
            Blood pressure naturally goes up and down through the day. A sudden change most often reflects something in
            the moment — stress, activity, pain, caffeine, standing up too fast, or a recent medication change — rather
            than a permanent shift. What matters is the <strong>pattern over time</strong> and whether any worrying
            symptoms come with it.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-3">Common reasons a reading suddenly changes</h2>
          <ul className="space-y-2 text-muted-foreground leading-relaxed list-disc pl-6">
            <li>Stress, anxiety, or pain in the moment</li>
            <li>Caffeine, a big meal, or a full bladder</li>
            <li>Standing up quickly (a temporary drop is common)</li>
            <li>Poor sleep or dehydration</li>
            <li>A recent change in medication or when it was taken</li>
            <li>Wrong cuff size, arm position, or measuring right after activity</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-3">What to do about a surprising reading</h2>
          <p className="text-muted-foreground leading-relaxed">
            If there are no worrying symptoms, sit quietly for a few minutes and measure again with the right cuff and
            arm position. One-off numbers are noisy. If repeated readings stay unusual for that person over several
            days, write them down and share the pattern with their doctor — that trend is far more useful than a single
            snapshot.
          </p>
        </section>

        <FaqAccordion items={FAQ_ITEMS} intro="Plain-language answers about sudden blood pressure changes." />

        <div className="mb-10"><SeriesNav slug={PAGE_SLUG} variant="bottom" /></div>
        <div className="mb-16"><AuthorBio author={author} /></div>

        <CtaBand
          title="See the trend, not just one scary number"
          subtitle="Log blood pressure at home and watch the pattern build over time — so you can tell a moment from a trend and bring it to the doctor."
          primaryHref="/patients"
          primaryLabel="Track Blood Pressure"
        />

        <Sources items={CONFIG.citations} />

        <p className="text-center text-sm text-muted-foreground mt-8">
          This article is educational and is not medical advice, diagnosis, or treatment. Always consult a qualified
          healthcare provider about blood pressure concerns, and call emergency services for urgent symptoms.
        </p>
      </main>
    </div>
  )
}
