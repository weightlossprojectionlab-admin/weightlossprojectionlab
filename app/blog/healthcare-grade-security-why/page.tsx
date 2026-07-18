import Link from 'next/link'
import {
  LockClosedIcon,
  ShieldCheckIcon,
  EyeSlashIcon,
  KeyIcon,
} from '@heroicons/react/24/outline'
import { JsonLd } from '@/components/seo/JsonLd'
import { type FAQItem } from '@/lib/json-ld'
import { buildBlogPostMetadata, buildBlogPostJsonLd, type BlogPostConfig } from '@/lib/blog-post'
import { getBlogAuthor } from '@/lib/blog-authors'
import { AuthorByline, AuthorBio } from '@/components/blog/AuthorByline'
import { SeriesNav } from '@/components/blog/SeriesNav'
import { FaqAccordion } from '@/components/blog/FaqAccordion'
import { CtaBand } from '@/components/blog/CtaBand'
import { ProblemCard } from '@/components/blog/cards'

const PAGE_SLUG = 'healthcare-grade-security-why'
const PAGE_TITLE = 'Why Digital Health Tracking Needs Healthcare-Grade Security'
const PAGE_DESCRIPTION =
  'A family health app holds some of your most sensitive information. Here is what "healthcare-grade" security actually means, why generic apps fall short, and what to look for before you trust an app with your family’s health data.'
const DATE_PUBLISHED = '2026-07-18T10:30:00-05:00'
const DATE_MODIFIED = '2026-07-18T10:30:00-05:00'

const author = getBlogAuthor('founder')

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What does "healthcare-grade security" actually mean?',
    answer:
      'At a minimum: your data is encrypted both while it travels (TLS) and while it is stored (AES-256), access is role-based so people only see what they should, and the platform follows practices aligned with the HIPAA Privacy and Security Rules. It also means the company does not sell your health data.',
  },
  {
    question: 'Why aren’t regular apps good enough for health data?',
    answer:
      'Many free apps make money from data, log you in with weak controls, and were never built to handle protected health information. Health data is uniquely sensitive — it can affect insurance, employment, and privacy — so it deserves stronger protection than a typical note-taking app.',
  },
  {
    question: 'Does "HIPAA-aligned" mean the app is HIPAA certified?',
    answer:
      'No — and be careful with apps that claim to be "HIPAA certified," because there is no such certification. "HIPAA-aligned" means the platform builds to the HIPAA Privacy and Security Rules. For professional use, a provider can request a Business Associate Agreement (BAA).',
  },
  {
    question: 'What should I look for before trusting an app?',
    answer:
      'Check for encryption in transit and at rest, clear access controls, a plain-English privacy policy that says your data is never sold, and honest security claims. Vague or exaggerated claims are a red flag.',
  },
]

const CONFIG: BlogPostConfig = {
  slug: PAGE_SLUG,
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords:
    'healthcare-grade security, health data security, is my health app secure, HIPAA-aligned app, encrypted health tracking, secure family health app',
  datePublished: DATE_PUBLISHED,
  dateModified: DATE_MODIFIED,
  appUrl: '/security',
  appDescription: 'A HIPAA-aligned family health platform with encryption and role-based access.',
  faqItems: FAQ_ITEMS,
}

export const metadata = buildBlogPostMetadata(CONFIG)

export default function HealthcareGradeSecurityPage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={buildBlogPostJsonLd(CONFIG)} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Caregiver Guide · Safety &amp; Privacy</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">{PAGE_TITLE}</h1>
          <p className="text-xl text-muted-foreground mb-6">
            You would not text your family&apos;s medical records to a stranger. So the app that holds them should be
            held to a higher standard than a to-do list. Here is what that standard looks like.
          </p>
          <AuthorByline author={author} datePublished={DATE_PUBLISHED} dateModified={DATE_MODIFIED} />
        </div>

        <div className="mb-10"><SeriesNav slug={PAGE_SLUG} variant="top" /></div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-3">Health data is not like other data</h2>
          <p className="text-muted-foreground leading-relaxed">
            A leaked grocery list is embarrassing. Leaked health information can affect privacy, relationships, and
            peace of mind. That is why health data deserves stronger protection than a typical app provides — and why
            it is worth knowing what &ldquo;healthcare-grade&rdquo; really means before you trust an app with it.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">The four things that make security &ldquo;healthcare-grade&rdquo;</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <ProblemCard icon={<LockClosedIcon className="w-8 h-8 text-emerald-500" />} title="Encryption in transit and at rest" description="Your data is scrambled both while it travels (TLS 1.3) and while it is stored (AES-256), so it is unreadable if intercepted." />
            <ProblemCard icon={<KeyIcon className="w-8 h-8 text-emerald-500" />} title="Role-based access" description="People see only what they should. You choose who can view or edit each person's information." />
            <ProblemCard icon={<ShieldCheckIcon className="w-8 h-8 text-emerald-500" />} title="HIPAA-aligned practices" description="The platform is built to the HIPAA Privacy and Security Rules — with a Business Associate Agreement available for professional use." />
            <ProblemCard icon={<EyeSlashIcon className="w-8 h-8 text-emerald-500" />} title="Your data is never sold" description="A trustworthy health app earns money from the product, not from selling your information to advertisers." />
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Why generic apps fall short</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-4">
            Plenty of free apps are convenient, but many were never designed for health information. Some make money by
            selling data. Some have weak sign-in and no real access controls. And some make security claims they
            cannot back up.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            That last one matters most: be wary of apps that claim to be &ldquo;HIPAA certified&rdquo; (there is no such
            thing) or that advertise audits and certifications without proof. Honest, specific security claims are
            themselves a trust signal.
          </p>
        </section>

        <FaqAccordion items={FAQ_ITEMS} intro="Straight answers about what secure health tracking should look like." />

        <div className="mb-10"><SeriesNav slug={PAGE_SLUG} variant="bottom" /></div>
        <div className="mb-16"><AuthorBio author={author} /></div>

        <CtaBand
          title="Health data deserves real protection"
          subtitle="Track your family's health on a HIPAA-aligned platform with AES-256 encryption, TLS 1.3, and access you control."
          primaryHref="/dashboard"
          primaryLabel="Start a Secure Hub"
          secondaryHref="/security"
          secondaryLabel="Read Our Security Practices"
        />

        <p className="text-center text-sm text-muted-foreground mt-8">
          Educational information for caregivers. See our{' '}
          <Link href="/security" className="underline">security practices</Link> and{' '}
          <Link href="/hipaa" className="underline">HIPAA approach</Link> for details.
        </p>
      </main>
    </div>
  )
}
