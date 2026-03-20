/**
 * Providers - Marketing Blog Page
 *
 * "Keep Your Doctors in the Loop — Without the Paperwork"
 * Reframed around care coordination, fragmented healthcare, and the visit notes problem.
 */

import Link from 'next/link'
import { Metadata } from 'next'
import {
  BuildingOffice2Icon,
  MapPinIcon,
  LinkIcon,
  PhoneIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

export const metadata: Metadata = {
  title: 'Healthcare Provider Directory - Keep Your Doctors in the Loop | Wellness Projection Lab',
  description: 'Coordinate 5 specialists across 3 hospitals without the paperwork. Store provider contacts, link appointments, save visit notes, and export full medical history in one tap.',
  keywords: 'healthcare provider directory, doctor management, medical team coordination, specialist tracking, visit notes, care coordination, medical contacts',
  openGraph: {
    title: 'Healthcare Provider Directory - Keep Your Doctors in the Loop',
    description: 'Coordinate 5 specialists across 3 hospitals without the paperwork. Store provider contacts, link appointments, save visit notes, and export full medical history in one tap.',
    type: 'article',
    url: 'https://weightlossproglab.com/blog/providers',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Healthcare Provider Directory - Keep Your Doctors in the Loop',
    description: 'Coordinate 5 specialists across 3 hospitals without the paperwork. Store provider contacts, link appointments, save visit notes, and export full medical history in one tap.',
  },
  alternates: {
    canonical: 'https://weightlossproglab.com/blog/providers'
  }
}

export default function ProvidersBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-teal-600 via-cyan-600 to-sky-600 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Medical Team Hub</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Keep Your Doctors in the Loop &mdash; Without the Paperwork
            </h1>
            <p className="text-xl text-white/90 mb-4 leading-relaxed">
              The average patient sees <span className="font-bold text-white">5 different providers</span> who rarely talk to each other.
              You end up repeating your history, losing visit notes, and hoping nothing falls through the cracks.
            </p>
            <p className="text-lg text-white/80 mb-8">
              WPL makes you the hub. Every provider, every appointment, every note &mdash; finally in one place.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-teal-700 rounded-lg hover:bg-teal-50 transition-colors font-semibold shadow-lg"
              >
                Start Free Trial
              </Link>
              <Link
                href="/blog/appointments"
                className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-semibold"
              >
                See Appointments
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Problem Section */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">Healthcare Is Fragmented. You Feel It.</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            It&apos;s not your fault. The system wasn&apos;t designed for patients to coordinate their own care. But you can change that.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon={<UserGroupIcon className="w-10 h-10 text-teal-500" />}
              title="5 Specialists Who Don&apos;t Talk"
              description="Your cardiologist doesn&apos;t know what your endocrinologist prescribed. Your PCP hasn&apos;t seen the imaging your orthopedist ordered. Silos everywhere."
            />
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-10 h-10 text-teal-500" />}
              title="History You Can&apos;t Remember"
              description="&quot;When was your last colonoscopy?&quot; &quot;What dose are you on?&quot; &quot;Who referred you?&quot; Every new provider asks the same questions you can&apos;t fully answer."
            />
            <ProblemCard
              icon={<DocumentTextIcon className="w-10 h-10 text-teal-500" />}
              title="Losing Track of Visit Notes"
              description="The doctor said something important, but by the time you get home, the details are fuzzy. Was it 3 months or 6? Did they say stop or continue?"
            />
          </div>
        </section>

        {/* Coordination Value */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">You Become the Hub</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-3xl mx-auto">
            Instead of waiting for hospitals to share records, you take control. Organize every provider,
            link them to appointments, and store visit notes so nothing gets lost.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <CoordinationCard
              step={1}
              title="Organize All Providers"
              description="Add every doctor, specialist, therapist, and dentist in one directory. Store their specialty, office address, phone, fax, and email."
            />
            <CoordinationCard
              step={2}
              title="Link to Appointments"
              description="Every appointment is connected to the right provider. See your full visit history at a glance, across all doctors."
            />
            <CoordinationCard
              step={3}
              title="Store Visit Notes"
              description="After each visit, jot down what was discussed, what was prescribed, and what comes next. Never forget what the doctor said again."
            />
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">Real Scenarios. Real Relief.</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Here&apos;s how people are using the provider hub to stay on top of their care.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <UseCaseCard
              scenario="New Specialist Needs Full History"
              description="You&apos;re referred to a new rheumatologist. Instead of filling out 10 pages of forms from memory, you export your full provider list, visit history, and notes in one tap."
              outcome="Complete history shared in seconds"
            />
            <UseCaseCard
              scenario="Coordinating Care for Elderly Parent"
              description="Dad sees a cardiologist at one hospital, a nephrologist at another, and his PCP across town. You manage all 5 providers from one screen, tracking every visit and medication change."
              outcome="One screen for 5 providers, 3 hospitals"
            />
            <UseCaseCard
              scenario="Remembering What the Doctor Said"
              description="After your appointment, you open the app and type a quick note: &quot;Increase metformin to 1000mg. Recheck A1C in 3 months. Schedule follow-up.&quot; Linked directly to the visit."
              outcome="Visit notes you can actually find later"
            />
          </div>
        </section>

        {/* Features Grid */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Everything You Need to Manage Your Medical Team</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<BuildingOffice2Icon className="w-12 h-12 text-teal-600" />}
              title="Provider Profiles"
              description="Store name, specialty, phone, email, fax, and address for each provider. Add personal notes like &quot;great bedside manner&quot; or &quot;long wait times.&quot;"
            />
            <FeatureCard
              icon={<MapPinIcon className="w-12 h-12 text-teal-600" />}
              title="Location Mapping"
              description="Every provider has a mapped address with one-click navigation. No more Googling the office before your appointment."
            />
            <FeatureCard
              icon={<LinkIcon className="w-12 h-12 text-teal-600" />}
              title="Appointment Integration"
              description="Link every appointment to the right provider. See visit frequency, upcoming visits, and past history in one timeline."
            />
            <FeatureCard
              icon={<DocumentTextIcon className="w-12 h-12 text-teal-600" />}
              title="Visit Notes"
              description="Record what was discussed, what was prescribed, and what to do next after every appointment. Searchable and linked to the provider."
            />
            <FeatureCard
              icon={<PhoneIcon className="w-12 h-12 text-teal-600" />}
              title="Quick Contact"
              description="Tap to call, email, or get directions to any provider&apos;s office. No digging through paperwork for a phone number."
            />
            <FeatureCard
              icon={<ClipboardDocumentListIcon className="w-12 h-12 text-teal-600" />}
              title="Visit History"
              description="See every past appointment with each provider on a single timeline. Spot gaps in care and never miss a follow-up."
            />
          </div>
        </section>

        {/* Related Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">Explore Related Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RelatedLink href="/blog/appointments" title="Appointments" description="Schedule and track visits linked to your providers" />
            <RelatedLink href="/blog/medications" title="Medications" description="Track prescriptions prescribed by each provider" />
            <RelatedLink href="/blog/medical-documents" title="Medical Documents" description="Store and organize records from every visit" />
            <RelatedLink href="/blog/family-care" title="Family Care" description="Manage providers for your whole family" />
            <RelatedLink href="/blog/vitals-tracking" title="Vitals Tracking" description="Share vitals data with your medical team" />
            <RelatedLink href="/blog/wpl-health-reports" title="Health Reports" description="Generate reports to bring to appointments" />
          </div>
        </section>

        {/* Trust + CTA */}
        <section className="bg-gradient-to-r from-teal-600 to-sky-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Your Medical Team, Finally Organized</h2>
          <p className="text-xl text-teal-100 mb-8 max-w-3xl mx-auto">
            Stop repeating your history. Stop losing visit notes. Stop wondering which doctor said what.
            Put yourself at the center of your care.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-teal-700 rounded-lg hover:bg-teal-50 transition-colors font-semibold shadow-lg"
            >
              Start Free Trial
            </Link>
          </div>
          <p className="text-sm text-teal-200 mt-6">
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

// --- Helper Components ---

function ProblemCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 text-center">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}

function CoordinationCard({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 text-center">
      <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center mx-auto mb-4 text-lg">
        {step}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}

function UseCaseCard({ scenario, description, outcome }: { scenario: string; description: string; outcome: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-3">{scenario}</h3>
      <p className="text-muted-foreground text-sm mb-4">{description}</p>
      <div className="flex items-center gap-2 text-sm font-medium text-teal-600">
        <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
        <span>{outcome}</span>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-teal-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function RelatedLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="bg-card rounded-lg border-2 border-border p-4 hover:border-teal-300 hover:shadow-lg transition-all block">
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
