/**
 * Profile Management - Marketing Blog Page
 *
 * Hybrid marketing page showcasing WPL Profile Management.
 * Reframed around the AI learning your health identity to detect anomalies.
 * Optimized for SEO with top-notch backlinks and conversion funnel.
 */

import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { blogPostingSchema } from '@/lib/json-ld'
import { Metadata } from 'next'
import {
  UserCircleIcon,
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  HeartIcon,
  CalendarIcon,
  CheckCircleIcon,
  SparklesIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { Screenshot, ScreenshotGallery } from '@/components/ui/Screenshot'

export const metadata: Metadata = {
  title: 'Your Health Identity — The AI Learns What&apos;s Normal So It Can Spot What Isn&apos;t | Wellness Projection Lab',
  description: 'Build your intelligent health identity with WPL. Set dietary preferences, allergies, weight goals, and privacy controls — then let the AI learn your patterns to deliver personalized insights and catch anomalies early.',
  keywords: 'health identity, AI health profile, personalized health tracking, dietary preferences, food allergies, weight goals, privacy settings, intelligent health monitoring, anomaly detection',
  openGraph: {
    title: 'Your Health Identity — The AI Learns What\'s Normal So It Can Spot What Isn\'t',
    description: 'Build your intelligent health identity. The AI learns your patterns to deliver personalized insights and catch anomalies before they become problems.',
    type: 'article',
    images: [{ url: 'https://www.wellnessprojectionlab.com/screenshots/family-care/family-dashboard-overview-desktop-light.png', width: 1200, height: 630, alt: 'Wellness Projection Lab - Profile' }],
    url: 'https://www.wellnessprojectionlab.com/blog/profile',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://www.wellnessprojectionlab.com/screenshots/family-care/family-dashboard-overview-desktop-light.png'],
    title: 'Your Health Identity — The AI Learns What\'s Normal So It Can Spot What Isn\'t',
    description: 'Build your intelligent health identity. The AI learns your patterns to deliver personalized insights and catch anomalies before they become problems.',
  },
  alternates: {
    canonical: 'https://www.wellnessprojectionlab.com/blog/profile'
  }
}

export default function ProfileBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <JsonLd
        data={blogPostingSchema({
          headline: 'Your Health Identity — The AI Learns What&apos;s Normal So It Can Spot What Isn&apos;t',
          description: 'Build your intelligent health identity with WPL. Set dietary preferences, allergies, weight goals, and privacy controls — then let the AI learn your patterns to deliver personalized insights and catch anomalies early.',
          slug: 'profile',
          image: '/screenshots/family-care/family-dashboard-overview-desktop-light.png',
          datePublished: '2026-01-15T00:00:00-05:00',
          keywords: 'health identity, AI health profile, personalized health tracking, dietary preferences, food allergies, weight goals, privacy settings, intelligent health monitoring, anomaly detection',
        })}
      />
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Intelligent Health Identity</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Your Health Identity — The AI Learns What&apos;s Normal So It Can Spot What Isn&apos;t
            </h1>
            <p className="text-xl text-purple-100 mb-8 leading-relaxed">
              Your profile isn&apos;t just settings — it&apos;s the foundation the AI builds on. Dietary preferences, allergies,
              medications, and baselines come together to create a health identity that gets smarter every day.
              When something changes, the AI notices before you do.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-indigo-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
              >
                Start Free Trial
              </Link>
              <Link
                href="/docs"
                className="px-8 py-4 bg-purple-500 text-white rounded-lg hover:bg-purple-400 transition-colors font-semibold"
              >
                View Documentation
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Why Your Profile Matters - Problem Section */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-4 text-center">Why Your Profile Matters</h2>
          <p className="text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-12">
            Without a complete health identity, even the smartest AI is guessing. Here&apos;s what happens when health tools don&apos;t know you.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon={<XCircleIcon className="w-10 h-10 text-red-500" />}
              title="Generic Recommendations"
              description="Without your profile, the AI suggests 2,000 calories for everyone. Your height, weight, age, and activity level make the difference between advice that works and advice that wastes your time."
            />
            <ProblemCard
              icon={<ExclamationTriangleIcon className="w-10 h-10 text-red-500" />}
              title="Missed Allergens"
              description="A meal looks healthy — but it contains soy, and your daughter is severely allergic. Without her dietary profile, the system can&apos;t flag what it doesn&apos;t know about."
            />
            <ProblemCard
              icon={<ShieldCheckIcon className="w-10 h-10 text-red-500" />}
              title="Privacy Left to Chance"
              description="Who can see your weight? Your medications? Your lab results? Without privacy controls configured, you&apos;re trusting defaults instead of making deliberate choices."
            />
          </div>
        </section>

        {/* Screenshot Showcase */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Profile & Settings in Action</h2>

          {/* Primary Screenshots */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Screenshot
              src="/screenshots/settings/profile-overview-desktop-light.png"
              alt="WPL Profile page showing currently viewing test user (Child's Health Profile), family member dropdown selector, Advanced Health Profile section with HIPAA encryption notice, Profile Summary, Dietary & Allergy Information, and Medications sections"
              caption="Profile Overview - Switch between family members and manage health information"
              priority
              zoomable
            />
            <Screenshot
              src="/screenshots/settings/subscription-account-desktop-light.png"
              alt="Account Information showing email, account created date (11/2/2025), and Subscription section with Family Premium plan badge, 5 of unlimited family members indicator, Active status, and View Plans button"
              caption="Account & Subscription - Manage your plan and family members"
              zoomable
            />
          </div>

          {/* Security & Notifications */}
          <h3 className="text-2xl font-bold text-foreground mb-6 text-center">Security & Notifications</h3>
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Screenshot
              src="/screenshots/settings/biometric-auth-desktop-light.png"
              alt="Biometric Authentication section showing Touch ID / Face ID currently Disabled, with Set Up Biometric Authentication button and compatible devices list (iPhone with Touch/Face ID, Android with fingerprint, Windows with Windows Hello)"
              caption="Biometric Authentication - Secure login with Face ID or Touch ID"
              zoomable
            />
            <Screenshot
              src="/screenshots/settings/notification-preferences-desktop-light.png"
              alt="Notification Preferences with Enable All Notifications master switch and Medication & Health section showing toggles for Email and Push notifications for Medication Added, Updated, Deleted, Reminders, Vital Signs Logged, Alerts, and Weight Logged"
              caption="Notification Preferences - Customize alerts via email and push"
              zoomable
            />
          </div>

          {/* Notification Details */}
          <h3 className="text-2xl font-bold text-foreground mb-6 text-center">Granular Notification Controls</h3>
          <ScreenshotGallery
            screenshots={[
              {
                src: '/screenshots/settings/notifications-documents-desktop-light.png',
                alt: 'Documents & Reports notifications: Document Uploaded and Health Report Generated with Email and Push toggles',
                caption: 'Document notifications'
              },
              {
                src: '/screenshots/settings/notifications-appointments-desktop-light.png',
                alt: 'Appointments notifications: Appointment Scheduled, Updated, Cancelled, and Reminders with Email and Push toggles',
                caption: 'Appointment alerts'
              },
              {
                src: '/screenshots/settings/notifications-family-desktop-light.png',
                alt: 'Family & Account notifications: Family Member Invited, Joined, and Patient Added with Email and Push toggles',
                caption: 'Family activity notifications'
              },
              {
                src: '/screenshots/settings/quiet-hours-desktop-light.png',
                alt: 'Quiet Hours feature showing Start Time (10 PM) and End Time (7 AM) dropdowns with toggle to pause push notifications during these hours',
                caption: 'Quiet Hours - Pause notifications while sleeping'
              }
            ]}
          />

          {/* Vital Reminders */}
          <h3 className="text-2xl font-bold text-foreground mb-6 text-center mt-12">Health Tracking Reminders</h3>
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Screenshot
              src="/screenshots/vitals-tracking/vital-reminders-desktop-light.png"
              alt="Vital Sign Reminders configuration for test user showing Blood Pressure Reminders (Daily check-in frequency), Blood Sugar Reminders (Daily), and Temperature Reminders (Weekly) with toggle switches"
              caption="Vital Sign Reminders - Automated health tracking prompts"
              zoomable
            />
            <Screenshot
              src="/screenshots/vitals-tracking/vitals-reminders-config-desktop-light.png"
              alt="Additional vital reminders showing Pulse Oximeter Reminders (Daily), Weight Reminders (Weekly), and Mood Reminders (Daily) with tip about using Vitals Wizard for specific times and compliance tracking"
              caption="Complete vitals reminder configuration options"
              zoomable
            />
          </div>

          {/* Privacy & Data */}
          <h3 className="text-2xl font-bold text-foreground mb-6 text-center">Privacy & Data Management</h3>
          <Screenshot
            src="/screenshots/settings/privacy-data-export-desktop-light.png"
            alt="Privacy & Data section showing Export button to download personal data, Reset All Data & Start Over warning box explaining permanent deletion of all data including meals, weight logs, and progress, with blue Reset All Data & Start Over button and red Sign Out button. Footer shows WPL - Wellness Projection Lab, Version 1.0.0, Privacy-focused • Secure • Accessible"
            caption="Data Export & Account Management - Full control over your health data"
            zoomable
          />
        </section>

        {/* What Is Profile Management */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">Your Profile Is the AI&apos;s Foundation</h2>
          <div className="max-w-4xl mx-auto text-lg text-muted-foreground space-y-4">
            <p>
              Your <strong>WPL Health Identity</strong> is more than a settings page — it&apos;s the baseline the AI uses to understand you.
              Height, weight, dietary restrictions, allergies, medications, and health goals create a complete picture that powers
              every recommendation, every analysis, and every alert.
            </p>
            <p>
              When you log a meal, the AI checks it against your allergies. When your blood pressure trends upward, the AI compares
              it to your baseline. When you&apos;re managing diabetes while following a vegan diet, the AI adapts its suggestions to
              fit both constraints simultaneously. The more complete your profile, the smarter the AI becomes.
            </p>
          </div>
        </section>

        {/* Key Features - Benefit-First */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">What Your Profile Unlocks</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<UserCircleIcon className="w-12 h-12 text-indigo-600" />}
              title="Accurate Calorie Targets"
              description="Your age, height, weight, and activity level drive precise calorie calculations — not generic 2,000-calorie guesses."
            />
            <FeatureCard
              icon={<HeartIcon className="w-12 h-12 text-red-600" />}
              title="Meals That Match Your Life"
              description="Vegan, keto, Mediterranean, low-carb — the AI only suggests meals that fit your dietary choices and excludes what doesn&apos;t."
            />
            <FeatureCard
              icon={<ShieldCheckIcon className="w-12 h-12 text-green-600" />}
              title="Allergen Safety Net"
              description="Every meal photo is scanned against your allergy list. Peanuts, dairy, gluten — the AI flags dangers before they reach your plate."
            />
            <FeatureCard
              icon={<CalendarIcon className="w-12 h-12 text-blue-600" />}
              title="Goals That Track Themselves"
              description="Set your target weight and date. The AI calculates your daily deficit, tracks progress, and adjusts recommendations as you go."
            />
            <FeatureCard
              icon={<BellIcon className="w-12 h-12 text-orange-600" />}
              title="Alerts Without Annoyance"
              description="Meal reminders, weight check-ins, medication alerts — on your schedule, through your preferred channels, with quiet hours respected."
            />
            <FeatureCard
              icon={<LockClosedIcon className="w-12 h-12 text-purple-600" />}
              title="Privacy You Control"
              description="Decide exactly who sees what — per family member, per data type. Caregivers get what they need, nothing more."
            />
            <FeatureCard
              icon={<CogIcon className="w-12 h-12 text-gray-600" />}
              title="Activity Targets That Motivate"
              description="Daily step goals, calorie targets, and meal schedules personalized to your fitness level and lifestyle — not someone else&apos;s."
            />
            <FeatureCard
              icon={<SparklesIcon className="w-12 h-12 text-pink-600" />}
              title="AI That Knows Your Baseline"
              description="The AI learns what&apos;s normal for YOU. When vitals shift, eating patterns change, or goals stall, it flags the deviation early."
            />
            <FeatureCard
              icon={<CheckCircleIcon className="w-12 h-12 text-teal-600" />}
              title="Guided Setup, Full Power"
              description="A progress tracker shows what&apos;s complete and what&apos;s missing. Fill in more, unlock more — the AI gets smarter with every detail."
            />
          </div>
        </section>

        {/* Profile Sections */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">What You Can Customize</h2>
          <div className="space-y-8">
            <ProfileSection
              icon={<UserCircleIcon className="w-7 h-7 text-indigo-600" />}
              title="Basic Information"
              description="The foundation for accurate calculations and age-appropriate recommendations."
              features={[
                'Full name and email address',
                'Date of birth for age-based recommendations',
                'Height (imperial or metric units)',
                'Current weight with automatic BMI calculation',
                'Gender for tailored calorie calculations'
              ]}
            />
            <ProfileSection
              icon={<CalendarIcon className="w-7 h-7 text-blue-600" />}
              title="Health Goals"
              description="Define targets and the AI tracks, calculates, and adjusts to keep you on pace."
              features={[
                'Target weight with realistic goal date',
                'Daily calorie goal (auto-calculated or custom)',
                'Daily step goal (default 10,000 steps)',
                'Weight check-in frequency (daily, weekly, bi-weekly)',
                'Goal visualization with milestone tracking'
              ]}
            />
            <ProfileSection
              icon={<HeartIcon className="w-7 h-7 text-red-600" />}
              title="Dietary Preferences"
              description="Multiple dietary patterns supported — the AI respects all of them simultaneously."
              features={[
                'Vegan, Vegetarian, Pescatarian',
                'Keto, Paleo, Low-Carb, Mediterranean',
                'Gluten-Free, Dairy-Free, Nut-Free',
                'Halal, Kosher, Organic-Only',
                'Custom combinations (e.g., Vegan + Gluten-Free)'
              ]}
            />
            <ProfileSection
              icon={<ExclamationTriangleIcon className="w-7 h-7 text-amber-600" />}
              title="Food Allergies & Intolerances"
              description="Safety-first with automatic allergen detection in every meal and recipe."
              features={[
                'Common allergens: Peanuts, Tree Nuts, Soy, Dairy, Eggs, Shellfish, Fish, Wheat',
                'AI meal analysis flags potential allergens with warnings',
                'Recipe filtering excludes unsafe ingredients',
                'Shopping list removes allergen-containing products',
                'Family member-specific allergy tracking'
              ]}
            />
            <ProfileSection
              icon={<BellIcon className="w-7 h-7 text-orange-600" />}
              title="Notification Settings"
              description="Stay on track with reminders that respect your schedule and attention."
              features={[
                'Meal logging reminders (breakfast, lunch, dinner, snack)',
                'Weight check-in reminders based on frequency preference',
                'Appointment reminders (7, 3, 1 day before)',
                'Medication reminders with dose tracking',
                'Weekly AI health report delivery',
                'Push, email, or SMS notification channels'
              ]}
            />
            <ProfileSection
              icon={<LockClosedIcon className="w-7 h-7 text-purple-600" />}
              title="Privacy & Sharing"
              description="Granular control over who sees your health data — per person, per data type."
              features={[
                'Family member visibility controls (per patient)',
                'External caregiver permissions (view-only, edit, admin)',
                'Healthcare provider data sharing consent',
                'Data export and download capabilities',
                'Account deletion and data retention policies'
              ]}
            />
          </div>
        </section>

        {/* Consequences of NOT Setting Up Profile */}
        <section className="mb-20">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl font-bold text-foreground mb-6 text-center">What Happens Without a Complete Profile</h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="flex items-start gap-3">
                <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Generic calorie targets</p>
                  <p className="text-sm text-muted-foreground">The AI defaults to population averages instead of your actual needs</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">No allergen warnings</p>
                  <p className="text-sm text-muted-foreground">Meal analysis can&apos;t flag what it doesn&apos;t know about</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Irrelevant meal suggestions</p>
                  <p className="text-sm text-muted-foreground">You&apos;re vegan but seeing steak recipes — because the AI doesn&apos;t know</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">No anomaly detection</p>
                  <p className="text-sm text-muted-foreground">Without a baseline, the AI can&apos;t tell what&apos;s unusual for you</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Notification overload</p>
                  <p className="text-sm text-muted-foreground">Default alerts for everything instead of what matters to you</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Privacy defaults</p>
                  <p className="text-sm text-muted-foreground">Sharing settings you didn&apos;t choose controlling who sees your data</p>
                </div>
              </div>
            </div>
            <p className="text-center text-muted-foreground mt-8">
              Setting up your profile takes 3 minutes. The AI takes it from there.
            </p>
          </div>
        </section>

        {/* Who Benefits */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Who Benefits From a Complete Health Identity?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <BenefitCard
              icon={<UserCircleIcon className="w-10 h-10 text-indigo-600" />}
              title="Solo Health Trackers"
              benefits={[
                'AI meal and exercise recommendations tuned to your body',
                'Allergy-safe food suggestions and real-time warnings',
                'Custom calorie and step goals based on your stats',
                'Notification schedules that fit your routine'
              ]}
            />
            <BenefitCard
              icon={<HeartIcon className="w-10 h-10 text-pink-600" />}
              title="Family Caregivers"
              benefits={[
                'Separate profiles for each family member',
                'Individual dietary needs and allergies per person',
                'Different weight goals and tracking frequencies',
                'Shared calendar with per-person privacy controls'
              ]}
            />
            <BenefitCard
              icon={<ShieldCheckIcon className="w-10 h-10 text-green-600" />}
              title="Healthcare Providers"
              benefits={[
                'View patient preferences before appointments',
                'Understand dietary restrictions and allergies instantly',
                'Track goal adherence and progress over time',
                'Export patient data for medical records'
              ]}
            />
          </div>
        </section>

        {/* Real-World Use Cases */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Real-World Profile Use Cases</h2>
          <div className="space-y-6">
            <UseCaseCard
              title="Managing Type 2 Diabetes with Custom Goals"
              scenario="David has Type 2 diabetes and needs to track carbs carefully while losing 30 lbs. His doctor recommended 150g carbs/day."
              solution="David sets &apos;Low-Carb&apos; dietary preference, adds &apos;Dairy&apos; allergy (lactose intolerant), and sets a custom 1,800 calorie goal. The AI now excludes dairy, shows carb counts prominently, and alerts him when meals exceed his carb limit."
            />
            <UseCaseCard
              title="Vegan Family with Multiple Allergies"
              scenario="The Martinez family is vegan with a child allergic to nuts and soy. They need meal plans safe for everyone."
              solution="Each family member has &apos;Vegan&apos; preference set. The child&apos;s profile adds peanut, tree nut, and soy allergies. Meal recommendations and shopping lists exclude all allergens automatically — per person, not per household."
            />
            <UseCaseCard
              title="Busy Professional Optimizing Notifications"
              scenario="Emma travels frequently and wants meal reminders only on weekdays, with no weekend interruptions."
              solution="Emma customizes notification preferences: meal reminders Monday-Friday only, weekly weight check-ins on Sunday morning, push notifications off during travel, SMS only for urgent health alerts. Quiet hours from 10 PM to 7 AM."
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
                  Data Storage
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>Real-time sync across all devices via Firestore</li>
                  <li>Automatic backup and version history</li>
                  <li>HIPAA-compliant data encryption (AES-256)</li>
                  <li>Data export in JSON, CSV, PDF formats</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  AI Integration
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>Profile data powers all personalized recommendations</li>
                  <li>Allergen detection in meal photos against your allergy list</li>
                  <li>Dietary preference filtering for recipes and suggestions</li>
                  <li>Baseline learning for anomaly detection in vitals</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  Notifications
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>Multi-channel: Push, Email, SMS</li>
                  <li>Timezone-aware scheduling</li>
                  <li>Smart frequency (no spam)</li>
                  <li>One-click unsubscribe per category</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  Security
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>Two-factor authentication (2FA) support</li>
                  <li>Biometric login (Face ID, Touch ID)</li>
                  <li>Session management with auto-logout</li>
                  <li>Audit logs for all profile changes</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Related Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">Related Platform Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RelatedLink href="/blog/dashboard" title="Dashboard" description="Centralized health command center with real-time metrics" />
            <RelatedLink href="/blog/meal-tracking" title="Meal Tracking" description="Photo meal logging with allergen detection powered by your profile" />
            <RelatedLink href="/blog/weight-tracking" title="Weight Tracking" description="Track progress toward the weight goals you set in your profile" />
            <RelatedLink href="/blog/family-care" title="Family Care" description="Manage separate profiles for every family member" />
            <RelatedLink href="/blog/ai-health-reports" title="AI Health Reports" description="Personalized insights built on your health identity" />
            <RelatedLink href="/blog/medical-documents" title="Medical Documents" description="Insurance cards, lab results, and prescriptions — always accessible" />
          </div>
        </section>

        {/* SEO-Optimized Content */}
        <section className="mb-20 prose prose-lg max-w-4xl mx-auto">
          <h2>Why Your Health Identity Changes Everything</h2>
          <p>
            Generic health apps treat everyone the same. WPL&apos;s intelligent health identity ensures your experience is
            tailored to your unique health situation, dietary needs, and personal goals — and it gets smarter over time.
          </p>
          <ul>
            <li><strong>Safety First:</strong> Food allergy detection prevents dangerous mistakes in meal logging and recipe recommendations.</li>
            <li><strong>Accurate AI:</strong> Dietary preferences ensure meal suggestions match your lifestyle (vegan, keto, gluten-free, etc.).</li>
            <li><strong>Anomaly Detection:</strong> The AI learns your baselines — when vitals, eating patterns, or activity deviate, you get early alerts.</li>
            <li><strong>Realistic Goals:</strong> Custom calorie and weight targets based on your age, height, and activity level.</li>
            <li><strong>No Spam:</strong> Notification preferences prevent alert fatigue while keeping you on track.</li>
            <li><strong>True Privacy:</strong> Granular sharing controls let you decide who sees what health data.</li>
          </ul>

          <h2>How Your Profile Powers the Entire Platform</h2>
          <p>
            Your profile isn&apos;t just settings — it&apos;s the engine that drives personalization across every feature:
          </p>
          <ul>
            <li><strong>Meal Tracking:</strong> WPL analyzes photos for allergens and flags foods that don&apos;t match your dietary preferences</li>
            <li><strong>Shopping Lists:</strong> Automatically filters products based on allergies and diet type</li>
            <li><strong>Recipes:</strong> Shows only recipes that match your preferences and exclude allergens</li>
            <li><strong>Health Reports:</strong> AI recommendations consider your specific goals and baseline, not generic averages</li>
            <li><strong>Vitals Monitoring:</strong> The AI knows what&apos;s normal for you and flags deviations early</li>
            <li><strong>Inventory:</strong> Smart expiration alerts for foods you actually eat</li>
          </ul>

          <h2>Getting Started With Your Health Identity</h2>
          <p>
            Setting up your WPL health identity takes about 3 minutes and unlocks the full power of personalized, intelligent health tracking:
          </p>
          <ol>
            <li>Enter basic info (height, weight, age) for accurate calorie calculations</li>
            <li>Set weight goal and target date for progress tracking</li>
            <li>Add dietary preferences (vegan, keto, etc.) for meal recommendations</li>
            <li>List food allergies for safety warnings and filtering</li>
            <li>Customize notification preferences to stay on track without annoyance</li>
            <li>Adjust privacy settings if sharing with family or caregivers</li>
          </ol>
          <p>
            Your profile is always editable. As your health journey evolves, update your goals, preferences, and settings
            anytime from the <Link href="/profile" className="text-primary hover:underline">Profile Settings</Link> page.
            The AI adapts with you.
          </p>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Set Up Your Health Identity in 3 Minutes. The AI Takes It From There.</h2>
          <p className="text-xl text-purple-100 mb-8 max-w-3xl mx-auto">
            Your dietary preferences, allergies, goals, and baselines become the foundation for every recommendation,
            every alert, and every insight. The more the AI knows, the better it protects you.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-indigo-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
            >
              Start Free Trial
            </Link>
          </div>
          <p className="text-sm text-purple-200 mt-6">
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

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-indigo-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function ProfileSection({ icon, title, description, features }: { icon: React.ReactNode; title: string; description: string; features: string[] }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <h3 className="text-2xl font-semibold text-foreground">{title}</h3>
      </div>
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

function BenefitCard({ icon, title, benefits }: { icon: React.ReactNode; title: string; benefits: string[] }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6">
      <div className="mb-3">{icon}</div>
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
          <span className="font-semibold text-indigo-600">Scenario:</span>
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
    <Link href={href} className="bg-card rounded-lg border-2 border-border p-4 hover:border-indigo-300 hover:shadow-lg transition-all block">
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
