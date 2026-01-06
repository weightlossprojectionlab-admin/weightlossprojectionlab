import type { Metadata, Viewport } from 'next'
import { ConditionalProviders } from '@/components/ConditionalProviders'
import { CsrfInitializer } from '@/components/CsrfInitializer'
import { ConditionalFooter } from '@/components/ConditionalFooter'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

// Force dynamic rendering for all pages to skip static generation
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export const metadata: Metadata = {
  title: 'Wellness Projection Lab',
  description: 'AI-powered wellness tracking with comprehensive health, nutrition, and fitness management',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
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
    statusBarStyle: 'default', // Light status bar for light mode
    title: 'WLPL',
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
        {/* Resource hints for third-party origins */}
        <link rel="preconnect" href="https://apis.google.com" />
        <link rel="preconnect" href="https://weightlossprojectionlab-8b284.firebaseapp.com" />
        <link rel="dns-prefetch" href="https://apis.google.com" />
        <link rel="dns-prefetch" href="https://weightlossprojectionlab-8b284.firebaseapp.com" />
      </head>
      <body className="h-full font-sans antialiased flex flex-col">
        <CsrfInitializer />
        <div className="flex-grow">
          <ConditionalProviders>{children}</ConditionalProviders>
        </div>
        <ConditionalFooter />
        <SpeedInsights />
      </body>
    </html>
  )
}