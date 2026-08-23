import type { Metadata } from 'next'
import Link from 'next/link'
import { buildPageMetadata } from '@/lib/seo'
import { faqPageSchema, breadcrumbListSchema } from '@/lib/json-ld'
import { JsonLd } from '@/components/seo/JsonLd'

const TITLE =
  'Family Care Coordination for Serious Illness & End-of-Life | Wellness Projection Lab'
const DESCRIPTION =
  'A compassionate companion for families navigating serious illness. Keep observation notes, schedules, medications, and advance directives in one secure, HIPAA-aligned place.'
const PATH = '/caregivers/serious-illness'

export const dynamic = 'force-static'
export const revalidate = false

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: PATH,
    keywords: [
      'serious illness care coordination',
      'end of life family app',
      'caregiver observation notes',
      'hipaa aligned family care',
    ],
  }),
  title: { absolute: TITLE },
}

const FAQS = [
  {
    question: 'What is the difference between palliative care and hospice care?',
    answer:
      'Palliative care focuses on comfort and pain relief at any stage of a serious illness; hospice provides comfort care when life expectancy is measured in months. Wellness Projection Lab keeps appointments, vitals, medications, and daily notes for either path in one shared place.',
  },
  {
    question: 'How are advance directives, living wills, and DNR orders stored?',
    answer:
      'Advance directives and emergency information — including living-will and DNR wishes — are kept alongside emergency contacts and care notes, so approved family members and advocates can reach them quickly.',
  },
  {
    question: 'What is advance care planning (ACP), and how does the platform support it?',
    answer:
      'Advance care planning means deciding, ahead of time, what care you would want if you could not speak for yourself. Wellness Projection Lab keeps your care preferences, advance directives, and emergency contacts together in one secure place.',
  },
  {
    question: 'How do we manage advanced illness and care transitions?',
    answer:
      'As a condition changes and care moves between home, specialists, and facilities, the platform keeps appointments, medications, and observation notes coordinated across your family circle.',
  },
  {
    question: 'How does Wellness Projection Lab keep family members on the same page?',
    answer:
      'Observation notes, the day’s agenda, appointments, tasks, and medications sit in one secure place, so caregivers aren’t repeating the same update across a handful of group chats.',
  },
  {
    question: 'Are our family notes and personal data secure?',
    answer:
      'Yes. Wellness Projection Lab runs on a HIPAA-aligned architecture with strict role-based permissions. Your data is private, never sold, and fully controlled by the primary caregivers.',
  },
  {
    question: 'Do extended family members need to download an app store app?',
    answer:
      'No app store download is required for relatives. You can coordinate across devices with secure web and mobile access.',
  },
  {
    question: 'How are memorial and legacy features handled?',
    answer:
      'Memorial and legacy tools are on the horizon as a gentle, opt-in mode shift. The platform anchors on everyday care coordination first.',
  },
]

export default function SeriousIllnessLandingPage() {
  const breadcrumbs = breadcrumbListSchema([
    { name: 'Home', path: '/' },
    { name: 'Caregivers', path: '/caregivers' },
    { name: 'Serious Illness', path: PATH },
  ])
  const faqSchema = faqPageSchema(FAQS)

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <JsonLd data={[breadcrumbs, faqSchema]} />

      {/* Hero */}
      <section className="relative px-6 pt-16 pb-12 md:pt-24 md:pb-16 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-medium text-purple-700 bg-purple-50 rounded-full shadow-sm">
          Compassionate family care coordination
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6">
          A companion for families coordinating serious illness care.
        </h1>
        <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
          Keep appointments, notes, medications, and advance directives in one secure place — so
          everyone caring for your loved one stays on the same page, without living in a group chat.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth"
            className="w-full sm:w-auto px-8 py-3 text-base font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition shadow-sm"
          >
            Get started free
          </Link>
          <span className="text-xs text-slate-500">No app store download required</span>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="px-6 py-12 bg-slate-50 border-t border-b border-slate-100">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Appointments &amp; schedule</h3>
            <p className="text-slate-600 text-sm">
              Visit dates, locations, tasks, and medications in one shared place, so everyone knows
              who is covering what.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Per-profile notes</h3>
            <p className="text-slate-600 text-sm">
              Log changes in pain, breathing, mood, or appetite with a timestamp, tied directly to the
              person being cared for.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Intentional permissions</h3>
            <p className="text-slate-600 text-sm">
              Primary caregivers approve relatives, assign roles, and control exactly what each family
              member can see and do.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-slate-900 mb-10">
          Frequently asked questions
        </h2>
        <div className="space-y-6">
          {FAQS.map((faq, index) => (
            <div key={index} className="border-b border-slate-200 pb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{faq.question}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-16 bg-purple-900 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Bring clarity to your care journey today</h2>
          <p className="text-purple-200 mb-8 text-sm md:text-base">
            Secure, HIPAA-aligned coordination that keeps your family connected and supported through
            every stage of care.
          </p>
          <Link
            href="/auth"
            className="inline-block px-8 py-3 text-base font-medium text-purple-900 bg-white rounded-lg hover:bg-purple-50 transition shadow-sm"
          >
            Start coordinating now
          </Link>
        </div>
      </section>
    </main>
  )
}
