import Link from 'next/link'
import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageSchema, breadcrumbListSchema } from '@/lib/json-ld'

export const dynamic = 'force-static'
export const revalidate = false

const PAGE_TITLE =
  'How to Care for an Aging Parent Remotely — Medication, Vitals, and Appointment Tracking'
const PAGE_DESCRIPTION =
  'A practical guide to caring for an aging parent — whether they live with you, across town, or in another state. Track medications, vitals, and appointments together, and share access with siblings, doctors, and in-home caregivers.'

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    path: '/caregivers/aging-parents',
    keywords: [
      'how to care for aging parents remotely',
      'remote elderly monitoring app',
      'long distance caregiving',
      'aging parent medication tracker',
      'caregiver app for elderly parents',
      'app to monitor elderly parent health',
      'family caregiver coordination',
    ],
  }),
  title: { absolute: PAGE_TITLE },
}

const FAQ = [
  {
    question: 'How can I keep track of my aging parent\u2019s health from far away?',
    answer:
      'The most reliable approach is a single shared record your parent (or their in-home caregiver) updates, that you and your siblings can view from anywhere. Wellness Projection Lab gives every family member a profile with medications, vitals, appointments, and notes — so you can see what was logged today without a phone call.',
  },
  {
    question: 'What is the best app for long-distance caregiving?',
    answer:
      'Look for three things: (1) multi-person profiles on one account, (2) shared access with permission levels for siblings and in-home caregivers, and (3) medication reminders that work without your parent having to learn a complicated app. Wellness Projection Lab is built around these three requirements.',
  },
  {
    question: 'Can my siblings and I both access the same information?',
    answer:
      'Yes. You can invite any number of family members or caregivers with fine-grained permissions — view-only for extended family, log-only for an in-home aide, full access for a primary caregiver or spouse.',
  },
  {
    question: 'What about my parent\u2019s doctor or home health aide?',
    answer:
      'You can share a read-only view with providers, or add a home health aide as a logger so their notes and vitals land in the same timeline you see.',
  },
  {
    question: 'Is my parent\u2019s health information secure?',
    answer:
      'Yes. Wellness Projection Lab is HIPAA-compliant, with BAAs available for practitioners who license the platform. Access controls mean only people you invite can see your parent\u2019s information.',
  },
  {
    question: 'What if my parent isn\u2019t comfortable with technology?',
    answer:
      'Many families set up Wellness Projection Lab so a spouse, adult child, or in-home caregiver logs on behalf of the aging parent. The person being cared for doesn\u2019t have to use the app themselves for the rest of the family to benefit.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes — a free 7-day trial with full access. Cancel anytime.',
  },
]

const BREADCRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Caregivers', path: '/caregivers' },
  { name: 'Aging Parents', path: '/caregivers/aging-parents' },
]

export default function AgingParentsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            A guide for adult children and family caregivers
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            How to Care for an Aging Parent — Whether They Live With You or 1,000 Miles Away
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A shared, simple way to track medications, vitals, and appointments for
            the parent you love — and to keep siblings, doctors, and in-home
            caregivers on the same page without another group text.
          </p>
          <div className="pt-4">
            <Link
              href="/auth"
              className="inline-block bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-bold text-lg px-10 py-4 rounded-full shadow-2xl transition-all transform hover:scale-105"
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
            The Quiet Job of Caring for an Aging Parent
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            You&apos;re on a call when mom&apos;s pharmacy texts about a refill. Your
            sister drove her to a cardiology appointment last Tuesday and you never
            got the note. The home aide changed shifts and nobody can remember
            which blood-pressure reading was today&apos;s. You keep a mental list of
            medications that you&apos;re never quite sure is current.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            Caregiving for an aging parent is rarely one big emergency. It&apos;s a
            hundred small pieces of information that live in different phones,
            different heads, and different paper bags. The fix isn&apos;t another
            spreadsheet — it&apos;s one shared source of truth that everyone
            helping can see.
          </p>
        </section>

        {/* What you can track together */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">
            What You Can Track Together
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                title: 'Every medication, every dose',
                body: 'A complete medication list with reminders, refill alerts, and interaction flags. When your parent takes a dose, you can see it. When they miss one, you can see that too.',
              },
              {
                title: 'Vitals that tell a story',
                body: 'Blood pressure, weight, glucose, oxygen — logged in one place so a trend is obvious instead of buried in a dozen text threads.',
              },
              {
                title: 'Appointments, with context',
                body: 'Who drove them, what the doctor said, what changed. Anyone with access can add a note after a visit — so the next sibling up to bat isn\u2019t guessing.',
              },
              {
                title: 'Meals and hydration',
                body: 'For parents where appetite, nutrition, or fluid intake matter, a shared log beats \u201cdid you remember to eat?\u201d every afternoon.',
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

        {/* How long-distance caregiving works */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">
            How It Works for Long-Distance Caregivers
          </h2>
          <ol className="space-y-5">
            <li className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 flex gap-4">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold flex items-center justify-center">1</span>
              <div>
                <h3 className="font-bold text-lg text-foreground mb-1">Create a profile for your parent</h3>
                <p className="text-sm text-muted-foreground">
                  Add medications, medical conditions, and providers once.
                  Everything downstream keys off this.
                </p>
              </div>
            </li>
            <li className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 flex gap-4">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-green-500 text-white font-bold flex items-center justify-center">2</span>
              <div>
                <h3 className="font-bold text-lg text-foreground mb-1">Invite whoever is helping</h3>
                <p className="text-sm text-muted-foreground">
                  A sibling three states away. A spouse who lives nearby. A home
                  health aide three days a week. Each gets exactly the
                  permissions they need.
                </p>
              </div>
            </li>
            <li className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 flex gap-4">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-700 text-white font-bold flex items-center justify-center">3</span>
              <div>
                <h3 className="font-bold text-lg text-foreground mb-1">Everyone sees the same truth</h3>
                <p className="text-sm text-muted-foreground">
                  Medication logged this morning? You&apos;ll know. Blood pressure
                  reading at the last visit? It&apos;s there. No more &ldquo;did anyone
                  call the pharmacy?&rdquo; at 9 p.m.
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* Testimonial */}
        <section className="bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl shadow-2xl p-8 text-white">
          <p className="text-lg italic mb-4 leading-relaxed">
            &ldquo;My sister and I live in different states. Before Wellness
            Projection Lab we spent an hour every Sunday on the phone piecing
            together what had happened to dad that week. Now we just both look at
            the same timeline.&rdquo;
          </p>
          <div className="text-sm font-semibold">Marcus T.</div>
          <div className="text-xs opacity-80">Family caregiver, two siblings, one aging parent</div>
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
                  <span className="text-blue-600 dark:text-blue-400 text-xl leading-none group-open:rotate-45 transition-transform">+</span>
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
              href="/blog/medications"
              className="block bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-bold text-foreground mb-1">Medication Reminders for Families</h3>
              <p className="text-sm text-muted-foreground">Smart reminders, refill alerts, and missed-dose notifications across every profile.</p>
            </Link>
            <Link
              href="/blog/vitals-tracking"
              className="block bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-bold text-foreground mb-1">Vitals Tracking</h3>
              <p className="text-sm text-muted-foreground">Blood pressure, weight, glucose — logged once, visible to everyone helping.</p>
            </Link>
            <Link
              href="/caregivers/new-parents"
              className="block bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow md:col-span-2"
            >
              <h3 className="font-bold text-foreground mb-1">For New Parents: The Shared Baby Tracker</h3>
              <p className="text-sm text-muted-foreground">The same playbook, for the other end of the caregiving arc &mdash; feeds, sleep, diapers, and milestones.</p>
            </Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center space-y-4 pb-8">
          <h2 className="text-2xl font-bold text-foreground">
            One Source of Truth for the Family
          </h2>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            Start a free 7-day trial. Set up your parent&apos;s profile in a few
            minutes, invite the people helping you, and stop holding it all in
            your head.
          </p>
          <Link
            href="/auth"
            className="inline-block bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-bold text-lg px-10 py-4 rounded-full shadow-2xl transition-all transform hover:scale-105"
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
