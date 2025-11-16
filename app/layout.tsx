import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { ConditionalProviders } from '@/components/ConditionalProviders'
import './globals.css'

export const metadata: Metadata = {
  title: 'Weight Loss Progress Lab',
  description: 'AI-powered weight loss tracking with biometric authentication and meal analysis',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
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
    title: 'WLPL',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow zooming up to 5x for accessibility
  userScalable: true, // Enable user scaling for accessibility
  themeColor: '#4F46E5',
  viewportFit: 'cover', // Enable safe area insets for notched devices
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        {/* Resource hints for third-party origins */}
        <link rel="preconnect" href="https://apis.google.com" />
        <link rel="preconnect" href="https://weightlossprojectionlab-8b284.firebaseapp.com" />
        <link rel="dns-prefetch" href="https://apis.google.com" />
        <link rel="dns-prefetch" href="https://weightlossprojectionlab-8b284.firebaseapp.com" />
      </head>
      <body className="h-full font-sans antialiased">
        <Script id="theme-script" strategy="beforeInteractive">
          {`(function() {
            try {
              const theme = localStorage.getItem('wlpl-theme') || 'system';
              const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              const resolvedTheme = theme === 'system' ? systemTheme : theme;
              document.documentElement.classList.add(resolvedTheme);
              const metaThemeColor = document.querySelector('meta[name="theme-color"]');
              if (metaThemeColor) {
                metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#111827' : '#ffffff');
              }
            } catch (e) {}
          })();`}
        </Script>

        <ConditionalProviders>{children}</ConditionalProviders>
      </body>
    </html>
  )
}