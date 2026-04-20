/**
 * Medical Documents - Marketing Blog Page
 *
 * Comprehensive marketing page for WPL's secure document vault feature.
 * Reframed around emergency readiness and instant access to critical health documents.
 */

import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { blogPostingSchema } from '@/lib/json-ld'
import { Metadata } from 'next'
import {
  DocumentTextIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ShareIcon,
  BoltIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FolderOpenIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

export const metadata: Metadata = {
  title: 'Insurance Cards, Lab Results, Prescriptions — Always With You | Wellness Projection Lab',
  description: 'Store insurance cards, lab results, prescriptions, and vaccination records in a secure HIPAA-compliant vault. Instant access for emergencies, specialist visits, and school forms. OCR search across all documents.',
  keywords: 'medical documents, insurance card storage, lab results, prescriptions, vaccination records, HIPAA document vault, OCR medical search, emergency medical access, family medical records',
  openGraph: {
    title: 'Insurance Cards, Lab Results, Prescriptions — Always With You',
    description: 'Your family&apos;s critical medical documents — stored securely, organized per person, searchable instantly. Ready when emergencies happen.',
    type: 'article',
    images: [{ url: 'https://www.wellnessprojectionlab.com/screenshots/family-care/family-dashboard-overview-desktop-light.png', width: 1200, height: 630, alt: 'Wellness Projection Lab - Medical Documents' }],
    url: 'https://www.wellnessprojectionlab.com/blog/medical-documents',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://www.wellnessprojectionlab.com/screenshots/family-care/family-dashboard-overview-desktop-light.png'],
    title: 'Insurance Cards, Lab Results, Prescriptions — Always With You',
    description: 'Your family&apos;s critical medical documents — stored securely, organized per person, searchable instantly.',
  },
  alternates: {
    canonical: 'https://www.wellnessprojectionlab.com/blog/medical-documents'
  }
}

export default function MedicalDocumentsBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd
        data={blogPostingSchema({
          headline: 'Insurance Cards, Lab Results, Prescriptions — Always With You',
          description: 'Store insurance cards, lab results, prescriptions, and vaccination records in a secure HIPAA-compliant vault. Instant access for emergencies, specialist visits, and school forms. OCR search across all documents.',
          slug: 'medical-documents',
          image: '/screenshots/family-care/family-dashboard-overview-desktop-light.png',
          datePublished: '2026-01-15T00:00:00-05:00',
          keywords: 'medical documents, insurance card storage, lab results, prescriptions, vaccination records, HIPAA document vault, OCR medical search, emergency medical access, family medical records',
        })}
      />
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-slate-700 via-blue-700 to-indigo-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <ShieldCheckIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Secure Document Vault</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Insurance Cards, Lab Results, Prescriptions — Always With You
            </h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Every critical medical document for every family member — uploaded once, organized automatically,
              and accessible from any device in seconds. When emergencies happen, you&apos;re ready.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
              >
                Start Free Trial
              </Link>
              <Link
                href="/documents"
                className="px-8 py-4 bg-blue-500/80 text-white rounded-lg hover:bg-blue-500 transition-colors font-semibold flex items-center gap-2"
              >
                <span>Go to Documents</span>
                <ArrowRightIcon className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Problem Section */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">The Problem With Paper and Scattered Files</h2>
          <p className="text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-12">
            Medical documents are some of the most important things you own — and the hardest to find when you actually need them.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon={<FolderOpenIcon className="w-10 h-10 text-red-500" />}
              title="Scattered Everywhere"
              description="Insurance cards in a wallet, lab results in email, vaccination records in a filing cabinet, prescriptions at the pharmacy. Nothing is in one place."
            />
            <ProblemCard
              icon={<ClockIcon className="w-10 h-10 text-red-500" />}
              title="Can&apos;t Find Them When It Matters"
              description="Your doctor asks for last quarter&apos;s blood work. You know it exists somewhere — 20 minutes of searching through email and drawers later, you still can&apos;t find it."
            />
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-10 h-10 text-red-500" />}
              title="Emergencies Don&apos;t Wait"
              description="You&apos;re in the ER. They need your insurance info, medication list, and allergies NOW. You&apos;re fumbling through your phone while stressed and in pain."
            />
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">How It Works</h2>
          <p className="text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-12">
            Four steps from chaos to calm. Your documents become searchable, organized, and always available.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            <StepCard
              step={1}
              title="Upload"
              description="Snap a photo or upload a PDF. Insurance cards, lab results, prescriptions, imaging reports — any medical document."
            />
            <StepCard
              step={2}
              title="OCR Extracts Text"
              description="Our AI reads every document automatically. Names, dates, values, and medication details are extracted and indexed."
            />
            <StepCard
              step={3}
              title="Auto-Categorize"
              description="Documents are organized by type and assigned to the right family member. No manual sorting required."
            />
            <StepCard
              step={4}
              title="Search Anything"
              description="Find any document in seconds. Search by name, date, medication, lab value, or any text within any document."
            />
          </div>
        </section>

        {/* Emergency Readiness Highlight */}
        <section className="mb-20">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                  <BoltIcon className="w-10 h-10 text-red-600" />
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-4">In an Emergency, Every Second Counts</h2>
                <p className="text-lg text-muted-foreground mb-4">
                  When you or a family member ends up in the ER, the last thing you need is to be searching for paperwork.
                  With WPL&apos;s document vault, every insurance card, medication list, allergy record, and recent lab result
                  for every family member is accessible instantly — right from your phone.
                </p>
                <p className="text-lg font-semibold text-red-700 dark:text-red-400">
                  The information that saves lives shouldn&apos;t be locked in a drawer at home.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">When You&apos;ll Be Glad You Have This</h2>
          <p className="text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-12">
            Real scenarios where instant document access changes everything.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <UseCaseCard
              icon={<ExclamationTriangleIcon className="w-8 h-8 text-red-600" />}
              title="ER Visit"
              scenario="Your child falls at the playground. The ER needs insurance, medication list, and allergies — NOW."
              outcome="Pull up WPL on your phone. Insurance card, current medications, and allergy list for your child — all there in 5 seconds. The ER team starts treatment immediately."
            />
            <UseCaseCard
              icon={<UserGroupIcon className="w-8 h-8 text-indigo-600" />}
              title="New Specialist"
              scenario="You&apos;re seeing a new cardiologist who needs your full history from 3 previous doctors."
              outcome="Share your complete document history directly from WPL. Lab trends, imaging reports, and prior specialist notes — organized chronologically. No more &quot;can you fax those records?&quot;"
            />
            <UseCaseCard
              icon={<DocumentTextIcon className="w-8 h-8 text-green-600" />}
              title="School Forms"
              scenario="School requires updated vaccination records by Friday. You have 3 kids at different schools."
              outcome="Search &quot;vaccination&quot; in WPL. All immunization records for all three children appear instantly. Download, print, or share — done in under a minute."
            />
          </div>
        </section>

        {/* Features Grid */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">Built for Real Life, Not Just Storage</h2>
          <p className="text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-12">
            Every feature designed around how families actually use medical documents.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<CloudArrowUpIcon className="w-12 h-12 text-blue-600" />}
              title="Multi-Format Upload"
              description="Photos (JPG, PNG, HEIC), PDFs, and scanned documents up to 10MB. Snap a photo of your insurance card and it&apos;s stored forever."
            />
            <FeatureCard
              icon={<MagnifyingGlassIcon className="w-12 h-12 text-indigo-600" />}
              title="Intelligent OCR Search"
              description="Search inside your documents — not just file names. Find &quot;cholesterol&quot; across every lab result you&apos;ve ever uploaded."
            />
            <FeatureCard
              icon={<UserGroupIcon className="w-12 h-12 text-purple-600" />}
              title="Per-Person Organization"
              description="Every document linked to the right family member. Mom&apos;s prescriptions, Dad&apos;s lab results, and the kids&apos; vaccination records — all separated automatically."
            />
            <FeatureCard
              icon={<ShieldCheckIcon className="w-12 h-12 text-green-600" />}
              title="HIPAA-Compliant Storage"
              description="AES-256 encryption at rest and in transit. Your medical documents get the same security level as hospital systems."
            />
            <FeatureCard
              icon={<ShareIcon className="w-12 h-12 text-orange-600" />}
              title="Easy Provider Sharing"
              description="Share specific documents with doctors, specialists, or caregivers with granular permissions. Revoke access anytime."
            />
            <FeatureCard
              icon={<BoltIcon className="w-12 h-12 text-red-600" />}
              title="Emergency Quick Access"
              description="Pin critical documents — insurance cards, medication lists, allergy records — for one-tap access when seconds matter."
            />
          </div>
        </section>

        {/* Trust + Social Proof */}
        <section className="mb-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-foreground mb-6">Your Most Important Documents, Protected and Always Accessible</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Medical documents contain some of the most sensitive information about you and your family.
              WPL treats that responsibility seriously — HIPAA-compliant security, encrypted storage,
              and full control over who can see what. No third-party access, no data selling, no compromises.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-card rounded-xl border-2 border-border p-6">
                <CheckCircleIcon className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-foreground mb-2">HIPAA Compliant</h3>
                <p className="text-sm text-muted-foreground">Full compliance with healthcare data protection standards. Your data is handled like a hospital handles it.</p>
              </div>
              <div className="bg-card rounded-xl border-2 border-border p-6">
                <CheckCircleIcon className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-foreground mb-2">AES-256 Encryption</h3>
                <p className="text-sm text-muted-foreground">Military-grade encryption for every document, at rest and in transit. Even we can&apos;t read your files.</p>
              </div>
              <div className="bg-card rounded-xl border-2 border-border p-6">
                <CheckCircleIcon className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-foreground mb-2">You Own Your Data</h3>
                <p className="text-sm text-muted-foreground">Export everything anytime. Delete everything permanently. Your documents, your control — always.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Related Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">Related Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RelatedLink href="/blog/patient-care" title="Patient Care" description="Comprehensive patient profiles and health data management" />
            <RelatedLink href="/blog/medications" title="Medications" description="Track prescriptions, dosages, and medication schedules" />
            <RelatedLink href="/blog/appointments" title="Appointments" description="Schedule and manage healthcare appointments" />
            <RelatedLink href="/blog/vitals-tracking" title="Vitals Tracking" description="Monitor vital signs and health metrics over time" />
            <RelatedLink href="/blog/family-care" title="Family Care" description="Manage health data for every family member in one place" />
            <RelatedLink href="/blog/profile" title="Health Profile" description="Your health identity powers personalized AI insights" />
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-slate-700 via-blue-700 to-indigo-700 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Your Most Important Documents, Protected and Always Accessible</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Stop fumbling through drawers and email threads. Upload your family&apos;s medical documents once and
            have them ready — organized, searchable, and secure — whenever you need them.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
            >
              Start Free Trial
            </Link>
            <Link
              href="/documents"
              className="px-8 py-4 bg-blue-500/80 text-white rounded-lg hover:bg-blue-500 transition-colors font-semibold"
            >
              Go to Documents
            </Link>
          </div>
          <p className="text-sm text-blue-200 mt-6">
            No credit card required &bull; 7-day free trial &bull; Cancel anytime
          </p>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm">
            <Link href="/security" className="text-white/90 hover:text-white underline">Security</Link>
            <Link href="/hipaa" className="text-white/90 hover:text-white underline">HIPAA Compliance</Link>
            <Link href="/privacy" className="text-white/90 hover:text-white underline">Privacy Policy</Link>
            <Link href="/support" className="text-white/90 hover:text-white underline">Help Center</Link>
          </div>
        </section>
      </main>
    </div>
  )
}

// Helper Components
function ProblemCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-red-100 dark:border-red-900/30 p-6">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {step}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function UseCaseCard({ icon, title, scenario, outcome }: { icon: React.ReactNode; title: string; scenario: string; outcome: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6">
      <div className="mb-3">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
      <div className="space-y-3">
        <div>
          <span className="font-semibold text-red-600 dark:text-red-400 text-sm">The Situation:</span>
          <p className="text-muted-foreground mt-1 text-sm">{scenario}</p>
        </div>
        <div>
          <span className="font-semibold text-green-600 dark:text-green-400 text-sm">With WPL:</span>
          <p className="text-muted-foreground mt-1 text-sm">{outcome}</p>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-blue-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function RelatedLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="bg-card rounded-lg border-2 border-border p-4 hover:border-blue-300 hover:shadow-lg transition-all block">
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
