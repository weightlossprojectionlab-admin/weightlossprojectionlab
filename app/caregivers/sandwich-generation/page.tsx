import Link from 'next/link'
import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageSchema, breadcrumbListSchema } from '@/lib/json-ld'

export const dynamic = 'force-static'
export const revalidate = false

const PAGE_TITLE =
  'Caring for Your Parents and Your Kids at the Same Time — A Sandwich Generation Health Hub'
const PAGE_DESCRIPTION =
  'For the sandwich generation: one shared place to manage two generations of health — your children’s checkups and medications and your aging parents’ care, with your spouse and siblings on the same page.'

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    path: '/caregivers/sandwich-generation',
    keywords: [
      'sandwich generation',
      'caring for parents and children at the same time',
      'sandwich generation caregiver app',
      'managing aging parents and kids',
      'family health app for multiple generations',
      'caregiver coordination app',
      'how to care for parents and kids together',
    ],
  }),
  title: { absolute: PAGE_TITLE },
}

const FAQ = [
  {
    question: 'What is the sandwich generation?',
    answer:
      'The sandwich generation is adults — often in their 40s and 50s — who are caring for their own children and their aging parents at the same time. You’re “sandwiched” between two generations that both need you, usually while working a full-time job.',
  },
  {
    question: 'Can I manage my kids and my parents in one app?',
    answer:
      'Yes. Wellness Projection Lab gives every person their own profile — your children and your parents — on a single account. Each has their own medications, vitals, appointments, and notes, and you switch between them in a tap instead of juggling separate apps or notebooks.',
  },
  {
    question: 'How do I keep two different medication lists straight?',
    answer:
      'Each profile has its own medication list with reminders and refill alerts, so your child’s prescriptions and your father’s heart medications never get mixed up — and nothing slips through on either side.',
  },
  {
    question: 'Can my spouse and siblings share the load?',
    answer:
      'Yes. Invite your spouse, your siblings, or a parent’s in-home aide with fine-grained permissions — full access for a co-caregiver, view-only for extended family, log-only for an aide — so you’re not the only one who knows everything.',
  },
  {
    question: 'Is my family’s health information secure?',
    answer:
      'Yes. Wellness Projection Lab is HIPAA-compliant, and only the people you invite can see your family’s information. You control who sees what for each profile.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes — a free 7-day trial with full access. Cancel anytime.',
  },
]

const BREADCRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Caregivers', path: '/caregivers' },
  { name: 'Sandwich Generation', path: '/caregivers/sandwich-generation' },
]

export default function SandwichGenerationPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <JsonLd data={faqPageSchema(FAQ)} />
      <JsonLd data={breadcrumbListSchema(BREADCRUMBS)} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        <Link
          href="/"
          className="text-purple-600 dark:text-purple-400 hover:text-purple-700 font-medium inline-flex items-center gap-2"
        >
          &larr; Back to Home
        </Link>

        {/* Hero */}
        <section className="text-center space-y-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">
            A guide for the sandwich generation
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Caring for Your Parents and Your Kids at the Same Time
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            One shared place for two generations of health — your child&apos;s checkups
            and your parent&apos;s medications, with your spouse and siblings on the
            same page, without living in your phone.
          </p>
          <div className="pt-4">
            <Link
              href="/auth"
              className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg px-10 py-4 rounded-full shadow-2xl transition-all transform hover:scale-105"
            >
              Start a Free 7-Day Trial
            </Link>
            <p className="text-xs text-muted-foreground mt-3">
              HIPAA compliant &middot; Cancel anytime
            </p>
          </div>
        </section>

        {/* Problem */}
        <section className="space-y-4">
          <h2 className="text-3xl font-bold text-foreground">
            One of You, Two Families to Keep Track Of
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Some days you refill your dad&apos;s blood-pressure prescription on your
            lunch break, book your daughter&apos;s dentist visit from the school pickup
            line, and answer your mom&apos;s aide about last night&apos;s glucose reading —
            all before dinner. You&apos;re the one everyone calls, and you&apos;re holding
            two families&apos; worth of medical detail in your head.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            The sandwich generation doesn&apos;t get a quiet year. You&apos;re raising kids
            and caring for parents at once — two sets of doctors, two medication
            lists, two stacks of paperwork. The fix isn&apos;t trying harder to remember.
            It&apos;s one shared record for everyone you care for, that your spouse and
            siblings can see too.
          </p>
        </section>

        {/* What you can track together */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">
            Both Generations, One Account
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                title: 'Everyone on one account',
                body: 'Your kids, your parents, and you each get a profile — medications, vitals, appointments, and notes. Switch between them in a tap instead of juggling apps and notebooks.',
              },
              {
                title: 'Two medication lists, zero mix-ups',
                body: 'Your child’s allergy meds and your father’s heart medications each get their own reminders and refill alerts — so nothing slips on either side of the sandwich.',
              },
              {
                title: 'Appointments that don’t collide',
                body: 'School physicals and cardiology visits in one view, with room to note who’s driving and what the doctor said — so the next person up isn’t guessing.',
              },
              {
                title: 'Share the load',
                body: 'Invite your spouse, your siblings, or a parent’s home aide — each with the access that fits — so you’re not the only one who knows everything.',
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
          <h2 className="text-3xl font-bold text-foreground">How It Works</h2>
          <ol className="space-y-5">
            <li className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 flex gap-4">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 text-white font-bold flex items-center justify-center">1</span>
              <div>
                <h3 className="font-bold text-lg text-foreground mb-1">Add a profile for each person</h3>
                <p className="text-sm text-muted-foreground">
                  Your children and your parents, all on one account. Add
                  medications, conditions, and providers once.
                </p>
              </div>
            </li>
            <li className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 flex gap-4">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold flex items-center justify-center">2</span>
              <div>
                <h3 className="font-bold text-lg text-foreground mb-1">Invite whoever is helping</h3>
                <p className="text-sm text-muted-foreground">
                  Your spouse, a sibling across the state, a parent&apos;s home aide —
                  each gets exactly the permissions they need.
                </p>
              </div>
            </li>
            <li className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 flex gap-4">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold flex items-center justify-center">3</span>
              <div>
                <h3 className="font-bold text-lg text-foreground mb-1">Everyone sees the same timeline</h3>
                <p className="text-sm text-muted-foreground">
                  Your son&apos;s last fever, your mom&apos;s blood pressure, today&apos;s
                  doses — all in one place, no group text required.
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* Testimonial */}
        <section className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-2xl p-8 text-white">
          <p className="text-lg italic mb-4 leading-relaxed">
            &ldquo;I&apos;m raising two teenagers and helping my mother through
            chemo. I used to keep it all in a notebook I was terrified of losing.
            Now my husband and my brother can see everything I see — I finally
            feel like I&apos;m not doing it alone.&rdquo;
          </p>
          <div className="text-sm font-semibold">Dana R.</div>
          <div className="text-xs opacity-80">Sandwich-generation caregiver — two kids, one parent</div>
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
                  <span className="text-purple-600 dark:text-purple-400 text-xl leading-none group-open:rotate-45 transition-transform">+</span>
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
              <h3 className="font-bold text-foreground mb-1">Caring for an Aging Parent</h3>
              <p className="text-sm text-muted-foreground">Track medications, vitals, and appointments together — whether they live with you or across the country.</p>
            </Link>
            <Link
              href="/caregivers/new-parents"
              className="block bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-bold text-foreground mb-1">For New Parents</h3>
              <p className="text-sm text-muted-foreground">A shared baby tracker for the other end of the caregiving arc — feeds, sleep, diapers, and milestones.</p>
            </Link>
            <Link
              href="/blog/medications"
              className="block bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow md:col-span-2"
            >
              <h3 className="font-bold text-foreground mb-1">Medication Reminders for Families</h3>
              <p className="text-sm text-muted-foreground">Smart reminders, refill alerts, and missed-dose notifications across every profile — kids and parents alike.</p>
            </Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center space-y-4 pb-8">
          <h2 className="text-2xl font-bold text-foreground">
            Stop Holding Two Families in Your Head
          </h2>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            Start a free 7-day trial. Set up a profile for each person you care
            for, invite the people helping you, and let everyone work from the
            same record.
          </p>
          <Link
            href="/auth"
            className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg px-10 py-4 rounded-full shadow-2xl transition-all transform hover:scale-105"
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
