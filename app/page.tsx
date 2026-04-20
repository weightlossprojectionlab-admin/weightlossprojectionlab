import Link from 'next/link'
import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageSchema } from '@/lib/json-ld'

// Force static generation for maximum performance
export const dynamic = 'force-static'
export const revalidate = false

const HOMEPAGE_TITLE =
  'Family Health App for Caregivers — Track Aging Parents, Kids, and Pets in One Place'
const HOMEPAGE_DESCRIPTION =
  'The family health app for anyone caring for someone else. Track medications, vitals, appointments, and meals for aging parents, kids, partners, and pets — and share access with siblings, spouses, or sitters in seconds. HIPAA-compliant.'

// Use absolute title to bypass the `%s | Wellness Projection Lab` template
// defined in app/layout.tsx — the homepage title is already descriptive and
// SEO-tuned, and the appended suffix would push it past 60 characters.
export const metadata: Metadata = {
  ...buildPageMetadata({
    title: HOMEPAGE_TITLE,
    description: HOMEPAGE_DESCRIPTION,
    path: '/',
    keywords: [
      'family caregiver app',
      'medication reminder app for elderly parents',
      'track aging parent health',
      'shared family medical records',
      'caregiver health tracking',
      'family health app',
      'remote elderly monitoring',
    ],
  }),
  title: { absolute: HOMEPAGE_TITLE },
}

const HOMEPAGE_FAQ = [
  {
    question: "What is the best app to track an aging parent's medications?",
    answer:
      'A family health app lets you log every medication for every person in one place, set reminders, and share access with anyone helping out — siblings, sitters, doctors. Wellness Projection Lab does this for the whole family (parents, kids, partners, and pets) on one HIPAA-compliant platform.',
  },
  {
    question: 'How can I monitor my elderly parent\u2019s health remotely?',
    answer:
      'Remote caregiving works best when there is one shared source of truth. Wellness Projection Lab lets your parent (or their in-home caregiver) log vitals and medications, and gives you real-time visibility from your phone — no calls, texts, or guessing required.',
  },
  {
    question: 'Can multiple family members use the same account?',
    answer:
      'Yes. You can add any number of profiles (kids, parents, grandparents, pets) and invite other caregivers with fine-grained permissions — view-only, log-only, or full access.',
  },
  {
    question: 'Is Wellness Projection Lab HIPAA compliant?',
    answer:
      'Yes. Wellness Projection Lab is built as a HIPAA-compliant platform, with BAAs available for practitioners who license the platform for their practice.',
  },
  {
    question: 'Does it work for newborns and pets, not just adults?',
    answer:
      'Yes. Every profile has its own vitals, medication schedule, meal log, and appointment history — whether it\u2019s a newborn, a teenager, a grandparent, or the family dog.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'Yes — a free 7-day trial with full access. Cancel anytime.',
  },
]

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
      <JsonLd data={faqPageSchema(HOMEPAGE_FAQ)} />
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-64 h-64 mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-green-500 rounded-full opacity-10 animate-pulse"></div>
            <div className="absolute inset-8 bg-gradient-to-br from-blue-400 to-green-400 rounded-full opacity-20 flex items-center justify-center">
              <div className="text-7xl">&#x1F468;&#x200D;&#x1F469;&#x200D;&#x1F467;&#x200D;&#x1F466;</div>
            </div>
            <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
              <span className="text-3xl">&#x1F489;</span>
            </div>
            <div className="absolute bottom-8 left-4 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
              <span className="text-3xl">&#x1F9D3;</span>
            </div>
            <div className="absolute top-12 left-0 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
              <span className="text-3xl">&#x1F43E;</span>
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">
            The Family Health App for Anyone Caring for Someone Else
          </h1>
          <p className="text-xl text-muted-foreground font-sans max-w-2xl mx-auto">
            Track medications, vitals, appointments, and meals for aging parents, kids, partners, and pets — and share access with siblings, spouses, or sitters in seconds.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm pt-2">
            <span className="text-muted-foreground">Guides for:</span>
            <Link
              href="/caregivers/aging-parents"
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Aging parents
            </Link>
            <span className="text-muted-foreground">&middot;</span>
            <Link
              href="/caregivers/new-parents"
              className="font-semibold text-pink-600 dark:text-pink-400 hover:underline"
            >
              New parents
            </Link>
          </div>
        </div>

        {/* Value Props */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-4xl">&#x1F48A;</span>
            </div>
            <h3 className="font-bold text-foreground mb-2 text-lg">Medication Reminder App for the Whole Family</h3>
            <p className="text-sm text-muted-foreground">
              Never miss a dose — for a parent across town, a kid before school, or yourself. Reminders, refill alerts, and interaction flags for every person you care for.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow border-2 border-transparent hover:border-green-200 dark:hover:border-green-800">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <span className="text-4xl">&#x1F4CB;</span>
            </div>
            <h3 className="font-bold text-foreground mb-2 text-lg">Remote Monitoring for Aging Parents</h3>
            <p className="text-sm text-muted-foreground">
              See mom&apos;s blood pressure, weight, and meds from your phone — whether she&apos;s upstairs or in another state. She logs once; you both stay informed.
            </p>
            <Link
              href="/caregivers/aging-parents"
              className="inline-block mt-3 text-sm font-semibold text-green-700 dark:text-green-400 hover:underline"
            >
              A guide for caring for aging parents &rarr;
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow border-2 border-transparent hover:border-purple-200 dark:hover:border-purple-800">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-4xl">&#x1F91D;</span>
            </div>
            <h3 className="font-bold text-foreground mb-2 text-lg">Shared Access Without the Group Text</h3>
            <p className="text-sm text-muted-foreground">
              Invite a sibling, spouse, or sitter with the exact permissions they need. No more screenshots of pill bottles or &ldquo;what did the doctor say?&rdquo; threads.
            </p>
          </div>
        </div>

        {/* Social Proof — Testimonials */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl shadow-2xl p-8 text-white">
          <h2 className="text-center text-2xl font-bold mb-6">Trusted by Families Like Yours</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-5">
              <p className="text-sm mb-3 italic">"I manage my toddler, my mom with diabetes, and our dog's vet schedule. WPL replaced 4 apps."</p>
              <div className="text-sm font-semibold">Sarah M.</div>
              <div className="text-xs opacity-80">Working mom, 3 family profiles</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-5">
              <p className="text-sm mb-3 italic">"My wife and I can both see our dad's vitals and medication schedule. It's been a lifesaver."</p>
              <div className="text-sm font-semibold">Marcus T.</div>
              <div className="text-xs opacity-80">Family caregiver</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-5">
              <p className="text-sm mb-3 italic">"The AI meal logging saves me 20 minutes a day. I actually track consistently now."</p>
              <div className="text-sm font-semibold">Diana L.</div>
              <div className="text-xs opacity-80">Busy parent, 2 kids</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Built for Families Who Care</h2>
          <Link
            href="/auth"
            className="inline-block bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-bold text-xl px-12 py-5 rounded-full shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105"
            aria-label="Create your family health hub"
          >
            Create Your Family Health Hub
          </Link>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Free 7-day trial. Cancel anytime. HIPAA compliant.
          </p>
        </div>

        {/* Trust Badges */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="text-lg">&#x1F3E5;</span> HIPAA Compliant
            </span>
            <span className="flex items-center gap-1">
              <span className="text-lg">&#x1F46A;</span> Family Sharing Built In
            </span>
            <span className="flex items-center gap-1">
              <span className="text-lg">&#x1F4F1;</span> Works on Any Device
            </span>
          </div>
        </div>

        {/* FAQ */}
        <section aria-labelledby="homepage-faq" className="space-y-6">
          <h2 id="homepage-faq" className="text-center text-2xl font-bold text-foreground">
            Caregiver Questions, Answered
          </h2>
          <div className="space-y-3">
            {HOMEPAGE_FAQ.map((item) => (
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

        {/* For Practitioners */}
        <div className="text-center pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-muted-foreground">
            Are you a nurse or care provider?{' '}
            <Link href="/franchise" className="text-blue-600 dark:text-blue-400 font-medium underline hover:no-underline">
              License our platform &rarr;
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
