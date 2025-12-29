/**
 * Dashboard Feature - Marketing Blog Page
 *
 * Hybrid marketing page showcasing the WLPL Dashboard
 * Optimized for SEO with top-notch backlinks and conversion funnel
 */

import Link from 'next/link'
import { Metadata } from 'next'
import {
  ChartBarIcon,
  CalendarIcon,
  HeartIcon,
  UserGroupIcon,
  BellAlertIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { DemoRequestButton } from '@/components/DemoRequestButton'

export const metadata: Metadata = {
  title: 'Health Dashboard - Centralized Family Health Tracking | Weight Loss Projection Lab',
  description: 'Monitor weight loss progress, meal logs, vitals, and intelligent health insights for your entire family from one unified dashboard. Track goals, view trends, and manage care coordination effortlessly.',
  keywords: 'health dashboard, family health tracking, weight loss dashboard, meal tracking, vitals monitoring, health insights, patient dashboard, caregiver dashboard, WLPL dashboard',
  openGraph: {
    title: 'Health Dashboard - Centralized Family Health Tracking',
    description: 'Monitor weight loss progress, meal logs, vitals, and intelligent health insights for your entire family from one unified dashboard.',
    type: 'article',
    url: 'https://weightlossproglab.com/blog/dashboard',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Health Dashboard - Centralized Family Health Tracking',
    description: 'Monitor weight loss progress, meal logs, vitals, and intelligent health insights for your entire family from one unified dashboard.',
  },
  alternates: {
    canonical: 'https://weightlossproglab.com/blog/dashboard'
  }
}

export default function DashboardBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm font-medium">WLPL Health Dashboard</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">Your Family's Health Command Center</h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Monitor weight loss progress, track meals, view vitals, and get intelligent health insights for your entire family—all from one beautiful, unified dashboard.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
              >
                Start Free Trial
              </Link>
              <DemoRequestButton
                source="blog/dashboard"
                className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors font-semibold"
              >
                View Demo
              </DemoRequestButton>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* What Is The Dashboard */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">What Is The WLPL Dashboard?</h2>
          <div className="max-w-4xl mx-auto text-lg text-muted-foreground space-y-4">
            <p>
              The <strong>Weight Loss Projection Lab Dashboard</strong> is your family's centralized health command center.
              Instead of juggling multiple apps, spreadsheets, and paper logs, the WLPL Dashboard brings all your health
              data into one beautiful, easy-to-use interface.
            </p>
            <p>
              Whether you're tracking your own weight loss journey, managing your child's meal plan, or coordinating care
              for elderly parents, the Dashboard gives you instant visibility into everyone's health metrics, trends, and
              platform-generated insights.
            </p>
          </div>
        </section>

        {/* Key Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Dashboard Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<ChartBarIcon className="w-12 h-12 text-purple-600" />}
              title="Real-Time Health Metrics"
              description="View weight trends, BMI changes, meal logs, and vital signs in beautiful charts and graphs that update instantly."
            />
            <FeatureCard
              icon={<UserGroupIcon className="w-12 h-12 text-blue-600" />}
              title="Multi-Patient View"
              description="Track health data for your entire family from one screen. Quick-switch between patients or view aggregate data."
            />
            <FeatureCard
              icon={<SparklesIcon className="w-12 h-12 text-indigo-600" />}
              title="Intelligent Health Insights"
              description="Get personalized recommendations based on meal patterns, weight trends, and vital signs from WLPL platform."
            />
            <FeatureCard
              icon={<BellAlertIcon className="w-12 h-12 text-red-600" />}
              title="Smart Alerts"
              description="Receive notifications for weight check-in reminders, abnormal vitals, missed medications, and upcoming appointments."
            />
            <FeatureCard
              icon={<CalendarIcon className="w-12 h-12 text-green-600" />}
              title="Activity Timeline"
              description="See a chronological feed of recent meals, weight logs, vitals, and family member activities across your household."
            />
            <FeatureCard
              icon={<ArrowTrendingUpIcon className="w-12 h-12 text-orange-600" />}
              title="Progress Tracking"
              description="Visualize progress toward weight goals with streak counters, milestone celebrations, and trend analysis."
            />
          </div>
        </section>

        {/* Dashboard Sections */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">What You'll See On Your Dashboard</h2>
          <div className="space-y-8">
            <DashboardSection
              title="📊 Weight Loss Progress Chart"
              description="Interactive line chart showing weight trends over time with goal markers, BMI calculations, and weekly change rates."
              features={[
                'Zoom into specific date ranges',
                'Compare multiple family members',
                'Export data to CSV/PDF',
                'Annotate special events (vacations, holidays)'
              ]}
            />
            <DashboardSection
              title="🍽️ Recent Meal Logs"
              description="Quick view of the latest meals logged across your family, with AI-analyzed calorie counts and nutritional breakdowns."
              features={[
                'Photo thumbnails of meals',
                'AI confidence scores (80-95% accuracy)',
                'One-click editing and deletion',
                'Filter by meal type and family member'
              ]}
            />
            <DashboardSection
              title="💓 Vital Signs Snapshot"
              description="At-a-glance view of recent vital sign readings: blood pressure, blood sugar, temperature, pulse oximeter, and mood."
              features={[
                'Color-coded alerts for abnormal values',
                'Mini trend charts (sparklines)',
                'Quick-log vital signs inline',
                'Link to detailed vitals history'
              ]}
            />
            <DashboardSection
              title="📊 WLPL Health Report Card"
              description="Weekly health analysis with personalized recommendations, risk alerts, and caregiver action items."
              features={[
                'Nutrition quality scores',
                'Weight loss pace analysis',
                'Medication adherence tracking',
                'Shopping list suggestions'
              ]}
            />
            <DashboardSection
              title="📅 Upcoming Appointments"
              description="Calendar view of scheduled doctor visits, lab work, and specialist appointments for all family members."
              features={[
                'Driver assignment for transportation',
                'Appointment reminders (7, 3, 1 day before)',
                'One-click navigation to location',
                'Mark as completed with visit notes'
              ]}
            />
            <DashboardSection
              title="👥 Family Activity Feed"
              description="Real-time stream of household health activities: meals logged, weight check-ins, vitals recorded, documents uploaded."
              features={[
                'See who did what and when',
                'React to family achievements',
                'Filter by activity type',
                'Privacy controls for sensitive data'
              ]}
            />
          </div>
        </section>

        {/* Who Benefits */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Who Benefits From The Dashboard?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <BenefitCard
              emoji="👤"
              title="Solo Health Trackers"
              benefits={[
                'Personal weight loss journey visualization',
                'Meal and exercise tracking in one place',
                'Intelligent insights for your goals',
                'Export data for doctor visits'
              ]}
            />
            <BenefitCard
              emoji="👨‍👩‍👧‍👦"
              title="Family Caregivers"
              benefits={[
                'Monitor multiple family members at once',
                'Coordinate care between siblings',
                'Track elderly parents\' vitals remotely',
                'Manage children\'s meal plans'
              ]}
            />
            <BenefitCard
              emoji="🩺"
              title="Healthcare Providers"
              benefits={[
                'External caregiver access for patients',
                'View patient data before appointments',
                'Track compliance and adherence',
                'Receive alerts for critical vitals'
              ]}
            />
          </div>
        </section>

        {/* Real-World Use Cases */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Real-World Dashboard Use Cases</h2>
          <div className="space-y-6">
            <UseCaseCard
              title="Managing Multiple Children's Health"
              scenario="Sarah has three kids with different dietary needs—one with diabetes, one with celiac disease, and one training for soccer."
              solution="The Dashboard lets Sarah switch between each child's profile to log meals, track glucose levels, monitor weight, and view AI recommendations tailored to each child's condition."
            />
            <UseCaseCard
              title="Coordinating Elderly Parent Care"
              scenario="Mike and his two siblings care for their 78-year-old mother across three cities. They need to track her blood pressure, medications, and doctor appointments."
              solution="All three siblings access the Dashboard to log vitals, upload medical documents, and coordinate appointments. The activity feed keeps everyone informed in real-time."
            />
            <UseCaseCard
              title="Weight Loss Accountability Partner"
              scenario="Emily and her spouse are on a joint weight loss journey and want to support each other's progress."
              solution="Both can view the household Dashboard to see each other's weight trends, meal logs, and WLPL health reports, creating accountability and motivation."
            />
          </div>
        </section>

        {/* Technical Capabilities */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Technical Capabilities</h2>
          <div className="bg-card rounded-xl border-2 border-border p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  Performance
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Real-time data sync across all devices</li>
                  <li>• Sub-second dashboard load times</li>
                  <li>• Offline mode with sync when back online</li>
                  <li>• Optimized for mobile, tablet, and desktop</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  Customization
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Rearrange dashboard widgets by preference</li>
                  <li>• Set default patient view</li>
                  <li>• Choose metric units (lbs/kg, F/C)</li>
                  <li>• Dark mode and accessibility options</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  Integrations
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Export data to CSV, PDF, JSON</li>
                  <li>• Email weekly health summaries</li>
                  <li>• Print patient reports for doctors</li>
                  <li>• API access for developers (coming soon)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  Security
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• HIPAA, SOC 2, ISO 27001 certified</li>
                  <li>• AES-256 encryption at rest</li>
                  <li>• TLS 1.3 encryption in transit</li>
                  <li>• Biometric authentication (Face ID/Touch ID)</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Related Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">Related Platform Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RelatedLink href="/blog/meal-tracking" title="Meal Tracking" description="Photo meal logging with nutritional analysis" />
            <RelatedLink href="/blog/weight-tracking" title="Weight Tracking" description="Track weight trends with goal setting and progress visualization" />
            <RelatedLink href="/blog/ai-health-reports" title="WLPL Health Reports" description="Weekly personalized health insights and recommendations" />
            <RelatedLink href="/blog/family-care" title="Family Care" description="Manage health data for multiple family members" />
            <RelatedLink href="/blog/vitals-tracking" title="Vitals Tracking" description="Monitor blood pressure, glucose, temperature, and more" />
            <RelatedLink href="/blog/patient-care" title="Patient Management" description="Comprehensive patient profile and care coordination" />
          </div>
        </section>

        {/* SEO-Optimized Content */}
        <section className="mb-20 prose prose-lg max-w-4xl mx-auto">
          <h2>Why Choose WLPL Dashboard Over Other Health Tracking Apps?</h2>
          <p>
            Unlike single-purpose health apps that only track weight OR meals OR vitals, the WLPL Dashboard brings
            everything together in one unified interface. Here's what sets us apart:
          </p>
          <ul>
            <li><strong>Family-First Design:</strong> Most health apps are built for individuals. WLPL is designed from the ground up for families and caregivers managing multiple people's health.</li>
            <li><strong>Intelligent Insights:</strong> WLPL platform provides personalized recommendations that go far beyond basic calorie counting.</li>
            <li><strong>HIPAA Compliance:</strong> Medical-grade security and privacy for protecting your family's sensitive health information.</li>
            <li><strong>Comprehensive Data Types:</strong> Track weight, meals, vitals, medications, appointments, documents, and more—all in one place.</li>
            <li><strong>Real Collaboration:</strong> True multi-user support with role-based permissions, not just "share your data" features.</li>
          </ul>

          <h2>How The Dashboard Improves Health Outcomes</h2>
          <p>
            Research shows that consistent health tracking improves outcomes. The WLPL Dashboard makes tracking
            effortless through:
          </p>
          <ul>
            <li><strong>Visual Feedback:</strong> Seeing progress charts motivates continued effort</li>
            <li><strong>Accountability:</strong> Family members can support each other's goals</li>
            <li><strong>Early Warning:</strong> Alerts catch health issues before they become serious</li>
            <li><strong>Data-Driven Decisions:</strong> AI insights guide better food choices and lifestyle changes</li>
            <li><strong>Provider Communication:</strong> Export reports to share with doctors and specialists</li>
          </ul>

          <h2>Getting Started With Your Dashboard</h2>
          <p>
            Setting up your WLPL Dashboard takes less than 5 minutes:
          </p>
          <ol>
            <li>Sign up for a free trial (no credit card required)</li>
            <li>Create patient profiles for yourself and family members</li>
            <li>Log your first meal or weight entry</li>
            <li>Watch the Dashboard populate with insights and trends</li>
            <li>Invite family members to collaborate</li>
          </ol>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Take Control of Your Family's Health?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Start your free 14-day trial and experience the power of a unified health dashboard for your entire family.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
            >
              Start Free Trial
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

// Helper Components
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-blue-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function DashboardSection({ title, description, features }: { title: string; description: string; features: string[] }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6">
      <h3 className="text-2xl font-semibold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      <ul className="space-y-2">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2 text-muted-foreground">
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BenefitCard({ emoji, title, benefits }: { emoji: string; title: string; benefits: string[] }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6">
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className="text-xl font-semibold text-foreground mb-4">{title}</h3>
      <ul className="space-y-2">
        {benefits.map((benefit, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function UseCaseCard({ title, scenario, solution }: { title: string; scenario: string; solution: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6">
      <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
      <div className="space-y-3">
        <div>
          <span className="font-semibold text-blue-600">Scenario:</span>
          <p className="text-muted-foreground mt-1">{scenario}</p>
        </div>
        <div>
          <span className="font-semibold text-green-600">Solution:</span>
          <p className="text-muted-foreground mt-1">{solution}</p>
        </div>
      </div>
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
