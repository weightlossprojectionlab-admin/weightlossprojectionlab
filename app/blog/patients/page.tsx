/**
 * Patient Management - Marketing Blog Page
 *
 * Hybrid marketing page showcasing WLPL Patient Management (for family plans)
 * Optimized for SEO with top-notch backlinks and conversion funnel
 */

import Link from 'next/link'
import {
  UserGroupIcon,
  HeartIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  BellAlertIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  SparklesIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline'
import { Screenshot } from '@/components/ui/Screenshot'
import { DemoRequestButton } from '@/components/DemoRequestButton'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Patient Management - Track Multiple Family Members | Weight Loss Projection Lab',
  description: 'Manage health data for your entire family from one account. Track weight, meals, vitals, medications, and appointments for children, elderly parents, pets, and more with HIPAA-compliant patient profiles.',
  keywords: 'patient management, family health tracking, multi-patient dashboard, caregiver tools, elderly care, pediatric tracking, pet health, family plan',
  openGraph: {
    title: 'Patient Management - Track Multiple Family Members',
    description: 'Manage health data for your entire family from one account. Track weight, meals, vitals, medications, and appointments for all family members.',
    type: 'article',
    url: 'https://weightlossproglab.com/blog/patients',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Patient Management - Track Multiple Family Members',
    description: 'Manage health data for your entire family from one account. Track weight, meals, vitals, medications, and appointments for all family members.',
  },
  alternates: {
    canonical: 'https://weightlossproglab.com/blog/patients'
  }
}

export default function PatientsBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 text-white overflow-hidden">
        {/* Background Image */}
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
              <span className="text-sm font-medium">Family Health Management</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">Manage Your Whole Family's Health in One Place</h1>
            <p className="text-xl text-cyan-100 mb-8 leading-relaxed">
              Track weight, meals, vitals, medications, and appointments for all family members under your care—children, elderly parents, spouses, and even pets. One HIPAA-compliant account with individual profiles for each patient and family member.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
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
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* What Is Patient Management */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">What Is Patient Management?</h2>
          <div className="max-w-4xl mx-auto text-lg text-muted-foreground space-y-4">
            <p>
              <strong>Patient Management</strong> is WLPL's family plan feature that lets you track health data for multiple
              people from one account. Create separate profiles for each patient and family member—children, elderly parents,
              spouse, or even pets—and manage their weight, meals, vitals, medications, and appointments individually.
            </p>
            <p>
              Perfect for professional caregivers, home health aides, parents managing children's health, adult children coordinating elderly parent care,
              or anyone juggling multiple patients' and family members' health needs. Each person gets their own dashboard, goals,
              and AI health reports while you maintain central oversight as the care coordinator.
            </p>
          </div>
        </section>

        {/* Smart Vitals Reminders */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">Never Miss a Health Check</h2>
          <p className="text-center text-muted-foreground mb-8 max-w-3xl mx-auto">
            Smart vitals reminders popup when family members have health checks due. Track what's overdue,
            when it was last logged, and log vitals instantly with one click or use the guided wizard.
          </p>
          <div className="max-w-md mx-auto">
            <Screenshot
              src="/screenshots/vitals-tracking/vitals-reminder-popup-desktop-light.png"
              alt="Time to Check Vitals popup for Barbara Rice showing 6 vitals due today: Blood Pressure (last logged 1 days ago), Blood Sugar (last logged 1 days ago), Temperature (last logged 1 days ago), Pulse Oximeter (last logged 1 days ago), Weight (last logged 3 days ago - 2 days overdue), and Mood (last logged 1 days ago). Each vital has Log Now button with snooze and dismiss options. Bottom shows Log All Vitals (Wizard) and Maybe Later buttons"
              caption="Smart vitals reminder - Keep family members on track with automated health check notifications"
              priority
              zoomable
            />
          </div>
        </section>

        {/* Key Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Patient Management Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<UserGroupIcon className="w-12 h-12 text-blue-600" />}
              title="Unlimited Patient Profiles"
              description="Add as many family members as you need (plan-dependent). Each gets their own health data, goals, and tracking."
            />
            <FeatureCard
              icon={<PlusCircleIcon className="w-12 h-12 text-green-600" />}
              title="Human & Pet Support"
              description="Track health for people and pets. Separate workflows optimized for each type (e.g., pets don't need calorie goals)."
            />
            <FeatureCard
              icon={<ChartBarIcon className="w-12 h-12 text-purple-600" />}
              title="Individual Dashboards"
              description="Each patient has their own dashboard with weight trends, meal logs, vitals, and AI health insights."
            />
            <FeatureCard
              icon={<ClipboardDocumentListIcon className="w-12 h-12 text-indigo-600" />}
              title="Dedicated Medical Records"
              description="Separate medication lists, appointment calendars, vital signs, and medical documents per patient."
            />
            <FeatureCard
              icon={<BellAlertIcon className="w-12 h-12 text-red-600" />}
              title="Smart Notifications"
              description="Get alerted for weight check-ins, medication reminders, and appointment times for each patient separately."
            />
            <FeatureCard
              icon={<ShieldCheckIcon className="w-12 h-12 text-teal-600" />}
              title="Role-Based Access"
              description="Grant family members view-only or edit access to specific patients. Full HIPAA-compliant access control."
            />
            <FeatureCard
              icon={<HeartIcon className="w-12 h-12 text-pink-600" />}
              title="Quick Patient Switching"
              description="Switch between patient profiles with one tap. No logging in/out. Streamlined for busy caregivers."
            />
            <FeatureCard
              icon={<SparklesIcon className="w-12 h-12 text-yellow-600" />}
              title="AI Health Reports Per Patient"
              description="Each patient gets personalized AI health insights based on their unique age, goals, and health data."
            />
            <FeatureCard
              icon={<CheckCircleIcon className="w-12 h-12 text-green-600" />}
              title="Centralized Oversight"
              description="View aggregate stats across all patients or drill into individual health data. Perfect for care coordination."
            />
          </div>
        </section>

        {/* Patient Profile Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">What Each Patient Profile Includes</h2>
          <div className="space-y-8">
            <PatientFeatureSection
              title="👤 Basic Patient Info"
              description="Foundational data that powers personalized tracking and AI recommendations."
              features={[
                'Full name, date of birth, gender',
                'Height and starting weight (auto-BMI calculation)',
                'Profile photo for easy identification',
                'Patient type: human or pet',
                'Relationship to account owner (child, parent, spouse, etc.)'
              ]}
            />
            <PatientFeatureSection
              title="⚖️ Weight Tracking"
              description="Individual weight logs with goals, trends, and progress visualization."
              features={[
                'Separate weight goal and target date per patient',
                'Weight check-in frequency (daily, weekly, bi-weekly)',
                'Interactive weight trend charts',
                'BMI tracking (humans only)',
                'Goal progress percentage and ETA'
              ]}
            />
            <PatientFeatureSection
              title="🍽️ Meal Logging"
              description="Photo meal tracking with patient-specific dietary needs."
              features={[
                'Intelligent meal analysis',
                'Patient-specific calorie goals',
                'Dietary preferences per patient (vegan, keto, etc.)',
                'Food allergy warnings for unsafe foods',
                'Meal gallery with nutritional history'
              ]}
            />
            <PatientFeatureSection
              title="💊 Medication Management"
              description="Track prescriptions, dosages, and schedules with reminders."
              features={[
                'Unlimited medications per patient',
                'Dosage, frequency, and start/end dates',
                'Medication reminders with push notifications',
                'Medication adherence tracking',
                'Prescription bottle photo storage'
              ]}
            />
            <PatientFeatureSection
              title="💓 Vital Signs Monitoring"
              description="Comprehensive vital sign tracking for medical oversight."
              features={[
                'Blood pressure, blood sugar, heart rate',
                'Temperature, oxygen saturation (SpO2)',
                'Mood and pain level tracking',
                'Abnormal value alerts with color coding',
                'Vital trends over time with charts'
              ]}
            />
            <PatientFeatureSection
              title="📅 Appointment Calendar"
              description="Manage doctor visits, lab work, and specialist appointments."
              features={[
                'Appointment scheduling with provider info',
                'Reminders 7, 3, and 1 day before',
                'Transportation coordination (assign drivers)',
                'Appointment history and visit notes',
                'Calendar export (iCal, Google Calendar)'
              ]}
            />
          </div>
        </section>

        {/* Who Benefits */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Who Benefits From Patient Management?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <BenefitCard
              emoji="👨‍👩‍👧‍👦"
              title="Parents with Kids"
              benefits={[
                'Track growth and nutrition for multiple children',
                'Manage different dietary needs per child',
                'Coordinate pediatrician appointments',
                'Monitor medication adherence (e.g., ADHD meds)'
              ]}
            />
            <BenefitCard
              emoji="🧓"
              title="Adult Children with Elderly Parents"
              benefits={[
                'Remote monitoring of parent vitals',
                'Medication reminder coordination across siblings',
                'Appointment scheduling with shared calendar',
                'Document storage for insurance and medical records'
              ]}
            />
            <BenefitCard
              emoji="🐾"
              title="Pet Owners"
              benefits={[
                'Track pet weight and nutrition',
                'Manage vet appointments and vaccinations',
                'Store pet medical documents',
                'Monitor chronic conditions (diabetes, kidney disease)'
              ]}
            />
          </div>
        </section>

        {/* Real-World Use Cases */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Real-World Patient Management Use Cases</h2>
          <div className="space-y-6">
            <UseCaseCard
              title="Managing Three Kids with Different Dietary Needs"
              scenario="Sarah has three children: one with Type 1 diabetes, one with celiac disease, and one training for soccer. Each needs different meal plans and tracking."
              solution="Sarah creates three patient profiles, each with unique dietary preferences and calorie goals. AI meal suggestions filter by patient, ensuring diabetic-friendly meals for one child, gluten-free for another, and high-protein for the athlete."
            />
            <UseCaseCard
              title="Coordinating Elderly Parent Care Across Siblings"
              scenario="Mike and his two sisters share caregiving for their 80-year-old mother across three cities. They need to track her medications, vitals, and doctor appointments."
              solution="Mike creates a patient profile for his mother and invites his sisters as co-caregivers. All three can log vitals, update medications, and schedule appointments. Notifications keep everyone informed of changes in real-time."
            />
            <UseCaseCard
              title="Joint Weight Loss Journey for Spouses"
              scenario="Emily and her husband are both losing weight but have different goals: Emily wants to lose 40 lbs, while her husband targets 60 lbs."
              solution="Emily creates patient profiles for both of them with separate weight goals. They can view each other's progress for accountability while maintaining individual dashboards and AI health reports."
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
                  Data Isolation
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Complete data separation between patients</li>
                  <li>• No accidental cross-contamination of records</li>
                  <li>• Individual encryption keys per patient</li>
                  <li>• HIPAA-compliant access logging</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  Collaboration
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Invite family members as co-caregivers</li>
                  <li>• Role-based permissions (Admin, Caregiver, Viewer)</li>
                  <li>• Real-time sync across all users</li>
                  <li>• Activity feed shows who did what</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  Plan Limits
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Starter: 1 patient (self only)</li>
                  <li>• Family: Up to 5 patients</li>
                  <li>• Pro: Up to 10 patients</li>
                  <li>• Enterprise: Unlimited patients</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  Performance
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Instant patient switching (&lt;100ms)</li>
                  <li>• Lazy loading for large families</li>
                  <li>• Optimized queries per patient</li>
                  <li>• Real-time data sync (Firestore)</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Related Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">Related Platform Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RelatedLink href="/blog/family-care" title="Family Care Dashboard" description="Centralized view of all family members' health" />
            <RelatedLink href="/blog/dashboard" title="Dashboard" description="Individual health command center per patient" />
            <RelatedLink href="/blog/meal-tracking" title="Meal Tracking" description="Photo meal logging per patient" />
            <RelatedLink href="/blog/medications" title="Medications" description="Track prescriptions and reminders per patient" />
            <RelatedLink href="/blog/appointments" title="Appointments" description="Schedule doctor visits per patient" />
            <RelatedLink href="/blog/vitals-tracking" title="Vitals Tracking" description="Monitor vital signs per patient" />
          </div>
        </section>

        {/* SEO-Optimized Content */}
        <section className="mb-20 prose prose-lg max-w-4xl mx-auto">
          <h2>Why Choose WLPL for Family Health Management?</h2>
          <p>
            Most health apps are built for individuals. WLPL's patient management system is designed from the ground up
            for families, caregivers, and anyone managing multiple people's health.
          </p>
          <ul>
            <li><strong>True Multi-Patient Support:</strong> Not just "family sharing"—full patient profiles with isolated data and individual goals</li>
            <li><strong>HIPAA Compliance:</strong> Medical-grade security and access controls suitable for healthcare providers</li>
            <li><strong>Pet-Friendly:</strong> One of the few platforms that supports both human and pet health tracking</li>
            <li><strong>Collaborative Care:</strong> Invite family members to co-manage patients with role-based permissions</li>
            <li><strong>Affordable:</strong> Family plan costs less than individual subscriptions for each person</li>
          </ul>

          <h2>How Patient Management Saves Caregivers Time</h2>
          <p>
            Caregivers juggle medications, appointments, meal prep, and vital monitoring for multiple family members.
            WLPL's patient management system brings everything into one app:
          </p>
          <ul>
            <li><strong>No More Spreadsheets:</strong> Track medications, appointments, and vitals digitally with automated reminders</li>
            <li><strong>Shared Access:</strong> Siblings caring for elderly parents can see the same data and coordinate seamlessly</li>
            <li><strong>Medical Documentation:</strong> Store insurance cards, lab results, and prescriptions per patient in HIPAA-compliant cloud storage</li>
            <li><strong>AI Insights:</strong> Get personalized health recommendations for each family member based on their age, condition, and goals</li>
            <li><strong>Mobile Access:</strong> Log data on the go from your phone, no computer required</li>
          </ul>

          <h2>Getting Started With Patient Management</h2>
          <p>
            Setting up patient profiles takes just a few minutes:
          </p>
          <ol>
            <li>Sign up for a Family, Pro, or Enterprise plan (patient limits vary by tier)</li>
            <li>Create your first patient profile with basic info (name, DOB, height, weight)</li>
            <li>Set patient-specific goals (weight target, calorie goal, dietary preferences)</li>
            <li>Add medications, appointments, and vital signs as needed</li>
            <li>Invite family members to collaborate (optional)</li>
            <li>Start logging meals, weight, and vitals for each patient</li>
          </ol>
          <p>
            Patients can be added or removed at any time. Data is never deleted—archived patients retain full history for
            future reference or reactivation.
          </p>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Manage Your Family's Health?</h2>
          <p className="text-xl text-cyan-100 mb-8 max-w-3xl mx-auto">
            Start your free 14-day trial and create patient profiles for your entire family. No credit card required.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
            >
              Start Free Trial
            </Link>
          </div>
          <p className="text-sm text-cyan-200 mt-6">
            Family Plan: $19.99/month • Up to 5 patients • Cancel anytime
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

function PatientFeatureSection({ title, description, features }: { title: string; description: string; features: string[] }) {
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
