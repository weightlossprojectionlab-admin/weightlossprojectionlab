#!/usr/bin/env python3
"""
Generate Marketing Blog Pages for WLPL
Creates comprehensive SEO-optimized blog pages for all footer links
"""

import os
from pathlib import Path

# Base directory for blog pages
BLOG_DIR = Path(r"C:\Users\percy\wlpl\weightlossprojectlab\app\blog")

# Page configurations with actual WLPL features
PAGES = {
    # Platform Section (remaining)
    "family-care": {
        "title": "Family Care Dashboard - Coordinate Health for Your Whole Family",
        "description": "Centralized family health dashboard for tracking multiple family members. View aggregate health data, coordinate care between siblings, and manage family-wide health goals with role-based access.",
        "keywords": "family care, family health dashboard, care coordination, multi-patient view, family health tracking, caregiver dashboard",
        "gradient": "from-green-600 via-emerald-600 to-teal-600",
        "emoji": "👨‍👩‍👧‍👦",
        "features": [
            ("UserGroupIcon", "Multi-Patient Overview", "View health stats for all family members at once with quick-switch navigation"),
            ("ChartBarIcon", "Aggregate Health Data", "See combined weight trends, meal logs, and vital signs across your family"),
            ("BellAlertIcon", "Family Notifications", "Get alerts for any family member's weight check-ins, appointments, or abnormal vitals"),
            ("CalendarIcon", "Shared Calendar", "Family-wide appointment calendar with color-coding per member"),
            ("ClipboardDocumentListIcon", "Care Coordination", "Assign tasks to family members (e.g., 'Take Mom to doctor')"),
            ("LockClosedIcon", "Privacy Controls", "Granular permissions - decide who sees what for each patient"),
        ]
    },
    "appointments": {
        "title": "Appointment Scheduling - Never Miss a Doctor Visit",
        "description": "Schedule and manage healthcare appointments for your entire family. Set reminders, assign transportation, track visit history, and sync with your calendar—all in one HIPAA-compliant system.",
        "keywords": "appointment scheduling, healthcare appointments, doctor visits, medical calendar, appointment reminders, patient appointments",
        "gradient": "from-pink-600 via-rose-600 to-red-600",
        "emoji": "📅",
        "features": [
            ("CalendarIcon", "Appointment Calendar", "Visual calendar with all family member appointments color-coded"),
            ("BellAlertIcon", "Smart Reminders", "Notifications 7, 3, and 1 day before appointment time"),
            ("UserIcon", "Provider Integration", "Link appointments to provider profiles with contact info and specialties"),
            ("MapPinIcon", "Transportation Coordination", "Assign drivers to appointments and track who's providing transportation"),
            ("ClipboardDocumentListIcon", "Visit Notes", "Log visit summaries, diagnoses, and follow-up tasks after appointments"),
            ("ArrowDownTrayIcon", "Calendar Export", "Export to Google Calendar, iCal, or Outlook for cross-platform syncing"),
        ]
    },
    # Features Section
    "meal-tracking": {
        "title": "AI-Powered Meal Tracking - Photo Food Logging with Nutritional Analysis",
        "description": "Take a photo of your meal and get instant AI-powered nutritional analysis. WLPL uses GPT-4 Vision and Google Gemini to identify foods, estimate calories, macros, and detect allergens automatically.",
        "keywords": "meal tracking, food logging, AI meal analysis, photo food tracker, calorie counter, nutrition tracking, GPT-4 Vision",
        "gradient": "from-orange-600 via-amber-600 to-yellow-600",
        "emoji": "📸",
        "features": [
            ("CameraIcon", "Photo Meal Logging", "Snap a photo and AI identifies foods with 85-95% accuracy"),
            ("SparklesIcon", "Dual AI Analysis", "GPT-4 Vision and Google Gemini work together for best results"),
            ("ExclamationTriangleIcon", "Allergen Detection", "Automatic warnings if meal contains your listed food allergies"),
            ("ChartBarIcon", "Calorie & Macro Breakdown", "Instant calories, protein, carbs, fat, and fiber estimates"),
            ("ClockIcon", "Meal History Gallery", "Beautiful photo gallery of all your meals with nutrition data"),
            ("PencilIcon", "Manual Editing", "Adjust AI suggestions if needed - corrections improve future accuracy"),
        ]
    },
    "weight-tracking": {
        "title": "Weight Loss Progress Tracking - Visualize Your Journey",
        "description": "Track weight loss progress with interactive charts, goal setting, BMI calculations, and trend analysis. Set custom weight check-in reminders and celebrate milestones as you reach your health goals.",
        "keywords": "weight tracking, weight loss tracker, BMI calculator, weight goals, progress charts, weight trends, weight loss journey",
        "gradient": "from-violet-600 via-purple-600 to-fuchsia-600",
        "emoji": "⚖️",
        "features": [
            ("ScaleIcon", "Quick Weight Logging", "Log weight in seconds with one-tap entry from dashboard"),
            ("ChartLineIcon", "Interactive Charts", "Zoom, pan, and annotate weight trends over time"),
            ("FlagIcon", "Goal Setting", "Set target weight, goal date, and track progress percentage"),
            ("TrendingDownIcon", "BMI Tracking", "Automatic BMI calculation with healthy range indicators"),
            ("CalendarIcon", "Custom Check-In Frequency", "Daily, weekly, or bi-weekly reminders based on your preference"),
            ("TrophyIcon", "Milestone Celebrations", "Celebrate every 5, 10, 20 lbs lost with achievement badges"),
        ]
    },
    "ai-health-reports": {
        "title": "Weekly AI Health Reports - Personalized Insights and Recommendations",
        "description": "Get weekly AI-generated health reports with personalized recommendations based on your meal patterns, weight trends, vital signs, and activity data. Powered by GPT-4 and Google Gemini.",
        "keywords": "AI health reports, health insights, personalized recommendations, AI health coach, GPT-4 health analysis, weekly health summary",
        "gradient": "from-cyan-600 via-sky-600 to-blue-600",
        "emoji": "🤖",
        "features": [
            ("SparklesIcon", "AI-Powered Analysis", "GPT-4 and Gemini analyze your health data for actionable insights"),
            ("DocumentTextIcon", "Weekly Reports", "Delivered every Monday with comprehensive health summary"),
            ("LightBulbIcon", "Personalized Recommendations", "Diet tips, exercise suggestions, and health alerts tailored to you"),
            ("ExclamationCircleIcon", "Risk Alerts", "Early warnings for weight plateaus, abnormal vitals, or missed medications"),
            ("ClipboardDocumentListIcon", "Shopping List Suggestions", "AI generates shopping lists based on your meal patterns and goals"),
            ("TrendingUpIcon", "Progress Insights", "Celebrate wins and identify areas for improvement with data-driven feedback"),
        ]
    },
    "smart-shopping": {
        "title": "Smart Shopping Lists - AI-Powered Grocery Planning",
        "description": "Generate intelligent shopping lists based on your meal plans, dietary preferences, and pantry inventory. WLPL suggests healthy foods, excludes allergens, and helps you stay on budget.",
        "keywords": "smart shopping, grocery list, meal planning, shopping list app, pantry inventory, grocery planning, AI shopping assistant",
        "gradient": "from-lime-600 via-green-600 to-emerald-600",
        "emoji": "🛒",
        "features": [
            ("ShoppingCartIcon", "Auto-Generated Lists", "AI creates shopping lists from your meal plans and recipe queues"),
            ("SparklesIcon", "Smart Suggestions", "Recommends healthy alternatives based on your dietary preferences"),
            ("NoSymbolIcon", "Allergen Filtering", "Automatically excludes foods containing your listed allergies"),
            ("CurrencyDollarIcon", "Budget Tracking", "Set budget limits and track spending on groceries"),
            ("ClipboardDocumentCheckIcon", "Inventory Integration", "Cross-references pantry to avoid buying duplicates"),
            ("ShareIcon", "Family Sharing", "Share lists with family members for collaborative grocery shopping"),
        ]
    },
    "inventory-management": {
        "title": "Kitchen Inventory Management - Track Pantry and Fridge Items",
        "description": "Never waste food again. Track pantry items, monitor expiration dates, get alerts for expiring foods, and generate shopping lists based on what you need to restock.",
        "keywords": "inventory management, pantry tracking, food expiration, kitchen inventory, food waste reduction, pantry organization",
        "gradient": "from-amber-600 via-orange-600 to-rose-600",
        "emoji": "📦",
        "features": [
            ("ArchiveBoxIcon", "Pantry & Fridge Tracking", "Catalog all food items with quantities and expiration dates"),
            ("BellAlertIcon", "Expiration Alerts", "Get notified 7, 3, 1 day before foods expire"),
            ("MinusCircleIcon", "Auto-Consumption Tracking", "Items automatically decrease when used in logged meals"),
            ("ShoppingBagIcon", "Restock Suggestions", "AI generates shopping lists for low-stock items"),
            ("ChartBarIcon", "Waste Analytics", "Track how much food is wasted vs consumed for better planning"),
            ("QrCodeIcon", "Barcode Scanning", "Scan barcodes to quickly add items with nutritional data"),
        ]
    },
    # Healthcare Section
    "patient-care": {
        "title": "Comprehensive Patient Care - Full Health Profiles for Every Family Member",
        "description": "Create detailed patient profiles with complete health histories, vital signs, medications, appointments, and medical documents. Perfect for caregivers managing elderly parents or children with complex medical needs.",
        "keywords": "patient care, patient profiles, health records, medical history, patient management, caregiver tools, elderly care",
        "gradient": "from-blue-600 via-indigo-600 to-purple-600",
        "emoji": "🏥",
        "features": [
            ("UserCircleIcon", "Detailed Profiles", "Store demographics, medical history, insurance, emergency contacts"),
            ("HeartPulseIcon", "Vital Signs Tracking", "Monitor blood pressure, glucose, heart rate, temperature, SpO2"),
            ("CapsuleIcon", "Medication Management", "Track prescriptions, dosages, schedules, and adherence"),
            ("CalendarIcon", "Appointment History", "Full calendar of past and upcoming doctor visits with notes"),
            ("DocumentTextIcon", "Medical Documents", "Store insurance cards, lab results, imaging reports, prescriptions"),
            ("UserGroupIcon", "Care Team Collaboration", "Invite family members and caregivers with role-based access"),
        ]
    },
    "providers": {
        "title": "Healthcare Provider Directory - Manage Your Medical Team",
        "description": "Organize your healthcare providers in one directory. Store contact info, specialties, addresses, and link appointments to the right providers. Never lose a doctor's phone number again.",
        "keywords": "healthcare providers, doctor directory, medical contacts, provider management, physician directory, specialist tracking",
        "gradient": "from-teal-600 via-cyan-600 to-sky-600",
        "emoji": "🩺",
        "features": [
            ("BuildingOffice2Icon", "Provider Profiles", "Store name, specialty, phone, email, fax, address for each provider"),
            ("MapPinIcon", "Location Mapping", "Addresses with one-click navigation to office locations"),
            ("LinkIcon", "Appointment Integration", "Link appointments to specific providers for easy tracking"),
            ("StarIcon", "Provider Notes", "Add personal notes like 'Best pediatrician' or 'Long wait times'"),
            ("PhoneIcon", "Quick Contact", "Tap to call, email, or get directions to provider office"),
            ("ClipboardDocumentListIcon", "Visit History", "See all past appointments with each provider"),
        ]
    },
    "medications": {
        "title": "Medication Tracking - Never Miss a Dose with Smart Reminders",
        "description": "Track all medications, vitamins, and supplements with dose schedules, refill reminders, and adherence monitoring. Perfect for managing complex medication regimens for elderly parents or chronic conditions.",
        "keywords": "medication tracking, prescription management, medication reminders, pill tracker, medication adherence, refill reminders",
        "gradient": "from-rose-600 via-pink-600 to-fuchsia-600",
        "emoji": "💊",
        "features": [
            ("CapsuleIcon", "Unlimited Medications", "Track prescriptions, over-the-counter meds, vitamins, supplements"),
            ("BellIcon", "Dose Reminders", "Push notifications at scheduled times (e.g., 8am, 2pm, 8pm)"),
            ("CheckCircleIcon", "Adherence Tracking", "Mark doses as taken and see adherence percentage over time"),
            ("CalendarIcon", "Refill Alerts", "Get notified when running low on medications (7-day warning)"),
            ("PhotoIcon", "Bottle Photos", "Take photos of prescription bottles for reference"),
            ("DocumentTextIcon", "Medication List Export", "Print or email medication list to share with doctors"),
        ]
    },
    "vitals-tracking": {
        "title": "Vital Signs Monitoring - Track BP, Glucose, Heart Rate, and More",
        "description": "Monitor vital signs for your entire family. Track blood pressure, blood sugar, heart rate, temperature, oxygen saturation, mood, and pain levels with automatic alerts for abnormal readings.",
        "keywords": "vitals tracking, blood pressure monitor, glucose tracking, heart rate monitor, vital signs, health monitoring, medical tracking",
        "gradient": "from-red-600 via-rose-600 to-pink-600",
        "emoji": "💓",
        "features": [
            ("HeartIcon", "Comprehensive Vitals", "Blood pressure, glucose, heart rate, temp, SpO2, mood, pain level"),
            ("ChartLineIcon", "Trend Visualization", "Interactive charts show vitals over time with color-coded alerts"),
            ("ExclamationTriangleIcon", "Abnormal Value Alerts", "Automatic warnings for readings outside safe ranges"),
            ("ClockIcon", "Scheduled Monitoring", "Set reminders to check vitals at specific times (e.g., daily BP at 8am)"),
            ("DocumentChartBarIcon", "Exportable Reports", "Generate PDF reports to share with doctors"),
            ("SparklesIcon", "AI Health Insights", "AI analyzes vitals and provides recommendations in weekly health reports"),
        ]
    },
}

def create_page(slug, config):
    """Create a comprehensive marketing blog page"""

    page_content = f'''/**
 * {slug.title().replace('-', ' ')} - Marketing Blog Page
 *
 * Hybrid marketing page showcasing WLPL {slug.title().replace('-', ' ')}
 * Optimized for SEO with top-notch backlinks and conversion funnel
 */

import Link from 'next/link'
import {{ Metadata }} from 'next'
import {{
  CheckCircleIcon,
  SparklesIcon,
  UserCircleIcon,
  {", ".join([f[0] for f in config["features"]])}
}} from '@heroicons/react/24/outline'

export const metadata: Metadata = {{
  title: '{config["title"]} | Weight Loss Projection Lab',
  description: '{config["description"]}',
  keywords: '{config["keywords"]}',
  openGraph: {{
    title: '{config["title"]}',
    description: '{config["description"]}',
    type: 'article',
    url: 'https://weightlossproglab.com/blog/{slug}',
  }},
  twitter: {{
    card: 'summary_large_image',
    title: '{config["title"]}',
    description: '{config["description"]}',
  }},
  alternates: {{
    canonical: 'https://weightlossproglab.com/blog/{slug}'
  }}
}}

export default function {slug.replace("-", "").title()}BlogPage() {{
  return (
    <div className="min-h-screen bg-background">
      {{/* Hero Section */}}
      <div className="bg-gradient-to-br {config["gradient"]} text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm font-medium">WLPL Feature</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">{config["title"].split(" - ")[1] if " - " in config["title"] else config["title"]}</h1>
            <p className="text-xl text-white/90 mb-8 leading-relaxed">
              {config["description"]}
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
        {{/* Key Features */}}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Key Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
'''

    # Add feature cards
    for icon, title, desc in config["features"]:
        page_content += f'''            <FeatureCard
              icon={{<{icon} className="w-12 h-12 text-blue-600" />}}
              title="{title}"
              description="{desc}"
            />
'''

    page_content += '''          </div>
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
                'AI-powered insights tailored to your needs',
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
            <Link
              href="/contact"
              className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors font-semibold"
            >
              Contact Sales
            </Link>
          </div>
          <p className="text-sm text-blue-200 mt-6">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm">
            <Link href="/security" className="hover:text-white underline">Security</Link>
            <Link href="/hipaa" className="hover:text-white underline">HIPAA Compliance</Link>
            <Link href="/privacy" className="hover:text-white underline">Privacy Policy</Link>
            <Link href="/support" className="hover:text-white underline">Help Center</Link>
          </div>
        </section>
      </main>
    </div>
  )
}}

// Helper Components
function FeatureCard({{ icon, title, description }}: {{ icon: React.ReactNode; title: string; description: string }}) {{
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-blue-300 hover:shadow-lg transition-all">
      <div className="mb-4">{{icon}}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{{title}}</h3>
      <p className="text-muted-foreground">{{description}}</p>
    </div>
  )
}}

function BenefitCard({{ emoji, title, benefits }}: {{ emoji: string; title: string; benefits: string[] }}) {{
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6">
      <div className="text-4xl mb-3">{{emoji}}</div>
      <h3 className="text-xl font-semibold text-foreground mb-4">{{title}}</h3>
      <ul className="space-y-2">
        {{benefits.map((benefit, idx) => (
          <li key={{idx}} className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>{{benefit}}</span>
          </li>
        ))}}
      </ul>
    </div>
  )
}}

function RelatedLink({{ href, title, description }}: {{ href: string; title: string; description: string }}) {{
  return (
    <Link href={{href}} className="bg-card rounded-lg border-2 border-border p-4 hover:border-blue-300 hover:shadow-lg transition-all block">
      <h3 className="font-semibold text-foreground mb-1">{{title}}</h3>
      <p className="text-sm text-muted-foreground">{{description}}</p>
    </Link>
  )
}}
'''

    return page_content

def main():
    """Generate all blog pages"""
    print("Generating marketing blog pages...")

    for slug, config in PAGES.items():
        page_dir = BLOG_DIR / slug
        page_dir.mkdir(parents=True, exist_ok=True)

        page_file = page_dir / "page.tsx"
        content = create_page(slug, config)

        with open(page_file, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"✓ Created {slug}/page.tsx")

    print(f"\nSuccessfully created {len(PAGES)} blog pages!")

if __name__ == "__main__":
    main()
