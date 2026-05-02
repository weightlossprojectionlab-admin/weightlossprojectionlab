/**
 * Health Profiles - Core Product Page
 *
 * Repositioned from clinical "Patient Management" to
 * "Your Family's Health Operating System" — the central hub
 * that powers everything WPL does.
 *
 * Structure: Hero → Modes → Intelligence → Stories → Profile Features → Trust → CTA
 */

import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { blogPostingSchema } from '@/lib/json-ld'
import {
  UserGroupIcon,
  HeartIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  BellAlertIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  CheckIcon,
  SparklesIcon,
  PlusCircleIcon,
  ArrowRightIcon,
  UserIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline'
import { Screenshot } from '@/components/ui/Screenshot'
import { DemoRequestButton } from '@/components/DemoRequestButton'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Health Profiles — Your Family\'s Health Operating System | Wellness Projection Lab',
  description: 'Create intelligent health profiles for everyone you care about — children, partners, aging parents, and pets. self-teaching insights, life-stage awareness, and proactive alerts from one centralized system.',
  keywords: 'health profiles, family health system, multi-person health tracking, self-teaching health insights, pediatric tracking, elderly monitoring, pet health tracking, caregiver platform, health operating system',
  openGraph: {
    title: 'Health Profiles — Your Family\'s Health Operating System',
    description: 'Create intelligent health profiles for everyone you care about. self-teaching insights from newborns to seniors.',
    type: 'article',
    images: [{ url: 'https://www.wellnessprojectionlab.com/screenshots/family-care/family-dashboard-overview-desktop-light.png', width: 1200, height: 630, alt: 'Wellness Projection Lab - Patients' }],
    url: 'https://www.wellnessprojectionlab.com/blog/patients',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://www.wellnessprojectionlab.com/screenshots/family-care/family-dashboard-overview-desktop-light.png'],
    title: 'Health Profiles — Your Family\'s Health Operating System',
    description: 'Create intelligent health profiles for everyone you care about. self-teaching insights from newborns to seniors.',
  },
  alternates: {
    canonical: 'https://www.wellnessprojectionlab.com/blog/patients'
  }
}

export default function PatientsBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd
        data={blogPostingSchema({
          headline: 'Health Profiles — Your Family\'s Health Operating System',
          description: 'Create intelligent health profiles for everyone you care about — children, partners, aging parents, and pets. self-teaching insights, life-stage awareness, and proactive alerts from one centralized system.',
          slug: 'patients',
          image: '/screenshots/family-care/family-dashboard-overview-desktop-light.png',
          datePublished: '2026-01-15T00:00:00-05:00',
          keywords: 'health profiles, family health system, multi-person health tracking, self-teaching health insights, pediatric tracking, elderly monitoring, pet health tracking, caregiver platform, health operating system',
        })}
      />

      {/* ============================================ */}
      {/* HERO                                         */}
      {/* ============================================ */}
      <div className="relative bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Health Operating System</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Every Person You Care About.<br />One Intelligent System.
            </h1>
            <p className="text-xl text-cyan-100 mb-8 leading-relaxed max-w-3xl mx-auto">
              Create a health profile for your child, your partner, your aging parent, or your pet. Each profile gets its own dashboard, self-teaching insights, and proactive alerts — all managed from your single account.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
              >
                Start Free Trial
              </Link>
              <DemoRequestButton
                source="blog/patients"
                className="px-8 py-4 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition-colors font-semibold"
              >
                View Demo
              </DemoRequestButton>
            </div>
            <p className="text-sm text-white/70 mt-4">
              No credit card required &bull; 7-day free trial &bull; Cancel anytime
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ============================================ */}
        {/* THE MODES — Who are you tracking?            */}
        {/* ============================================ */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">One Platform. Four Modes.</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tell us who you&apos;re tracking, and the system adapts instantly.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <ModeCard
              icon={<UserIcon className="w-8 h-8" />}
              title="Personal"
              description="Track your own weight, meals, vitals, and progress with self-teaching projections that adapt to your data."
              color="bg-blue-500"
            />
            <ModeCard
              icon={<HeartIcon className="w-8 h-8" />}
              title="Family"
              description="Add children, partners, and siblings. Each gets their own dashboard, goals, and insights."
              color="bg-pink-500"
            />
            <ModeCard
              icon={<ShieldCheckIcon className="w-8 h-8" />}
              title="Caregiving"
              description="Monitor aging parents, manage medications, coordinate duties between siblings."
              color="bg-amber-500"
            />
            <ModeCard
              icon={<AcademicCapIcon className="w-8 h-8" />}
              title="Professional"
              description="Coaches and providers: track client progress, generate reports, manage caseloads."
              color="bg-purple-500"
            />
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Same engine, same login — the experience changes based on who you&apos;re caring for.
          </p>
        </section>

        {/* ============================================ */}
        {/* THE INTELLIGENCE LAYER                       */}
        {/* ============================================ */}
        <section className="mb-24">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-12 text-white">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
                Profiles That Think — Not Just Store
              </h2>
              <p className="text-lg text-white/90 mb-10 text-center max-w-2xl mx-auto">
                Every profile is powered by a self-teaching engine that learns what&apos;s normal for each person and flags what isn&apos;t.
              </p>
              <div className="grid md:grid-cols-3 gap-8">
                <IntelligenceCard
                  title="Life-Stage Aware"
                  description="The system knows the difference between a newborn, a teenager, and a senior. Conditions, weight units, and health notices adapt automatically."
                />
                <IntelligenceCard
                  title="Pattern Detection"
                  description="The system watches for declining trends, missed check-ins, weight plateaus, and nutrition gaps — across every profile, simultaneously."
                />
                <IntelligenceCard
                  title="Proactive Alerts"
                  description="You get notified before problems happen. Low caloric intake for 3 days? Weight dropping unexpectedly? The system tells you first."
                />
              </div>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* SMART VITALS REMINDERS                       */}
        {/* ============================================ */}
        <section className="mb-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-4">Never Miss a Health Check</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Smart vitals reminders pop up when family members have checks due. See what&apos;s overdue, when it was last logged, and log vitals instantly — or use the guided wizard.
              </p>
              <ul className="space-y-3">
                {[
                  'Automated reminders based on each person\'s schedule',
                  'One-click logging or full vital sign wizard',
                  'Overdue indicators with snooze options',
                  'Separate schedules per profile',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="max-w-md mx-auto">
              <Screenshot
                src="/screenshots/vitals-tracking/vitals-reminder-popup-desktop-light.png"
                alt="Smart vitals reminder popup showing 6 vitals due today with Log Now buttons"
                caption="Smart reminders keep every family member on track"
                priority
                zoomable
              />
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* REAL STORIES — Emotional use cases            */}
        {/* ============================================ */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Real Families. Real Scenarios.</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See how different families use the same system to solve different problems.
            </p>
          </div>
          <div className="space-y-6">
            <StoryCard
              emoji="👶"
              title="Sarah: Three Kids, Three Different Needs"
              scenario="One child has Type 1 diabetes, one has celiac disease, and one is training for soccer. Each needs different meal plans, different calorie goals, and different alerts."
              solution="Three profiles, each with unique dietary preferences and self-teaching meal suggestions. Diabetic-friendly meals for one, gluten-free for another, high-protein for the athlete. One app, zero confusion."
            />
            <StoryCard
              emoji="👴"
              title="Mike: Coordinating Mom's Care Across Three Cities"
              scenario="Mike and his two sisters share caregiving for their 80-year-old mother. They need to track medications, vitals, and appointments — but live in different states."
              solution="One profile for Mom. Three co-caregivers with real-time sync. Anyone can log vitals, update meds, or schedule appointments. Everyone stays informed with smart notifications."
            />
            <StoryCard
              emoji="💪"
              title="Emily & David: Joint Weight Loss, Individual Goals"
              scenario="Emily wants to lose 40 lbs. Her husband David is targeting 60 lbs. They want accountability but different personalized recommendations."
              solution="Separate profiles with individual goals, dashboards, and self-teaching health reports. They can view each other's progress for motivation while keeping their own targets."
            />
          </div>
        </section>

        {/* ============================================ */}
        {/* WHAT EACH PROFILE INCLUDES                   */}
        {/* ============================================ */}
        <section className="mb-24">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">What Every Health Profile Includes</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<UserGroupIcon className="w-10 h-10 text-blue-600" />}
              title="Personal Dashboard"
              description="Weight trends, meal logs, vitals, and self-teaching insights — unique to each person. Switch profiles in one tap."
            />
            <FeatureCard
              icon={<ChartBarIcon className="w-10 h-10 text-purple-600" />}
              title="Self-Teaching Health Reports"
              description="Personalized insights based on age, life stage, goals, and health data. Not generic — tailored to each individual."
            />
            <FeatureCard
              icon={<PlusCircleIcon className="w-10 h-10 text-green-600" />}
              title="Humans & Pets"
              description="Track people and pets in the same system. Species-specific vitals, breed-aware ranges, life stage labels."
            />
            <FeatureCard
              icon={<ClipboardDocumentListIcon className="w-10 h-10 text-indigo-600" />}
              title="Medical Records"
              description="Medications, vital signs, appointments, and medical documents — isolated per profile, HIPAA compliant."
            />
            <FeatureCard
              icon={<BellAlertIcon className="w-10 h-10 text-red-600" />}
              title="Smart Notifications"
              description="Weight check-ins, medication reminders, appointment alerts, and abnormal vital warnings — per person."
            />
            <FeatureCard
              icon={<ShieldCheckIcon className="w-10 h-10 text-teal-600" />}
              title="Role-Based Access"
              description="Invite co-caregivers with granular permissions. Control who sees what for each profile."
            />
          </div>
        </section>

        {/* ============================================ */}
        {/* SCREENSHOTS                                  */}
        {/* ============================================ */}
        <section className="mb-24">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">See It In Action</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Screenshot
              src="/screenshots/patient-care/patient-profile-vitals-desktop-light.png"
              alt="Patient profile with vitals dashboard"
              caption="Each profile has its own vitals dashboard with trend charts"
              zoomable
            />
            <Screenshot
              src="/screenshots/vitals-tracking/vitals-reminder-popup-desktop-light.png"
              alt="Smart vitals reminder popup"
              caption="Automated reminders keep everyone on schedule"
              zoomable
            />
          </div>
        </section>

        {/* ============================================ */}
        {/* TECHNICAL TRUST                              */}
        {/* ============================================ */}
        <section className="mb-24">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Built for Security, Speed, and Scale</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <TrustCard
              title="Data Isolation"
              items={['Complete separation between profiles', 'Individual encryption per person', 'HIPAA-compliant access logging']}
            />
            <TrustCard
              title="Collaboration"
              items={['Invite co-caregivers with roles', 'Admin, Caregiver, Viewer permissions', 'Real-time sync across all users']}
            />
            <TrustCard
              title="Flexible Plans"
              items={['Starter: 1 profile (you)', 'Family: Up to 5 profiles', 'Pro: Up to 10 profiles']}
            />
            <TrustCard
              title="Performance"
              items={['Profile switching < 100ms', 'Lazy loading for large families', 'Real-time data sync']}
            />
          </div>
        </section>

        {/* ============================================ */}
        {/* POSITIONING STATEMENT                        */}
        {/* ============================================ */}
        <section className="mb-24">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              You&apos;re Not Looking for a Weight Loss App.<br />
              You&apos;re Looking for a Health System.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Weight loss is just one output. Underneath, WPL is a centralized health tracking system for individuals, families, and caregivers. Same engine — different dashboards based on who you&apos;re caring for.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link href="/blog/family-care" className="px-4 py-2 rounded-lg bg-card border border-border hover:border-cyan-300 transition-colors">
                Family Care Dashboard <ArrowRightIcon className="w-3 h-3 inline ml-1" />
              </Link>
              <Link href="/blog/meal-tracking" className="px-4 py-2 rounded-lg bg-card border border-border hover:border-cyan-300 transition-colors">
                Meal Tracking <ArrowRightIcon className="w-3 h-3 inline ml-1" />
              </Link>
              <Link href="/blog/vitals-tracking" className="px-4 py-2 rounded-lg bg-card border border-border hover:border-cyan-300 transition-colors">
                Vitals Tracking <ArrowRightIcon className="w-3 h-3 inline ml-1" />
              </Link>
              <Link href="/blog/medications" className="px-4 py-2 rounded-lg bg-card border border-border hover:border-cyan-300 transition-colors">
                Medications <ArrowRightIcon className="w-3 h-3 inline ml-1" />
              </Link>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* FINAL CTA                                    */}
        {/* ============================================ */}
        <section className="bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Stop Juggling. Start Coordinating.
          </h2>
          <p className="text-xl text-cyan-100 mb-8 max-w-3xl mx-auto">
            Create health profiles for everyone you care about in minutes. One system that grows with your family.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
            >
              Start Your Free Trial
            </Link>
          </div>
          <p className="text-sm text-cyan-200 mt-6">
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

// ==================== HELPER COMPONENTS ====================

function ModeCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) {
  return (
    <div className="bg-card rounded-2xl border-2 border-border p-6 hover:border-cyan-300 hover:shadow-lg transition-all text-center">
      <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white mx-auto mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function IntelligenceCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-white/80 leading-relaxed">{description}</p>
    </div>
  )
}

function StoryCard({ emoji, title, scenario, solution }: { emoji: string; title: string; scenario: string; solution: string }) {
  return (
    <div className="bg-card rounded-2xl border-2 border-border p-8 hover:border-cyan-300 hover:shadow-lg transition-all">
      <div className="flex items-start gap-4">
        <span className="text-4xl flex-shrink-0">{emoji}</span>
        <div>
          <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
          <div className="space-y-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">The Challenge</span>
              <p className="text-muted-foreground mt-1">{scenario}</p>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-green-500">The WPL Solution</span>
              <p className="text-muted-foreground mt-1">{solution}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-cyan-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function TrustCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-5">
      <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
        <CheckCircleIcon className="w-5 h-5 text-green-600" />
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-muted-foreground">&bull; {item}</li>
        ))}
      </ul>
    </div>
  )
}
