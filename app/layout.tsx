import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import Script from 'next/script'
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider'
import { StepTrackingProvider } from '@/components/StepTrackingProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Weight Loss Progress Lab',
  description: 'AI-powered weight loss tracking with biometric authentication and meal analysis',
  manifest: '/manifest.json',
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
  maximumScale: 1,
  userScalable: false,
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
        <meta charSet="UTF-8" />
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
      </head>
      <body className="h-full font-sans antialiased">
        <ThemeProvider>
          <ServiceWorkerProvider>
            <StepTrackingProvider>
              <div className="flex min-h-full flex-col">
                {children}
              </div>
              <Toaster
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            </StepTrackingProvider>
          </ServiceWorkerProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}