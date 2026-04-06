import Link from 'next/link'
import type { Metadata } from 'next'

// Force static generation for maximum performance
export const dynamic = 'force-static'
export const revalidate = false

export const metadata: Metadata = {
  title: 'Wellness Projection Lab — Family Health Tracking for Caregivers',
  description: 'Track vitals, medications, meals, and appointments for your entire family. From newborns to seniors to pets — one HIPAA-compliant platform. Share access with caregivers instantly.',
}

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-64 h-64 mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-green-500 rounded-full opacity-10 animate-pulse"></div>
            <div className="absolute inset-8 bg-gradient-to-br from-blue-400 to-green-400 rounded-full opacity-20 flex items-center justify-center">
              <div className="text-7xl">&#x1F468;&#x200D;&#x1F469;&#x200D;&#x1F467;&#x200D;&#x1F466;</div>
            </div>
            <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
              <span className="text-3xl">&#x1F489;</span>
            </div>
            <div className="absolute bottom-8 left-4 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
              <span className="text-3xl">&#x1F9D3;</span>
            </div>
            <div className="absolute top-12 left-0 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
              <span className="text-3xl">&#x1F43E;</span>
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">
            Your Entire Family's Health. One Place.
          </h1>
          <p className="text-xl text-muted-foreground font-sans max-w-2xl mx-auto">
            Track vitals, medications, meals, and appointments for everyone — kids, parents, grandparents, even pets. Share access with your spouse, sitter, or doctor in seconds.
          </p>
        </div>

        {/* Value Props */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-4xl">&#x1F48A;</span>
            </div>
            <h3 className="font-bold text-foreground mb-2 text-lg">Never Miss a Medication Again</h3>
            <p className="text-sm text-muted-foreground">
              Set reminders, track doses, and flag interactions. For every family member, all in one place.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow border-2 border-transparent hover:border-green-200 dark:hover:border-green-800">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <span className="text-4xl">&#x1F4CB;</span>
            </div>
            <h3 className="font-bold text-foreground mb-2 text-lg">One Dashboard for Everyone</h3>
            <p className="text-sm text-muted-foreground">
              Kids, seniors, pets — each with their own health profile, vitals history, and medical records.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow border-2 border-transparent hover:border-purple-200 dark:hover:border-purple-800">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-4xl">&#x1F91D;</span>
            </div>
            <h3 className="font-bold text-foreground mb-2 text-lg">Share Access Instantly</h3>
            <p className="text-sm text-muted-foreground">
              Grant caregivers, spouses, or sitters the exact permissions they need. No more texting medical info.
            </p>
          </div>
        </div>

        {/* Social Proof — Testimonials */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl shadow-2xl p-8 text-white">
          <h2 className="text-center text-2xl font-bold mb-6">Trusted by Families Like Yours</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-5">
              <p className="text-sm mb-3 italic">"I manage my toddler, my mom with diabetes, and our dog's vet schedule. WPL replaced 4 apps."</p>
              <div className="text-sm font-semibold">Sarah M.</div>
              <div className="text-xs opacity-80">Working mom, 3 family profiles</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-5">
              <p className="text-sm mb-3 italic">"My wife and I can both see our dad's vitals and medication schedule. It's been a lifesaver."</p>
              <div className="text-sm font-semibold">Marcus T.</div>
              <div className="text-xs opacity-80">Family caregiver</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-5">
              <p className="text-sm mb-3 italic">"The AI meal logging saves me 20 minutes a day. I actually track consistently now."</p>
              <div className="text-sm font-semibold">Diana L.</div>
              <div className="text-xs opacity-80">Busy parent, 2 kids</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Built for Families Who Care</h2>
          <Link
            href="/auth"
            className="inline-block bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-bold text-xl px-12 py-5 rounded-full shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105"
            aria-label="Create your family health hub"
          >
            Create Your Family Health Hub
          </Link>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Free 7-day trial. Cancel anytime. HIPAA compliant.
          </p>
        </div>

        {/* Trust Badges */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="text-lg">&#x1F3E5;</span> HIPAA Compliant
            </span>
            <span className="flex items-center gap-1">
              <span className="text-lg">&#x1F46A;</span> Family Sharing Built In
            </span>
            <span className="flex items-center gap-1">
              <span className="text-lg">&#x1F4F1;</span> Works on Any Device
            </span>
          </div>
        </div>

        {/* For Practitioners */}
        <div className="text-center pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-muted-foreground">
            Are you a nurse or care provider?{' '}
            <Link href="/franchise" className="text-blue-600 dark:text-blue-400 font-medium underline hover:no-underline">
              License our platform &rarr;
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
