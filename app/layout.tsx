import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider'
import { StepTrackingProvider } from '@/components/StepTrackingProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Weight Loss Progress Lab',
  description: 'AI-powered weight loss tracking with biometric authentication and meal analysis',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
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
  themeColor: '#000000',
  viewportFit: 'cover', // Enable safe area insets for notched devices
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full font-sans antialiased">
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
      </body>
    </html>
  )
}