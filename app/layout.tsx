import type { Metadata, Viewport } from 'next'
import { ConditionalProviders } from '@/components/ConditionalProviders'
import { CsrfInitializer } from '@/components/CsrfInitializer'
import { ConditionalFooter } from '@/components/ConditionalFooter'
import { UpdateChecker } from '@/components/UpdateChecker'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

// Force dynamic rendering for all pages to skip static generation
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export const metadata: Metadata = {
  title: {
    default: 'Wellness Projection Lab — AI-Powered Family Health Tracking',
    template: '%s | Wellness Projection Lab',
  },
  description: 'Track meals, vitals, medications, and weight for your entire family with AI-powered insights. From newborns to seniors — one platform for every life stage.',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.weightlossprojectionlab.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Wellness Projection Lab',
    title: 'Wellness Projection Lab — AI-Powered Family Health Tracking',
    description: 'Track meals, vitals, medications, and weight for your entire family with AI-powered insights. From newborns to seniors — one platform for every life stage.',
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
    title: 'Wellness Projection Lab — AI-Powered Family Health Tracking',
    description: 'Track meals, vitals, medications, and weight for your entire family with AI-powered insights.',
    images: ['/screenshots/family-care/family-dashboard-overview-desktop-light.png'],
  },
  keywords: [
    'health tracking',
    'family health',
    'meal tracking',
    'weight loss',
    'vitals monitoring',
    'medication management',
    'AI health',
    'caregiver app',
    'newborn tracking',
    'senior care',
    'wellness app',
    'health reports',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
              applicationCategory: 'HealthApplication',
              operatingSystem: 'Web',
              description: 'AI-powered family health tracking platform. Track meals, vitals, medications, and weight from newborns to seniors.',
              url: 'https://www.weightlossprojectionlab.com',
              offers: {
                '@type': 'AggregateOffer',
                lowPrice: '0',
                highPrice: '14.99',
                priceCurrency: 'USD',
                offerCount: '4',
              },
              featureList: [
                'AI meal photo analysis',
                'Weight loss projections',
                'Family health dashboard',
                'Vitals monitoring',
                'Medication management',
                'Newborn and pediatric tracking',
                'Senior care coordination',
                'AI health reports',
                'Smart shopping lists',
                'Medical document OCR',
              ],
            }),
          }}
        />
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
          <ConditionalProviders>{children}</ConditionalProviders>
        </div>
        <ConditionalFooter />
        <SpeedInsights />
      </body>
    </html>
  )
}