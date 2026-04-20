import Link from 'next/link'
import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageSchema, breadcrumbListSchema } from '@/lib/json-ld'

export const dynamic = 'force-static'
export const revalidate = false

const PAGE_TITLE =
  'Newborn & Baby Tracker for New Parents — Feeds, Sleep, Diapers, Milestones'
const PAGE_DESCRIPTION =
  'A shared newborn tracker for new parents. Log feeds, sleep, diapers, vitals, and pediatrician visits — and keep both parents (plus grandparents and sitters) on the same page without another group text.'

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    path: '/caregivers/new-parents',
    keywords: [
      'newborn tracker app',
      'baby tracker for new parents',
      'shared baby tracker for partners',
      'newborn feeding and sleep log',
      'how to track baby milestones',
      'baby app for both parents',
      'newborn health tracker',
    ],
  }),
  title: { absolute: PAGE_TITLE },
}

const FAQ = [
  {
    question: 'What is the best newborn tracker app for new parents?',
    answer:
      'The right newborn tracker makes logging effortless at 3 a.m. and keeps both parents (and anyone helping — grandparents, doulas, sitters) on the same page automatically. Wellness Projection Lab logs feeds, sleep, diapers, vitals, and pediatrician notes in one timeline any authorized caregiver can see.',
  },
  {
    question: 'Can both parents use the same baby tracker?',
    answer:
      'Yes. You and your partner share one account with equal access to the baby\u2019s profile — so whoever did the last feed or changed the last diaper, the other parent can see it without asking.',
  },
  {
    question: 'Can I share the baby\u2019s log with a grandparent or sitter?',
    answer:
      'Yes. Invite anyone with fine-grained permissions — view-only for a curious grandparent, log-only for a sitter, full access for a co-parent.',
  },
  {
    question: 'Does it track feeding, sleep, and diaper changes?',
    answer:
      'Yes. Feeds (breast, bottle, pumped, formula), sleep sessions, diaper changes, weight, head circumference, medications, and pediatrician appointment notes — all on one timeline.',
  },
  {
    question: 'Can I track my baby\u2019s growth and milestones?',
    answer:
      'Yes. Every weigh-in and measurement is charted over time. You\u2019ll see percentile trends at a glance and can bring a formatted summary to pediatrician visits instead of scrolling through your notes app.',
  },
  {
    question: 'What happens as my baby grows into a toddler and beyond?',
    answer:
      'The same profile carries forward. Feed and diaper logs fade out; meal tracking, milestones, and appointments stay relevant. You don\u2019t migrate apps when your baby turns one.',
  },
  {
    question: 'Is Wellness Projection Lab HIPAA compliant?',
    answer:
      'Yes. Wellness Projection Lab is built as a HIPAA-compliant platform with fine-grained access controls, and BAAs are available for practitioners who license the platform.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes \u2014 a free 7-day trial with full access. Cancel anytime.',
  },
]

const BREADCRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Caregivers', path: '/caregivers' },
  { name: 'New Parents', path: '/caregivers/new-parents' },
]

export default function NewParentsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <JsonLd data={faqPageSchema(FAQ)} />
      <JsonLd data={breadcrumbListSchema(BREADCRUMBS)} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium inline-flex items-center gap-2"
        >
          &larr; Back to Home
        </Link>

        {/* Hero */}
        <section className="text-center space-y-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-pink-600 dark:text-pink-400">
            A guide for new and expecting parents
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            The Baby Tracker for Parents Who Are Both Doing This
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Feeds, sleep, diapers, vitals, and pediatrician notes — in one shared timeline
            you and your partner can both see, no matter who did the last one.
          </p>
          <div className="pt-4">
            <Link
              href="/auth"
              className="inline-block bg-gradient-to-r from-pink-600 to-blue-600 hover:from-pink-700 hover:to-blue-700 text-white font-bold text-lg px-10 py-4 rounded-full shadow-2xl transition-all transform hover:scale-105"
            >
              Start a Free 7-Day Trial
            </Link>
            <p className="text-xs text-muted-foreground mt-3">
              HIPAA compliant &middot; Cancel anytime
            </p>
          </div>
        </section>

        {/* Problem / empathy */}
        <section className="space-y-4">
          <h2 className="text-3xl font-bold text-foreground">
            The 3 A.M. Question Nobody Should Have to Ask
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            &ldquo;Did you feed her at midnight or was that the one before?&rdquo; A
            new baby runs on increments of twenty minutes, and the partner who slept
            through the last feed has no way of knowing what just happened. The
            notes app helps for a day, the paper log gets lost, the group text with
            the in-laws turns into a second job.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            You don&apos;t need another app. You need one place where both parents
            &mdash; and whoever else is helping &mdash; see the same timeline,
            automatically.
          </p>
        </section>

        {/* What you can track */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">
            What You Can Track Together
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                title: 'Feeds',
                body: 'Breast, bottle, pumped, or formula \u2014 logged in seconds, visible to both parents. No more asking which side was last.',
              },
              {
                title: 'Sleep and diapers',
                body: 'A running ledger of sleep sessions and diaper changes so you can spot patterns (and pediatrician questions stop being guesswork).',
              },
              {
                title: 'Growth and milestones',
                body: 'Weight, length, and head circumference plotted over time. Bring a clean summary to every well-baby visit instead of scrolling screenshots.',
              },
              {
                title: 'Medications and appointments',
                body: 'Every prescription, every pediatrician visit, every note \u2014 all on one shared timeline you won\u2019t have to re-create at the next appointment.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6"
              >
                <h3 className="font-bold text-lg text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">
            How It Works for Two Tired Parents
          </h2>
          <ol className="space-y-5">
            <li className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 flex gap-4">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-pink-700 text-white font-bold flex items-center justify-center">1</span>
              <div>
                <h3 className="font-bold text-lg text-foreground mb-1">Create a profile for your baby</h3>
                <p className="text-sm text-muted-foreground">
                  Takes a minute. Birth date, pediatrician, current weight. That&apos;s it
                  &mdash; the rest fills in as you log.
                </p>
              </div>
            </li>
            <li className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 flex gap-4">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-blue-500 text-white font-bold flex items-center justify-center">2</span>
              <div>
                <h3 className="font-bold text-lg text-foreground mb-1">Invite your partner &mdash; and whoever else is helping</h3>
                <p className="text-sm text-muted-foreground">
                  Your partner gets full access. A grandparent gets view-only. A night
                  nanny gets log-only. Everyone on one shared page.
                </p>
              </div>
            </li>
            <li className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 flex gap-4">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold flex items-center justify-center">3</span>
              <div>
                <h3 className="font-bold text-lg text-foreground mb-1">Log what happened in seconds</h3>
                <p className="text-sm text-muted-foreground">
                  One tap for a feed, a diaper, a sleep session. The other parent sees
                  it without asking. The pediatrician gets a clean record at every visit.
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* Testimonial */}
        <section className="bg-gradient-to-r from-pink-600 to-blue-600 rounded-2xl shadow-2xl p-8 text-white">
          <p className="text-lg italic mb-4 leading-relaxed">
            &ldquo;My husband and I stopped texting each other about feeds by week two.
            We just both check the app. It sounds small, but at 3 a.m. it felt
            enormous.&rdquo;
          </p>
          <div className="text-sm font-semibold">Diana L.</div>
          <div className="text-xs opacity-80">New parent, sharing with one partner and two grandparents</div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq" className="space-y-6">
          <h2 id="faq" className="text-3xl font-bold text-foreground text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.question}
                className="group bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 open:shadow-lg transition-shadow"
              >
                <summary className="cursor-pointer list-none font-semibold text-foreground flex items-start justify-between gap-4">
                  <span>{item.question}</span>
                  <span className="text-pink-600 dark:text-pink-400 text-xl leading-none group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Keep reading */}
        <section aria-labelledby="keep-reading" className="space-y-4">
          <h2 id="keep-reading" className="text-3xl font-bold text-foreground text-center">Keep Reading</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/caregivers/aging-parents"
              className="block bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-bold text-foreground mb-1">Caring for Aging Parents</h3>
              <p className="text-sm text-muted-foreground">The long-distance caregiving guide &mdash; medications, vitals, and shared visibility.</p>
            </Link>
            <Link
              href="/blog/weight-tracking"
              className="block bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-bold text-foreground mb-1">Growth &amp; Weight Projections</h3>
              <p className="text-sm text-muted-foreground">Track your baby&apos;s growth curve and bring a clean summary to every well-baby visit.</p>
            </Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center space-y-4 pb-8">
          <h2 className="text-2xl font-bold text-foreground">
            One Shared Timeline for the Two of You
          </h2>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            Start a free 7-day trial. Set up your baby&apos;s profile in a minute,
            invite your partner, and let the app do the remembering for both of you.
          </p>
          <Link
            href="/auth"
            className="inline-block bg-gradient-to-r from-pink-600 to-blue-600 hover:from-pink-700 hover:to-blue-700 text-white font-bold text-lg px-10 py-4 rounded-full shadow-2xl transition-all transform hover:scale-105"
          >
            Start Your Free Trial
          </Link>
          <p className="text-xs text-muted-foreground">
            HIPAA compliant &middot; Cancel anytime
          </p>
        </section>
      </div>
    </main>
  )
}
