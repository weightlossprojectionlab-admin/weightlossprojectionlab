/**
 * Profile Management - Marketing Blog Page
 *
 * Hybrid marketing page showcasing WPL Profile Management
 * Optimized for SEO with top-notch backlinks and conversion funnel
 */

import Link from 'next/link'
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
  LockClosedIcon
} from '@heroicons/react/24/outline'
import { Screenshot, ScreenshotGallery } from '@/components/ui/Screenshot'

export const metadata: Metadata = {
  title: 'User Profile Management - Personalized Health Settings | Wellness Projection Lab',
  description: 'Customize your health journey with comprehensive profile settings. Set dietary preferences, food allergies, weight goals, notification preferences, and privacy controls for personalized health tracking.',
  keywords: 'user profile, health settings, dietary preferences, food allergies, weight goals, privacy settings, notification preferences, personalized health tracking',
  openGraph: {
    title: 'User Profile Management - Personalized Health Settings',
    description: 'Customize your health journey with comprehensive profile settings. Set dietary preferences, food allergies, weight goals, and more.',
    type: 'article',
    url: 'https://weightlossproglab.com/blog/profile',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'User Profile Management - Personalized Health Settings',
    description: 'Customize your health journey with comprehensive profile settings. Set dietary preferences, food allergies, weight goals, and more.',
  },
  alternates: {
    canonical: 'https://weightlossproglab.com/blog/profile'
  }
}

export default function ProfileBlogPage() {
  return (
    <div className="min-h-screen bg-background">
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
              <span className="text-sm font-medium">Personalized Health Tracking</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">Your Health Profile, Your Way</h1>
            <p className="text-xl text-purple-100 mb-8 leading-relaxed">
              Customize every aspect of your health journey with comprehensive profile settings. Set dietary preferences, food allergies, weight goals, and notification preferences for a truly personalized experience.
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
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">What Is Profile Management?</h2>
          <div className="max-w-4xl mx-auto text-lg text-muted-foreground space-y-4">
            <p>
              Your <strong>WPL Profile</strong> is the control center for your personalized health journey.
              From dietary restrictions and food allergies to weight goals and notification preferences, your profile
              ensures every feature works perfectly for your unique needs.
            </p>
            <p>
              Whether you're managing diabetes, following a vegan diet, or tracking specific health metrics, your profile
              settings ensure AI recommendations, meal suggestions, and health insights are tailored exactly to you.
            </p>
          </div>
        </section>

        {/* Key Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Profile Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<UserCircleIcon className="w-12 h-12 text-indigo-600" />}
              title="Personal Information"
              description="Name, email, date of birth, height, and current weight. Update anytime with full privacy control."
            />
            <FeatureCard
              icon={<HeartIcon className="w-12 h-12 text-red-600" />}
              title="Dietary Preferences"
              description="Vegan, vegetarian, keto, paleo, low-carb, and more. AI meal suggestions adapt to your choices."
            />
            <FeatureCard
              icon={<ShieldCheckIcon className="w-12 h-12 text-green-600" />}
              title="Food Allergies"
              description="Set allergies and intolerances. System automatically flags unsafe foods in meal logs and recipes."
            />
            <FeatureCard
              icon={<CalendarIcon className="w-12 h-12 text-blue-600" />}
              title="Weight Goals"
              description="Set target weight, goal date, and weight check-in frequency (daily, weekly, bi-weekly)."
            />
            <FeatureCard
              icon={<BellIcon className="w-12 h-12 text-orange-600" />}
              title="Notification Preferences"
              description="Control meal reminders, weight check-in alerts, appointment notifications, and AI health reports."
            />
            <FeatureCard
              icon={<LockClosedIcon className="w-12 h-12 text-purple-600" />}
              title="Privacy Controls"
              description="Manage data sharing, family member visibility, and external caregiver access permissions."
            />
            <FeatureCard
              icon={<CogIcon className="w-12 h-12 text-gray-600" />}
              title="Activity Goals"
              description="Set daily step goals, calorie targets, and meal schedule preferences for personalized tracking."
            />
            <FeatureCard
              icon={<SparklesIcon className="w-12 h-12 text-pink-600" />}
              title="Platform Personalization"
              description="Customize how WPL analyzes your health data and generates insights."
            />
            <FeatureCard
              icon={<CheckCircleIcon className="w-12 h-12 text-teal-600" />}
              title="Onboarding Progress"
              description="Track profile completeness with smart suggestions to unlock full platform capabilities."
            />
          </div>
        </section>

        {/* Profile Sections */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">What You Can Customize</h2>
          <div className="space-y-8">
            <ProfileSection
              title="👤 Basic Information"
              description="Foundational health data that powers accurate calculations and insights."
              features={[
                'Full name and email address',
                'Date of birth for age-based recommendations',
                'Height (imperial or metric units)',
                'Current weight with automatic BMI calculation',
                'Gender for tailored calorie calculations'
              ]}
            />
            <ProfileSection
              title="🎯 Health Goals"
              description="Define your targets and let WPL track your progress toward them."
              features={[
                'Target weight with realistic goal date',
                'Daily calorie goal (auto-calculated or custom)',
                'Daily step goal (default 10,000 steps)',
                'Weight check-in frequency (daily, weekly, bi-weekly)',
                'Goal visualization with milestone tracking'
              ]}
            />
            <ProfileSection
              title="🍎 Dietary Preferences"
              description="Multiple dietary patterns supported for accurate meal recommendations."
              features={[
                'Vegan, Vegetarian, Pescatarian',
                'Keto, Paleo, Low-Carb, Mediterranean',
                'Gluten-Free, Dairy-Free, Nut-Free',
                'Halal, Kosher, Organic-Only',
                'Custom combinations (e.g., Vegan + Gluten-Free)'
              ]}
            />
            <ProfileSection
              title="⚠️ Food Allergies & Intolerances"
              description="Safety-first approach with automatic allergen detection in meals and recipes."
              features={[
                'Common allergens: Peanuts, Tree Nuts, Soy, Dairy, Eggs, Shellfish, Fish, Wheat',
                'AI meal analysis flags potential allergens with warnings',
                'Recipe filtering excludes unsafe ingredients',
                'Shopping list removes allergen-containing products',
                'Family member-specific allergy tracking'
              ]}
            />
            <ProfileSection
              title="🔔 Notification Settings"
              description="Stay on track with customizable reminders and alerts."
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
              title="🔒 Privacy & Sharing"
              description="Granular control over who sees your health data."
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

        {/* Who Benefits */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Who Benefits From Profile Settings?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <BenefitCard
              emoji="👤"
              title="Solo Health Trackers"
              benefits={[
                'Personalized AI meal and exercise recommendations',
                'Allergy-safe food suggestions and warnings',
                'Custom calorie and step goals',
                'Flexible notification schedules'
              ]}
            />
            <BenefitCard
              emoji="👨‍👩‍👧‍👦"
              title="Family Caregivers"
              benefits={[
                'Separate profiles for each family member',
                'Individual dietary needs and allergies per person',
                'Different weight goals and tracking frequencies',
                'Shared calendar with privacy controls'
              ]}
            />
            <BenefitCard
              emoji="🩺"
              title="Healthcare Providers"
              benefits={[
                'View patient preferences before appointments',
                'Understand dietary restrictions and allergies',
                'Track goal adherence and progress',
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
              solution="David sets 'Low-Carb' dietary preference, adds 'Dairy' allergy (lactose intolerant), and sets custom 1,800 calorie goal. AI meal suggestions now exclude dairy and show carb counts prominently."
            />
            <UseCaseCard
              title="Vegan Family with Multiple Allergies"
              scenario="The Martinez family is vegan with a child allergic to nuts and soy. They need meal plans safe for everyone."
              solution="Each family member has 'Vegan' preference set. The child's profile adds 'Peanuts', 'Tree Nuts', and 'Soy' allergies. Meal recommendations and shopping lists exclude all allergens automatically."
            />
            <UseCaseCard
              title="Busy Professional Optimizing Notifications"
              scenario="Emma travels frequently and wants meal reminders only on weekdays, no weekend interruptions."
              solution="Emma customizes notification preferences to enable meal reminders Monday-Friday only. Weight check-ins are weekly (Sunday morning). Push notifications off, SMS only for urgent alerts."
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
                  <li>• Real-time sync across all devices via Firestore</li>
                  <li>• Automatic backup and version history</li>
                  <li>• HIPAA-compliant data encryption (AES-256)</li>
                  <li>• Data export in JSON, CSV, PDF formats</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  Platform Integration
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Profile data powers personalized recommendations</li>
                  <li>• Allergy detection in meal photos</li>
                  <li>• Dietary preference filtering for recipes</li>
                  <li>• Goal-based calorie and macro suggestions</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  Notifications
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Multi-channel: Push, Email, SMS</li>
                  <li>• Timezone-aware scheduling</li>
                  <li>• Smart frequency (no spam)</li>
                  <li>• One-click unsubscribe per category</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  Security
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Two-factor authentication (2FA) support</li>
                  <li>• Biometric login (Face ID, Touch ID)</li>
                  <li>• Session management with auto-logout</li>
                  <li>• Audit logs for all profile changes</li>
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
            <RelatedLink href="/blog/meal-tracking" title="Meal Tracking" description="Photo meal logging with allergen detection" />
            <RelatedLink href="/blog/weight-tracking" title="Weight Tracking" description="Track progress toward your weight goals" />
            <RelatedLink href="/blog/family-care" title="Family Care" description="Manage profiles for multiple family members" />
            <RelatedLink href="/blog/ai-health-reports" title="AI Health Reports" description="Personalized insights based on profile settings" />
            <RelatedLink href="/blog/appointments" title="Appointments" description="Schedule and manage healthcare appointments" />
          </div>
        </section>

        {/* SEO-Optimized Content */}
        <section className="mb-20 prose prose-lg max-w-4xl mx-auto">
          <h2>Why Profile Customization Matters for Health Tracking</h2>
          <p>
            Generic health apps treat everyone the same. WPL's comprehensive profile system ensures your experience is
            tailored to your unique health situation, dietary needs, and personal goals.
          </p>
          <ul>
            <li><strong>Safety First:</strong> Food allergy detection prevents dangerous mistakes in meal logging and recipe recommendations.</li>
            <li><strong>Accurate AI:</strong> Dietary preferences ensure meal suggestions match your lifestyle (vegan, keto, gluten-free, etc.).</li>
            <li><strong>Realistic Goals:</strong> Custom calorie and weight targets based on your age, height, and activity level.</li>
            <li><strong>No Spam:</strong> Notification preferences prevent alert fatigue while keeping you on track.</li>
            <li><strong>True Privacy:</strong> Granular sharing controls let you decide who sees what health data.</li>
          </ul>

          <h2>How Profile Settings Power the WPL Platform</h2>
          <p>
            Your profile isn't just settings—it's the engine that drives personalization across every feature:
          </p>
          <ul>
            <li><strong>Meal Tracking:</strong> WPL analyzes photos for allergens and flags foods that don't match your dietary preferences</li>
            <li><strong>Shopping Lists:</strong> Automatically filters products based on allergies and diet type</li>
            <li><strong>Recipes:</strong> Shows only recipes that match your preferences and exclude allergens</li>
            <li><strong>Health Reports:</strong> AI recommendations consider your specific goals, not generic averages</li>
            <li><strong>Inventory:</strong> Smart expiration alerts for foods you actually eat</li>
          </ul>

          <h2>Getting Started With Your Profile</h2>
          <p>
            Setting up your WPL profile takes 3-5 minutes and unlocks the full power of personalized health tracking:
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
          </p>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Personalize Your Health Journey?</h2>
          <p className="text-xl text-purple-100 mb-8 max-w-3xl mx-auto">
            Start your free trial and create a profile tailored to your unique health needs, goals, and dietary preferences.
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
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-indigo-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function ProfileSection({ title, description, features }: { title: string; description: string; features: string[] }) {
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
