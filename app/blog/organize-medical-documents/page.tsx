import Link from 'next/link'
import {
  FolderOpenIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  UserGroupIcon,
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

const PAGE_SLUG = 'organize-medical-documents'
const PAGE_TITLE = 'How to Organize Medical Documents for Aging Parents: A Step-by-Step Guide'
const PAGE_DESCRIPTION =
  'Insurance cards, lab results, prescriptions, and hospital paperwork pile up fast. Here is a simple, step-by-step system to organize an aging parent’s medical documents so you can find anything in seconds.'
const DATE_PUBLISHED = '2026-07-18T10:00:00-05:00'
const DATE_MODIFIED = '2026-07-18T10:00:00-05:00'

const author = getBlogAuthor('founder')

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What medical documents should I keep for an aging parent?',
    answer:
      'Keep insurance and Medicare cards, a current medication list, recent lab and test results, hospital discharge papers, a list of doctors and their contact info, and any advance directives or care wishes. If a doctor might ask for it, keep a copy.',
  },
  {
    question: 'Should I keep paper or go digital?',
    answer:
      'Both, but lead with digital. Snap a photo or scan of each document so it is searchable and shareable, and keep the physical originals of legal papers (like advance directives) in one labeled folder at home.',
  },
  {
    question: 'How do I share documents with siblings or doctors safely?',
    answer:
      'Use a HIPAA-aligned tool that lets you invite specific people and control what they can see, instead of texting photos around. That way the right people have access and the documents are not scattered across phones.',
  },
  {
    question: 'How far back should records go?',
    answer:
      'For active conditions, keep the last couple of years of results so trends are visible. For big events — surgeries, serious diagnoses — keep them indefinitely. You can always archive older routine results.',
  },
]

const CONFIG: BlogPostConfig = {
  slug: PAGE_SLUG,
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords:
    'organize medical documents, medical records for aging parents, how to store medical records, caregiver document organization, digitize medical records',
  datePublished: DATE_PUBLISHED,
  dateModified: DATE_MODIFIED,
  appUrl: '/documents',
  appDescription: 'Securely store and share medical documents for your whole family.',
  faqItems: FAQ_ITEMS,
}

export const metadata = buildBlogPostMetadata(CONFIG)

export default function OrganizeMedicalDocumentsPage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={buildBlogPostJsonLd(CONFIG)} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Caregiver Guide · How-To</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">{PAGE_TITLE}</h1>
          <p className="text-xl text-muted-foreground mb-6">
            When a doctor asks &ldquo;do you have last month&apos;s results?&rdquo; you should be able to say yes in
            seconds. Here is how to get there.
          </p>
          <AuthorByline author={author} datePublished={DATE_PUBLISHED} dateModified={DATE_MODIFIED} />
        </div>

        <div className="mb-10"><SeriesNav slug={PAGE_SLUG} variant="top" /></div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-3">Why document chaos is a real health risk</h2>
          <p className="text-muted-foreground leading-relaxed">
            Missing paperwork is not just annoying — it changes care. A lab result no one can find gets repeated. A
            medication list left at home leads to a guess at the pharmacy. Getting documents organized once removes a
            whole category of stress and mistakes.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">The problems this solves</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <ProblemCard icon={<MagnifyingGlassIcon className="w-8 h-8 text-amber-500" />} title="Can't find it at the appointment" description="The one paper the doctor wants is in a drawer at home, so the visit is spent guessing." />
            <ProblemCard icon={<FolderOpenIcon className="w-8 h-8 text-amber-500" />} title="Paperwork in five places" description="Some in a folder, some in email, some in a photo on your phone. Nothing is complete." />
            <ProblemCard icon={<DocumentDuplicateIcon className="w-8 h-8 text-amber-500" />} title="Repeated tests" description="A result that can't be found gets ordered again — more time, more cost, more stress." />
            <ProblemCard icon={<UserGroupIcon className="w-8 h-8 text-amber-500" />} title="Siblings locked out" description="Only one person has the records, so everyone else is calling to ask what's going on." />
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">The step-by-step system</h2>
          <ol className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 p-0">
            <HowToStep step={1} label="Gather everything" description="Pull together cards, results, discharge papers, and prescriptions from every drawer and inbox." />
            <HowToStep step={2} label="Sort by type" description="Group into buckets: insurance, medications, test results, visits, and legal/care wishes." />
            <HowToStep step={3} label="Snap and store" description="Photograph or scan each one into a single secure place so it is searchable and backed up." />
            <HowToStep step={4} label="Share access" description="Invite the caregivers who need it, with permissions you control — no texting photos around." />
          </ol>
        </section>

        <section className="mb-16">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-2">Tip</div>
            <p className="text-muted-foreground leading-relaxed">
              A document tool that reads text from your photos (OCR) makes the difference between a pile of images and a
              searchable file. Snap the insurance card once and it is there for every future appointment.
            </p>
          </div>
        </section>

        <FaqAccordion items={FAQ_ITEMS} intro="Common questions about organizing a parent's medical paperwork." />

        <div className="mb-10"><SeriesNav slug={PAGE_SLUG} variant="bottom" /></div>
        <div className="mb-16"><AuthorBio author={author} /></div>

        <CtaBand
          title="Every document, always with you"
          subtitle="Scan insurance cards, lab results, and prescriptions into one secure place — searchable, and shareable with the caregivers you choose."
          primaryHref="/documents"
          primaryLabel="Open Document Storage"
        />

        <p className="text-center text-sm text-muted-foreground mt-8">
          Educational information for caregivers — not medical advice. <Link href="/security" className="underline">How we keep your data secure.</Link>
        </p>
      </main>
    </div>
  )
}
