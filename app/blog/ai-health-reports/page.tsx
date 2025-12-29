/**
 * Ai Health Reports - Marketing Blog Page
 *
 * Hybrid marketing page showcasing WLPL Ai Health Reports
 * Optimized for SEO with top-notch backlinks and conversion funnel
 */

import Link from 'next/link'
import { Metadata } from 'next'
import {
  CheckCircleIcon,
  SparklesIcon,
  UserCircleIcon,
  DocumentTextIcon, LightBulbIcon, ExclamationCircleIcon, ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'
import { ArrowTrendingUpIcon } from '@heroicons/react/24/solid'

export const metadata: Metadata = {
  title: 'Weekly Health Reports - Personalized Insights and Recommendations | Weight Loss Projection Lab',
  description: 'Get weekly health reports with personalized recommendations based on your meal patterns, weight trends, vital signs, and activity data. Powered by Weight Loss Projection Lab.',
  keywords: 'health reports, health insights, personalized recommendations, health coach, health analysis, weekly health summary, WLPL reports',
  openGraph: {
    title: 'Weekly Health Reports - Personalized Insights and Recommendations',
    description: 'Get weekly health reports with personalized recommendations based on your meal patterns, weight trends, vital signs, and activity data. Powered by Weight Loss Projection Lab.',
    type: 'article',
    url: 'https://weightlossproglab.com/blog/ai-health-reports',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weekly Health Reports - Personalized Insights and Recommendations',
    description: 'Get weekly health reports with personalized recommendations based on your meal patterns, weight trends, vital signs, and activity data. Powered by Weight Loss Projection Lab.',
  },
  alternates: {
    canonical: 'https://weightlossproglab.com/blog/ai-health-reports'
  }
}

export default function AihealthreportsBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-600 text-white overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm font-medium">WLPL Feature</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">Personalized Insights and Recommendations</h1>
            <p className="text-xl text-white/90 mb-8 leading-relaxed">
              Get weekly health reports with personalized recommendations based on your meal patterns, weight trends, vital signs, and activity data. Powered by Weight Loss Projection Lab.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
              >
                Start Free Trial
              </Link>
              <Link
                href="/docs"
                className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-semibold"
              >
                View Documentation
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Key Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Key Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<SparklesIcon className="w-12 h-12 text-blue-600" />}
              title="Intelligent Analysis"
              description="WLPL platform analyzes your health data for actionable insights"
            />
            <FeatureCard
              icon={<DocumentTextIcon className="w-12 h-12 text-blue-600" />}
              title="Weekly Reports"
              description="Delivered every Monday with comprehensive health summary"
            />
            <FeatureCard
              icon={<LightBulbIcon className="w-12 h-12 text-blue-600" />}
              title="Personalized Recommendations"
              description="Diet tips, exercise suggestions, and health alerts tailored to you"
            />
            <FeatureCard
              icon={<ExclamationCircleIcon className="w-12 h-12 text-blue-600" />}
              title="Risk Alerts"
              description="Early warnings for weight plateaus, abnormal vitals, or missed medications"
            />
            <FeatureCard
              icon={<ClipboardDocumentListIcon className="w-12 h-12 text-blue-600" />}
              title="Shopping List Suggestions"
              description="Platform generates shopping lists based on your meal patterns and goals"
            />
            <FeatureCard
              icon={<ArrowTrendingUpIcon className="w-12 h-12 text-blue-600" />}
              title="Progress Insights"
              description="Celebrate wins and identify areas for improvement with data-driven feedback"
            />
          </div>
        </section>

        {/* Who Benefits */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Who Benefits?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <BenefitCard
              emoji="👤"
              title="Solo Users"
              benefits={[
                'Personal health tracking and goal management',
                'Intelligent insights tailored to your needs',
                'Privacy-focused data control',
                'Mobile and desktop access'
              ]}
            />
            <BenefitCard
              emoji="👨‍👩‍👧‍👦"
              title="Families"
              benefits={[
                'Track health for multiple family members',
                'Coordinate care between caregivers',
                'Shared calendar and notifications',
                'Individual privacy controls per member'
              ]}
            />
            <BenefitCard
              emoji="🩺"
              title="Healthcare Providers"
              benefits={[
                'Monitor patient data between visits',
                'Receive alerts for abnormal values',
                'Export reports for medical records',
                'HIPAA-compliant access and storage'
              ]}
            />
          </div>
        </section>

        {/* Related Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">Related Platform Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RelatedLink href="/blog/dashboard" title="Dashboard" description="Centralized health command center" />
            <RelatedLink href="/blog/profile" title="Profile" description="Personalized health settings" />
            <RelatedLink href="/blog/family-care" title="Family Care" description="Multi-patient health management" />
            <RelatedLink href="/pricing" title="Pricing" description="Flexible plans for every need" />
            <RelatedLink href="/support" title="Support" description="Get help when you need it" />
            <RelatedLink href="/docs" title="Documentation" description="Comprehensive platform guides" />
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Start your free 14-day trial and experience the power of comprehensive health tracking.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
            >
              Start Free Trial
            </Link>
          </div>
          <p className="text-sm text-blue-200 mt-6">
            No credit card required • 14-day free trial • Cancel anytime
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
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-blue-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
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

function RelatedLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="bg-card rounded-lg border-2 border-border p-4 hover:border-blue-300 hover:shadow-lg transition-all block">
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
