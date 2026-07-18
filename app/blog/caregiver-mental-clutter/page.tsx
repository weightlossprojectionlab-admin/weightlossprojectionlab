import Link from 'next/link'
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClockIcon,
  MoonIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'
import { JsonLd } from '@/components/seo/JsonLd'
import { type FAQItem } from '@/lib/json-ld'
import { buildBlogPostMetadata, buildBlogPostJsonLd, type BlogPostConfig } from '@/lib/blog-post'
import { getBlogAuthor } from '@/lib/blog-authors'
import { AuthorByline, AuthorBio } from '@/components/blog/AuthorByline'
import { SeriesNav } from '@/components/blog/SeriesNav'
import { FaqAccordion } from '@/components/blog/FaqAccordion'
import { CtaBand } from '@/components/blog/CtaBand'
import { KeyTakeaway } from '@/components/blog/KeyTakeaway'
import { ProblemCard, HowToStep } from '@/components/blog/cards'

const PAGE_SLUG = 'caregiver-mental-clutter'
const PAGE_TITLE = "Why Mental Clutter Is a Caregiver's Biggest Enemy"
const PAGE_DESCRIPTION =
  'Holding every medication, supply, and appointment in your head is exhausting — and easy to get wrong. Here is why caregiver mental clutter builds up, and how one shared command center clears it.'
const DATE_PUBLISHED = '2026-07-18T09:00:00-05:00'
const DATE_MODIFIED = '2026-07-18T09:00:00-05:00'

const author = getBlogAuthor('founder')

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What is caregiver mental clutter?',
    answer:
      'Caregiver mental clutter is the constant mental load of remembering everything for someone else — their medications, doses, appointments, supplies, and what the doctor said. Because it all lives in your head, it never turns off, and small things slip through.',
  },
  {
    question: 'Why do pen-and-paper and separate apps make it worse?',
    answer:
      'Notes and separate apps do not talk to each other, and usually only one person can see them. So the same information gets copied in three places, gets out of date, and the moment you are not around, no one else knows what is going on.',
  },
  {
    question: 'What is a "care command center"?',
    answer:
      'It is one shared place where a person’s medications, vitals, appointments, and supplies all live together — visible to everyone you invite. Instead of remembering it all, you look it up, and so can the people helping you.',
  },
  {
    question: 'Why do I feel so overwhelmed by caregiving?',
    answer:
      'Because the mental load is cumulative and invisible. You are holding dozens of small, important details for someone else, all day, with no off switch. Feeling overwhelmed is not a personal failing — it is the natural result of tracking too much from memory. Moving those details into one shared place is what lifts the weight.',
  },
  {
    question: 'How do I share caregiving duties with siblings?',
    answer:
      'The hard part is not willingness — it is visibility. Siblings cannot help with what they cannot see. Put the plan (medications, vitals, appointments, supplies) in one shared command center and invite them, so anyone can check what is done and pick up a task without a dozen texts. Shared information is what makes shared duties possible.',
  },
  {
    question: 'Do I have to enter everything at once?',
    answer:
      'No. Start with one person and the one thing that stresses you most — usually medications. Once that feels lighter, add the next piece. A little structure beats a perfect system you never finish.',
  },
]

const CONFIG: BlogPostConfig = {
  slug: PAGE_SLUG,
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords:
    'caregiver mental clutter, caregiver mental load, caregiver brain fog, caregiver burnout symptoms, why do I feel overwhelmed by caregiving, how to share caregiving duties with siblings, shared family health dashboard, family care coordination app, how to organize care for aging parents, delegating caregiving tasks',
  datePublished: DATE_PUBLISHED,
  dateModified: DATE_MODIFIED,
  appUrl: '/dashboard',
  appDescription: 'A shared family health command center for caregivers.',
  faqItems: FAQ_ITEMS,
}

export const metadata = buildBlogPostMetadata(CONFIG)

export default function CaregiverMentalClutterPage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={buildBlogPostJsonLd(CONFIG)} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <div className="mb-8">
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Caregiver Guide</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">{PAGE_TITLE}</h1>
          <p className="text-xl text-muted-foreground mb-6">
            If your brain feels like 40 browser tabs are open, you are not disorganized — you are carrying too much
            at once. Here is why that happens, and how to set it down.
          </p>
          <AuthorByline author={author} datePublished={DATE_PUBLISHED} dateModified={DATE_MODIFIED} />
        </div>

        <div className="mb-10">
          <KeyTakeaway>
            Caregiver mental clutter comes from holding every medication, supply, and appointment
            in your head. The fix is a single, <strong>shared</strong> care command center — so you
            look things up instead of remembering them, and the plan no longer depends on you being
            awake.
          </KeyTakeaway>
        </div>

        <div className="mb-10">
          <SeriesNav slug={PAGE_SLUG} variant="top" />
        </div>

        {/* Definition (snippet-extractable) */}
        <section className="mb-12 prose-blog">
          <h2 className="text-2xl font-bold text-foreground mb-3">What is caregiver mental clutter?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Caregiver mental clutter is the never-ending job of remembering everything for someone else: which pill
            they take and when, what the doctor changed last week, whether you are running low on supplies, and which
            appointment is coming up. Because it all lives in your head, your mind never fully clocks out — and when
            you are tired, small but important things slip.
          </p>
        </section>

        {/* The problem */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">The hidden weight you are carrying</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />}
              title="The 'did I already give that?' moment"
              description="You pause with the pill bottle in your hand, unsure if the morning dose already happened. Guessing is stressful — and risky."
            />
            <ProblemCard
              icon={<ArrowPathIcon className="w-8 h-8 text-amber-500" />}
              title="Buying things you already have"
              description="You grab another box of gauze or a special-diet item just in case — and find two more at home. Money and effort, wasted."
            />
            <ProblemCard
              icon={<MoonIcon className="w-8 h-8 text-amber-500" />}
              title="The 2 a.m. worry loop"
              description="You lie awake running the list: refill the prescription, call the office, ask about that new symptom. Rest never comes."
            />
            <ProblemCard
              icon={<ClockIcon className="w-8 h-8 text-amber-500" />}
              title="Decision fatigue by noon"
              description="Every small choice pulls from the same tank. By midday you are drained before the hard parts of the day even start."
            />
          </div>
        </section>

        {/* Why the usual tools fail */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Why notebooks and scattered apps make it worse</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-4">
            Most caregivers cope with a mix of sticky notes, a notebook, a calendar, and a couple of apps. The problem
            is not effort — it is that none of these <strong>talk to each other</strong>. The same information ends up
            copied in three places, and two of them are always out of date.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Worse, all of it lives with <strong>one person</strong>. The moment you are at work, asleep, or simply out
            of the room, no one else can see the plan. That is how a sibling doubles a dose, or a sitter misses a meal
            that matters. The load cannot be shared because the information cannot be shared.
          </p>
        </section>

        {/* The fix */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">The fix: a shared command center for family health coordination</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-4">
            The goal is simple: stop <em>remembering</em> and start <em>looking it up</em>. A care command center is
            one shared place where a person&apos;s medications, vitals, appointments, and supplies all live together —
            visible to everyone you invite. Your head empties out, and the plan stops depending on you being awake.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            The deeper relief is <strong>shared accountability</strong>. When a sibling or spouse can see the same
            plan, the responsibility stops resting on one person. That is what quiets the 2 a.m. worry loop — not just
            better organization, but knowing you are not the only one holding it all.
          </p>
          <ol className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 p-0">
            <HowToStep step={1} label="Pick one home base" description="Choose a single place everything will live, so there is no more 'which app was that in?'" />
            <HowToStep step={2} label="Add the people you care for" description="Give each person their own profile — meds, vitals, and appointments in one view." />
            <HowToStep step={3} label="Invite your helpers" description="Share access with a sibling, spouse, or sitter, with the exact permissions you choose." />
            <HowToStep step={4} label="Let it do the remembering" description="Reminders and a shared dashboard mean the system holds the details — not your memory." />
          </ol>
        </section>

        {/* Example scenario */}
        <section className="mb-16">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-2">Example scenario</div>
            <p className="text-muted-foreground leading-relaxed">
              Two siblings share care for a parent. Before, one held every detail and fielded calls all day. After
              moving everything into one shared dashboard, either one can open the app, see the last blood-pressure
              reading, confirm the morning meds were given, and know the next appointment — without a single text.
              The information does the work, so the family can just be family.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <FaqAccordion
          items={FAQ_ITEMS}
          intro="The questions caregivers ask us most about getting the mental load out of their heads."
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
          title="Set the weight down"
          subtitle="Move the mental load out of your head and into one shared command center your whole family can see — so no one carries it alone."
          primaryHref="/dashboard"
          primaryLabel="Open Your Command Center"
        />

        <p className="text-center text-sm text-muted-foreground mt-8">
          Educational information for caregivers — not medical advice. Always work with qualified healthcare providers
          for medical decisions. <Link href="/security" className="underline">How we keep your data secure.</Link>
        </p>
      </main>
    </div>
  )
}
