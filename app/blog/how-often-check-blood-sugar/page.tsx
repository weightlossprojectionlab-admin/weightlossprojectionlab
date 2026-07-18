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

const PAGE_SLUG = 'how-often-check-blood-sugar'
const PAGE_TITLE = 'How Often Should You Record Blood Sugar Levels?'
const PAGE_DESCRIPTION =
  'How often to check blood sugar depends on the person and their care plan — but a few clear patterns help. In plain language, here is what shapes the answer and why recording each reading matters as much as taking it.'
const DATE_PUBLISHED = '2026-07-18T11:00:00-05:00'
const DATE_MODIFIED = '2026-07-18T11:00:00-05:00'

const author = getBlogAuthor('founder')

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How often should blood sugar be recorded?',
    answer:
      'It depends on the person and their care plan. Someone using insulin often checks several times a day (such as before meals and at bedtime), while someone managing with diet or certain medications may check far less often. Your doctor or diabetes educator sets the right schedule — this article does not replace that guidance.',
  },
  {
    question: 'Why does the answer vary so much?',
    answer:
      'Because the goal is different for different people. Frequent checks help someone adjusting insulin stay safe; occasional checks are enough to confirm a stable routine is working. The schedule matches the person’s treatment, not a single rule for everyone.',
  },
  {
    question: 'Does it matter when I check, not just how often?',
    answer:
      'Yes. Readings before meals, after meals, or at bedtime tell different stories. Following the specific times your care team recommends makes the numbers far more useful than random checks.',
  },
  {
    question: 'Why write every reading down?',
    answer:
      'A number you check but do not record is a number you lose. Kept over time, readings reveal patterns — like a regular after-dinner rise — that help your care team fine-tune the plan. Consistent recording is what turns checks into insight.',
  },
]

const CONFIG: BlogPostConfig = {
  slug: PAGE_SLUG,
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords:
    'how often check blood sugar, blood sugar testing frequency, when to check blood glucose, recording blood sugar levels, blood sugar log',
  datePublished: DATE_PUBLISHED,
  dateModified: DATE_MODIFIED,
  appUrl: '/patients',
  appDescription: 'Record blood sugar readings and see the pattern over time.',
  faqItems: FAQ_ITEMS,
  citations: [
    { label: 'MedlinePlus (NIH) — Blood Glucose / Blood Sugar', url: 'https://medlineplus.gov/bloodsugar.html' },
  ],
}

export const metadata = buildBlogPostMetadata(CONFIG)

export default function HowOftenCheckBloodSugarPage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={buildBlogPostJsonLd(CONFIG)} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Caregiver Guide · Vitals, Explained</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">{PAGE_TITLE}</h1>
          <p className="text-xl text-muted-foreground mb-6">
            It is one of the most-searched caregiver questions — and the honest answer is &ldquo;it depends.&rdquo;
            Here is what it depends on, in plain language.
          </p>
          <AuthorByline author={author} datePublished={DATE_PUBLISHED} dateModified={DATE_MODIFIED} />
        </div>

        <div className="mb-10"><SeriesNav slug={PAGE_SLUG} variant="top" /></div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-3">The short answer</h2>
          <p className="text-muted-foreground leading-relaxed">
            How often to record blood sugar depends on the person&apos;s treatment and what their doctor recommends.
            As a rough guide: people using insulin often check several times a day, while people managing with diet or
            certain medications may check much less often. The right number is the one your care team sets — this is
            educational information, not medical advice.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-3">What shapes how often to check</h2>
          <ul className="space-y-2 text-muted-foreground leading-relaxed list-disc pl-6">
            <li>Whether the person uses insulin (usually means more frequent checks)</li>
            <li>How stable their levels have been recently</li>
            <li>A recent change in medication, diet, activity, or illness</li>
            <li>What the doctor or diabetes educator has asked for</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-3">Timing matters as much as frequency</h2>
          <p className="text-muted-foreground leading-relaxed">
            A reading before breakfast and a reading two hours after dinner tell different stories. Whatever schedule
            your care team recommends — before meals, after meals, at bedtime — checking at consistent times makes the
            pattern readable. Random checks are much harder to learn from.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-3">Recording is half the job</h2>
          <p className="text-muted-foreground leading-relaxed">
            A reading you take but never write down is a reading you lose. Kept over time, blood sugar numbers reveal
            patterns — like a regular rise after a certain meal — that help the care team adjust the plan. A tool that
            stores the history turns scattered checks into a clear trend.
          </p>
        </section>

        <FaqAccordion items={FAQ_ITEMS} intro="Plain-language answers about how often to record blood sugar." />

        <div className="mb-10"><SeriesNav slug={PAGE_SLUG} variant="bottom" /></div>
        <div className="mb-16"><AuthorBio author={author} /></div>

        <CtaBand
          title="Every reading, in one clear history"
          subtitle="Record blood sugar for each person you care for and watch the pattern build — ready to share at the next appointment."
          primaryHref="/patients"
          primaryLabel="Log Blood Sugar"
        />

        <Sources items={CONFIG.citations} />

        <p className="text-center text-sm text-muted-foreground mt-8">
          This article is educational and is not medical advice, diagnosis, or treatment. Your doctor or diabetes
          educator sets the right testing schedule for each person. <Link href="/security" className="underline">How we keep your data secure.</Link>
        </p>
      </main>
    </div>
  )
}
