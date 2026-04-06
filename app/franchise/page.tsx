/**
 * Franchise Marketing / Sales Page
 *
 * Top-of-funnel page for nurses, wellness coaches, concierge doctors,
 * home care agencies, and patient advocates considering licensing the
 * WPL platform under their own brand.
 *
 * The application form lives at /franchise/apply.
 */

import Link from 'next/link'
import type { Metadata } from 'next'
import { CheckIcon } from '@heroicons/react/24/outline'
import { FRANCHISE_PLANS, SETUP_FEE_USD, ANNUAL_DISCOUNT_PCT } from '@/lib/franchise-plans'

export const dynamic = 'force-static'
export const revalidate = false

const CURRENT_YEAR = new Date().getFullYear()

export const metadata: Metadata = {
  title: 'License Wellness Projection Lab — Launch Your Branded Health Practice',
  description:
    'White-label the HIPAA-compliant family health platform under your own brand. AI-powered tracking, your subdomain, your colors, your clients. Launch in 48 hours.',
}

const PROBLEMS = [
  {
    title: 'Drowning in spreadsheets',
    body:
      'Tracking client vitals, meds, appointments and meals across notebooks, group texts, and shared docs. Nothing connects, nothing scales.',
  },
  {
    title: 'No HIPAA-compliant tools',
    body:
      "Off-the-shelf consumer apps aren't BAA-eligible. Building your own would cost six figures and a year you don't have.",
  },
  {
    title: "Can't grow past 10 clients",
    body:
      'Your hands-on care is brilliant — but every new family means more paperwork, more late nights, and a hard ceiling on revenue.',
  },
]

const FEATURES = [
  'AI-powered meal logging and nutrition coaching',
  'Vital tracking — BP, glucose, weight, oxygen, more',
  'Medication management with refill reminders',
  'Family sharing across caregivers, spouses, doctors',
  'Secure document storage for medical records',
  'Branded subdomain — yourname.wellnessprojectionlab.com',
  'Appointment scheduling and reminders',
  'AI-generated health reports',
  'HIPAA-compliant infrastructure with BAA',
  'Email + chat support',
]

const STEPS = [
  { num: 1, title: 'Apply', body: 'Fill out a 5-minute application with your business details and pick a plan.' },
  { num: 2, title: 'Review', body: 'We review your application within 48 hours and send a Stripe payment link.' },
  { num: 3, title: 'Pay setup fee', body: `One-time $${SETUP_FEE_USD.toLocaleString()} setup fee covers white-label config and onboarding.` },
  { num: 4, title: 'Go live', body: 'Your branded subdomain activates automatically. Invite staff and onboard families.' },
]

const FAQ = [
  {
    q: 'Is the platform really HIPAA compliant?',
    a: 'Yes — we sign a Business Associate Agreement (BAA) with every franchise partner. All data is encrypted at rest and in transit, hosted on SOC 2 Type II certified infrastructure.',
  },
  {
    q: 'Who owns the client data?',
    a: 'You do. WPL provides the infrastructure. Upon termination, all your data is exported and returned to you within 30 days per the Data Ownership Policy.',
  },
  {
    q: 'How much customization do I get?',
    a: 'Your logo, primary brand colors, company name, support email, and a dedicated subdomain. Your clients see your brand throughout.',
  },
  {
    q: 'What if I need to cancel?',
    a: 'Month-to-month service with 30-day cancellation notice. No long-term contracts. Annual billing is available at a 15% discount if you prefer.',
  },
  {
    q: "What's the support SLA?",
    a: '99.9% uptime guarantee. Email support on Starter, priority support on Professional, dedicated account manager on Enterprise. If we fall below 99.9% in any calendar month, you receive a prorated credit.',
  },
  {
    q: 'Can I add seats later?',
    a: "Yes — add staff seats anytime from your admin dashboard. Each additional seat is billed at your plan's per-seat rate.",
  },
]

export default function FranchiseMarketingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-block px-4 py-1 rounded-full bg-white/10 text-sm font-medium border border-white/20">
            For nurses, wellness coaches & care providers
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Launch Your Branded Digital Health Practice in 48 Hours
          </h1>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto">
            White-label the HIPAA-compliant family health platform under your own brand.
            Your subdomain. Your colors. Your clients. Zero infrastructure to build.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link
              href="/franchise/apply"
              className="px-8 py-4 bg-white text-purple-700 rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition-transform"
            >
              Apply Now
            </Link>
            <a
              href="#pricing"
              className="px-8 py-4 border-2 border-white/40 rounded-xl font-semibold text-lg hover:bg-white/10 transition-colors"
            >
              See Pricing
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm pt-6">
            <span className="flex items-center gap-2"><CheckIcon className="h-5 w-5 text-green-300" /> HIPAA Compliant</span>
            <span className="flex items-center gap-2"><CheckIcon className="h-5 w-5 text-green-300" /> White-Label</span>
            <span className="flex items-center gap-2"><CheckIcon className="h-5 w-5 text-green-300" /> AI-Powered</span>
            <span className="flex items-center gap-2"><CheckIcon className="h-5 w-5 text-green-300" /> Launch in 48 Hours</span>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              The infrastructure problem every solo provider hits
            </h2>
            <p className="text-lg text-gray-600">
              You&apos;re a great caregiver. You shouldn&apos;t also have to be a software company.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PROBLEMS.map(p => (
              <div key={p.title} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Your platform, our infrastructure
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12">
            Get the complete WPL platform — vitals, meds, meals, AI coaching, family sharing —
            served on your own subdomain, branded with your name and colors.
            Families see your brand, not ours.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-left max-w-3xl mx-auto">
            {FEATURES.map(f => (
              <div key={f} className="flex items-start gap-3">
                <CheckIcon className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              From application to live in 4 steps
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {STEPS.map(s => (
              <div key={s.num} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm relative">
                <div className="absolute -top-4 -left-2 h-10 w-10 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow">
                  {s.num}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 mt-2">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-600">
              All plans include a one-time <strong>${SETUP_FEE_USD.toLocaleString()}</strong> setup fee.
              Save {ANNUAL_DISCOUNT_PCT}% with annual billing.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FRANCHISE_PLANS.map(plan => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 p-8 ${
                  plan.popular
                    ? 'border-purple-500 shadow-xl md:scale-105'
                    : 'border-gray-200 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-600 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                <div className="text-4xl font-bold text-purple-700 mb-1">
                  ${plan.monthlyBase}
                  <span className="text-base font-normal text-gray-500">/mo</span>
                </div>
                <div className="text-sm text-gray-500 mb-6">+${plan.perSeat}/seat/mo</div>
                <ul className="space-y-3 text-sm text-gray-700 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {plan.maxSeats === -1 ? 'Unlimited staff seats' : `Up to ${plan.maxSeats} staff seats`}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {plan.maxClients === -1 ? 'Unlimited client families' : `Up to ${plan.maxClients} client families`}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {plan.ai}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {plan.support}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                    Full white-label branding
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                    HIPAA compliant + BAA
                  </li>
                </ul>
                <Link
                  href="/franchise/apply"
                  className={`block text-center py-3 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Apply for {plan.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TODO: real testimonials — placeholder copy below */}
      <section className="py-16 px-4 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Built for providers like you</h2>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            {[
              { name: 'Maria R., RN', title: 'Solo home care nurse', quote: 'I used to juggle three apps and a notebook. Now everything for my 30 families lives in one place — branded as my practice.' },
              { name: 'James T.', title: 'Wellness coach', quote: 'My clients used to text me their meals. Now they log them in my app, and I get AI summaries every Monday morning.' },
              { name: 'Dr. Patel', title: 'Concierge physician', quote: 'The HIPAA compliance and BAA were non-negotiable. WPL handled both before I even asked.' },
            ].map(t => (
              <div key={t.name} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-700 italic mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                <div className="text-xs text-gray-500">{t.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group bg-white border border-gray-200 rounded-lg p-5">
                <summary className="cursor-pointer font-semibold text-gray-900 list-none flex items-center justify-between">
                  {q}
                  <span className="text-purple-500 group-open:rotate-180 transition-transform">&#x25BC;</span>
                </summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-700 to-indigo-800 text-white">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to launch?</h2>
          <p className="text-lg text-purple-100">
            Your branded platform can be live within 48 hours of application approval.
          </p>
          <Link
            href="/franchise/apply"
            className="inline-block px-10 py-4 bg-white text-purple-700 rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition-transform"
          >
            Start Your Application
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-4">
        <div className="max-w-5xl mx-auto text-center text-sm space-y-3">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/franchise-agreement" className="hover:text-white">Franchise Agreement</Link>
            <Link href="/baa" className="hover:text-white">BAA</Link>
            <Link href="/data-policy" className="hover:text-white">Data Policy</Link>
            <Link href="/" className="hover:text-white">Main site</Link>
          </div>
          <p>&copy; {CURRENT_YEAR} Wellness Projection Lab. HIPAA Compliant | SOC 2 Type II.</p>
        </div>
      </footer>
    </main>
  )
}
