import Link from 'next/link'
import {
  ChatBubbleLeftRightIcon,
  UserPlusIcon,
  AdjustmentsHorizontalIcon,
  NoSymbolIcon,
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

const PAGE_SLUG = 'share-health-data-securely'
const PAGE_TITLE = "How to Keep Your Family's Health Data Secure While Sharing Updates"
const PAGE_DESCRIPTION =
  'Coordinating care means sharing updates with siblings, spouses, and sitters — but the group text is not a safe place for health information. Here is how to keep everyone in the loop without exposing sensitive data.'
const DATE_PUBLISHED = '2026-07-18T10:40:00-05:00'
const DATE_MODIFIED = '2026-07-18T10:40:00-05:00'

const author = getBlogAuthor('founder')

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Is it safe to share health updates in a group text?',
    answer:
      'Not really. Group texts and email threads scatter sensitive information across many phones and inboxes, with no control over who forwards it or how long it lives. For health data, a permission-based shared space is far safer.',
  },
  {
    question: 'How do I share updates without oversharing?',
    answer:
      'Share the least each person needs. A sitter may need today’s medication times but not the full medical history. Choose a tool that lets you set per-person permissions — view-only, log-only, or full access — so people see exactly what their role requires.',
  },
  {
    question: 'What if a caregiver stops helping?',
    answer:
      'You should be able to remove their access instantly. That is a key advantage of permission-based sharing over group texts: when someone’s role ends, so does their access — nothing lingers on an old thread.',
  },
  {
    question: 'How is this different from just using a shared note?',
    answer:
      'A shared note usually means all-or-nothing access and no record of who saw what. Healthcare-grade sharing adds encryption, role-based permissions, and control you can change at any time.',
  },
]

const CONFIG: BlogPostConfig = {
  slug: PAGE_SLUG,
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords:
    'share health data securely, caregiver data sharing, secure family health updates, share health information with siblings, health data privacy caregiving',
  datePublished: DATE_PUBLISHED,
  dateModified: DATE_MODIFIED,
  appUrl: '/family',
  appDescription: 'Share family health updates with role-based permissions you control.',
  faqItems: FAQ_ITEMS,
}

export const metadata = buildBlogPostMetadata(CONFIG)

export default function ShareHealthDataSecurelyPage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={buildBlogPostJsonLd(CONFIG)} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Caregiver Guide · Safety &amp; Privacy</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">{PAGE_TITLE}</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Keeping everyone informed is the whole point of coordinating care. The trick is doing it without spraying
            sensitive details across a dozen phones.
          </p>
          <AuthorByline author={author} datePublished={DATE_PUBLISHED} dateModified={DATE_MODIFIED} />
        </div>

        <div className="mb-10"><SeriesNav slug={PAGE_SLUG} variant="top" /></div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-3">Why the group text is the weak spot</h2>
          <p className="text-muted-foreground leading-relaxed">
            The family group text feels convenient, but it is the least private place for health information. Once a
            screenshot of a medication list or a lab result is out there, you cannot control who forwards it or where
            it ends up. Coordinating care safely means moving those details out of the thread.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">The risks of casual sharing</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <ProblemCard icon={<ChatBubbleLeftRightIcon className="w-8 h-8 text-amber-500" />} title="Data scattered everywhere" description="Screenshots and updates live on every phone in the thread, forever, out of your control." />
            <ProblemCard icon={<AdjustmentsHorizontalIcon className="w-8 h-8 text-amber-500" />} title="No such thing as 'just a little'" description="A group text is all-or-nothing — you can't show the sitter only today's meds and nothing else." />
            <ProblemCard icon={<NoSymbolIcon className="w-8 h-8 text-amber-500" />} title="You can't take it back" description="When someone stops helping, their copy of everything stays on their device." />
            <ProblemCard icon={<UserPlusIcon className="w-8 h-8 text-amber-500" />} title="No record of who saw what" description="There's no way to know who has access or when it was last updated." />
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Share the right way, step by step</h2>
          <ol className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 p-0">
            <HowToStep step={1} label="Use one shared space" description="Move health details out of texts and into a permission-based hub everyone opens instead of forwarding." />
            <HowToStep step={2} label="Invite by role" description="Add each caregiver and give them only what their role needs — view-only, log-only, or full access." />
            <HowToStep step={3} label="Share the minimum" description="A sitter sees today's plan; a co-caregiver sees more. Match access to the job." />
            <HowToStep step={4} label="Revoke when it ends" description="When someone's role changes, remove their access in one tap — nothing lingers." />
          </ol>
        </section>

        <FaqAccordion items={FAQ_ITEMS} intro="How caregivers keep everyone informed without putting health data at risk." />

        <div className="mb-10"><SeriesNav slug={PAGE_SLUG} variant="bottom" /></div>
        <div className="mb-16"><AuthorBio author={author} /></div>

        <CtaBand
          title="Keep everyone in the loop — safely"
          subtitle="Invite siblings, spouses, and sitters with the exact permissions you choose, and change access anytime."
          primaryHref="/family"
          primaryLabel="Manage Family Access"
        />

        <p className="text-center text-sm text-muted-foreground mt-8">
          Educational information for caregivers. See our{' '}
          <Link href="/security" className="underline">security practices</Link> for how sharing is protected.
        </p>
      </main>
    </div>
  )
}
