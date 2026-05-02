import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { ConditionalProviders } from '@/components/ConditionalProviders'
import { CsrfInitializer } from '@/components/CsrfInitializer'
import { ConditionalFooter } from '@/components/ConditionalFooter'
import { UpdateChecker } from '@/components/UpdateChecker'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { JsonLd } from '@/components/seo/JsonLd'
import { organizationSchema } from '@/lib/json-ld'
import './globals.css'

// Force dynamic rendering for all pages to skip static generation
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export const metadata: Metadata = {
  title: {
    default: 'Wellness Projection Lab — Family Health Tracking for Caregivers',
    template: '%s | Wellness Projection Lab',
  },
  description: 'Track vitals, medications, meals, and appointments for your entire family. From newborns to seniors to pets — one HIPAA-compliant platform. Share access with caregivers instantly.',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.wellnessprojectionlab.com'),
  alternates: {
    canonical: 'https://www.wellnessprojectionlab.com',
  },
  verification: {
    google: 'ug3K1EIvHU4OWAtIU-HdOVfhDvAOVhNd3R4xtse6zCc',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Wellness Projection Lab',
    title: 'Wellness Projection Lab — Family Health Tracking for Caregivers',
    description: 'Track vitals, medications, meals, and appointments for your entire family. From newborns to seniors to pets — one HIPAA-compliant platform.',
    images: [
      {
        url: '/screenshots/family-care/family-dashboard-overview-desktop-light.png',
        width: 1200,
        height: 630,
        alt: 'Wellness Projection Lab — Family Health Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wellness Projection Lab — Family Health Tracking for Caregivers',
    description: 'Track vitals, medications, meals, and appointments for your entire family. Share access with caregivers instantly.',
    images: ['/screenshots/family-care/family-dashboard-overview-desktop-light.png'],
  },
  keywords: [
    'family health tracking',
    'caregiver app',
    'medication tracker for family',
    'family health management',
    'vitals monitoring',
    'senior care app',
    'pet health tracking',
    'health records app',
    'meal tracking',
    'newborn tracking',
    'family medical records',
    'health dashboard',
    'HIPAA compliant health app',
    'wellness app',
  ],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WPL',
  },
  other: {
    'color-scheme': 'light only',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow zooming up to 5x for accessibility
  userScalable: true, // Enable user scaling for accessibility
  themeColor: '#ffffff', // Light mode - white background
  colorScheme: 'light', // Force light mode on all devices
  viewportFit: 'cover', // Enable safe area insets for notched devices
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Read tenant slug from middleware header (set by subdomain detection)
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug') || null

  return (
    <html lang="en" className="h-full light" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="color-scheme" content="light only" />
        <meta name="msvalidate.01" content="4AE02DCF3B27464702CC151D52D82EC7" />
        <meta name="p-domain_verify" content="b3c9f7e54cc0c3a7f9f0fb503a5859233" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Wellness Projection Lab',
              alternateName: 'WPL',
              applicationCategory: 'HealthApplication',
              applicationSubCategory: 'Family Caregiver Coordination',
              operatingSystem: 'Web, iOS, Android',
              description:
                'Family health tracking app for caregivers. Track medications, vitals, appointments, and meals for aging parents, kids, partners, and pets — and share access with siblings, spouses, or sitters. AI-powered photo capture (meals, documents) plus a self-teaching ML engine that personalizes recommendations to each family member over time. HIPAA-compliant. Not a financial or retirement planning tool.',
              url: 'https://www.wellnessprojectionlab.com',
              audience: {
                '@type': 'Audience',
                audienceType: 'Family caregivers, adult children of aging parents, parents of newborns and children, pet owners, professional care providers (nurses, wellness coaches, home care agencies)',
              },
              offers: {
                '@type': 'AggregateOffer',
                lowPrice: '0',
                highPrice: '14.99',
                priceCurrency: 'USD',
                offerCount: '4',
              },
              featureList: [
                'Medication tracking and reminders for the whole family',
                'Remote vitals monitoring (blood pressure, weight, glucose)',
                'Shared family health dashboard for siblings and spouses',
                'AI meal photo analysis (Gemini Vision parses photos into structured meal logs)',
                'Medical document OCR (Gemini Vision extracts data from scanned records)',
                'Self-teaching health reports — learn each family member’s baseline and surface personalized trends',
                'Adaptive shopping lists — learn what your household buys and prioritize accordingly',
                'Self-teaching recipe recommendations that adapt to each family member',
                'Self-teaching dashboard insights that get more personalized over time',
                'Kitchen and pantry inventory tracking across households',
                'Newborn and pediatric tracking',
                'Senior care coordination and aging parent monitoring',
                'Pet health and medication tracking',
                'Appointment scheduling and reminders',
                'Permission-based access for caregivers and sitters',
                'Multi-household management — track separate residences with their own pantries, shopping lists, and duties',
                'Household duty and chore assignment with completion tracking',
                'Family invitations with role-based access for siblings, spouses, and sitters',
              ],
            }),
          }}
        />
        <JsonLd data={organizationSchema()} />
        {/* Resource hints for third-party origins */}
        <link rel="preconnect" href="https://apis.google.com" />
        <link rel="preconnect" href="https://weightlossprojectionlab-8b284.firebaseapp.com" />
        <link rel="dns-prefetch" href="https://apis.google.com" />
        <link rel="dns-prefetch" href="https://weightlossprojectionlab-8b284.firebaseapp.com" />
      </head>
      <body className="h-full font-sans antialiased flex flex-col">
        <CsrfInitializer />
        <UpdateChecker />
        <div className="flex-grow">
          <ConditionalProviders tenantSlug={tenantSlug}>{children}</ConditionalProviders>
        </div>
        <ConditionalFooter />
        <SpeedInsights />
      </body>
    </html>
  )
}