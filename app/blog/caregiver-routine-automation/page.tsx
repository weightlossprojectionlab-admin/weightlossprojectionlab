import Link from 'next/link'
import {
  BellAlertIcon,
  CalendarDaysIcon,
  HeartIcon,
  ShieldCheckIcon,
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

const PAGE_SLUG = 'caregiver-routine-automation'
const PAGE_TITLE = 'Compliance & Peace of Mind: Automating Your Caregiver Routine'
const DATE_PUBLISHED = '2026-07-18T09:20:00-05:00'
const DATE_MODIFIED = '2026-07-18T09:20:00-05:00'

const author = getBlogAuthor('founder')

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I stop forgetting if I gave a medication?',
    answer:
      'Stop relying on memory and use a shared log. When each dose is checked off in one place, you get immediate confirmation that the morning pill already happened — which ends the "did I already give that?" stress and prevents a second caregiver from doubling it.',
  },
  {
    question: 'How does routine automation make caregiving safer?',
    answer:
      'It replaces memory-dependent tasks with system-backed reminders. Once the schedule is automated, the plan no longer depends on you being awake or in the room — reminders fire consistently, which helps prevent missed doses, skipped vitals, and forgotten appointments.',
  },
  {
    question: 'What does "compliance" mean in caregiving?',
    answer:
      'Here it simply means sticking to the plan — taking medications on time, logging vitals when asked, and keeping appointments. Good compliance is what keeps a condition stable, and it is much easier with reminders than with memory alone.',
  },
  {
    question: 'Why are reminders better than a good memory?',
    answer:
      'Memory fails exactly when you are most stretched — during a bad night, a busy morning, or a stressful week. Automatic reminders do not get tired. They fire at the same time every day, whether you remember or not.',
  },
  {
    question: 'What should I automate first?',
    answer:
      'Start with medications, because the timing matters most and mistakes carry the most risk. Once that is running, add vital-sign check-ins and appointment reminders. Build the routine one layer at a time.',
  },
  {
    question: 'Is it private to send health reminders to other caregivers?',
    answer:
      'It should be. Look for HIPAA-aligned tools that encrypt your data and let you control who sees what. You decide which caregivers get which reminders, so the right person is nudged without oversharing.',
  },
]

const CONFIG: BlogPostConfig = {
  slug: PAGE_SLUG,
  title: PAGE_TITLE,
  metaTitle: 'Caregiver Routine Automation: Peace of Mind for Your Daily Schedule',
  description:
    'Stop relying on your memory to track medications and daily tasks. Discover how to automate your caregiving routine and create shared accountability for a calmer, safer household.',
  keywords:
    'caregiver routine automation, medication management for caregivers, automated caregiving dashboard, sharing caregiving duties, how to track elderly parent medications, delegating caregiving tasks, vital sign reminders, medication compliance, appointment reminders',
  datePublished: DATE_PUBLISHED,
  dateModified: DATE_MODIFIED,
  appUrl: '/patients',
  appDescription: 'Automatic, HIPAA-aligned reminders for medications, vitals, and appointments.',
  faqItems: FAQ_ITEMS,
}

export const metadata = buildBlogPostMetadata(CONFIG)

export default function CaregiverRoutineAutomationPage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={buildBlogPostJsonLd(CONFIG)} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <div className="mb-8">
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Caregiver Guide</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">{PAGE_TITLE}</h1>
          <p className="text-xl text-muted-foreground mb-6">
            The most reliable caregiver is not the one with the best memory — it is the one who set up a system that
            remembers for them. Here is how to build that system.
          </p>
          <AuthorByline author={author} datePublished={DATE_PUBLISHED} dateModified={DATE_MODIFIED} />
        </div>

        <div className="mb-10">
          <SeriesNav slug={PAGE_SLUG} variant="top" />
        </div>

        {/* Definition */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-3">Why memory is the weakest link</h2>
          <p className="text-muted-foreground leading-relaxed">
            Every caregiving routine has the same fragile part: a person remembering to do the right thing at the right
            time, day after day. That works until the day it does not — a rough night, a packed morning, an off week.
            Automating the routine takes the pressure off your memory and puts it on a system that never has a bad day.
          </p>
        </section>

        {/* The problem */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">The "forgetting" factor</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <ProblemCard
              icon={<BellAlertIcon className="w-8 h-8 text-amber-500" />}
              title="Missed or doubled doses"
              description="Without a clear record, it is easy to skip a dose — or give it twice because you were not sure it was taken."
            />
            <ProblemCard
              icon={<HeartIcon className="w-8 h-8 text-amber-500" />}
              title="Vitals logged 'when I remember'"
              description="Blood pressure or blood sugar checks that only happen sometimes make trends impossible to see."
            />
            <ProblemCard
              icon={<CalendarDaysIcon className="w-8 h-8 text-amber-500" />}
              title="Appointments that sneak up"
              description="A visit noticed the night before means no ride arranged, no questions written, no records gathered."
            />
            <ProblemCard
              icon={<ShieldCheckIcon className="w-8 h-8 text-amber-500" />}
              title="It all rests on one person"
              description="When only you get the reminders, the whole routine stops the moment you are unavailable."
            />
          </div>
        </section>

        {/* The method */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Build a simple "stick to the plan" workflow</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            You do not need a complicated setup. Turn the routine into a few automatic reminders, add the caregivers
            who should get them, and let the system carry it.
          </p>
          <ol className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 p-0">
            <HowToStep step={1} label="Start with medications" description="Set each medicine's schedule so a reminder fires at the right time, every time." />
            <HowToStep step={2} label="Add vital check-ins" description="Choose which vitals to track and how often, so trends show up instead of gaps." />
            <HowToStep step={3} label="Put appointments on the calendar" description="Add visits with reminders early enough to arrange a ride and prep questions." />
            <HowToStep step={4} label="Share the reminders" description="Pick which caregivers get which nudges, so the routine never depends on one person." />
          </ol>
        </section>

        {/* Privacy angle */}
        <section className="mb-16">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-2">On privacy</div>
            <p className="text-muted-foreground leading-relaxed">
              Health reminders travel between the people you trust, so privacy matters. Choose a HIPAA-aligned tool
              that encrypts your data in transit and at rest and lets you control who sees what. Automation should make
              care easier <em>and</em> keep sensitive information in the right hands.{' '}
              <Link href="/security" className="underline">See how we handle security.</Link>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <FaqAccordion
          items={FAQ_ITEMS}
          intro="What caregivers ask about turning the daily routine into reminders that run themselves."
        />

        {/* Series + author */}
        <div className="mb-10">
          <SeriesNav slug={PAGE_SLUG} variant="bottom" />
        </div>
        <div className="mb-16">
          <AuthorBio author={author} />
        </div>

        {/* CTA → the actual feature */}
        <CtaBand
          title="Let the routine remember for you"
          subtitle="Set up medication, vitals, and appointment reminders for each person you care for — and share them with the caregivers who help."
          primaryHref="/patients"
          primaryLabel="Set Up Care Reminders"
        />

        <p className="text-center text-sm text-muted-foreground mt-8">
          Educational information for caregivers — not medical advice. Always work with qualified healthcare providers
          for medical decisions.
        </p>
      </main>
    </div>
  )
}
