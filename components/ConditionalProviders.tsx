'use client'

import { usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider'
import { StepTrackingProvider } from '@/components/StepTrackingProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import { MenuProvider } from '@/contexts/MenuContext'
import { AppMenu } from '@/components/ui/AppMenu'

/**
 * Conditionally render providers based on the current route
 *
 * Home page gets minimal providers for maximum performance (no Firebase, no menu, no toasts)
 * All other pages get the full provider stack
 */
export function ConditionalProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Home page: Only ThemeProvider (for dark mode support)
  // No Firebase, no menu, no step tracking, no service worker, no toaster
  if (pathname === '/') {
    return (
      <ThemeProvider>
        {children}
      </ThemeProvider>
    )
  }

  // All other pages: Full provider stack with all features
  return (
    <ThemeProvider>
      <ServiceWorkerProvider>
        <StepTrackingProvider>
          <MenuProvider>
            <div className="flex min-h-full flex-col">
              {children}
            </div>
            <AppMenu />
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
          </MenuProvider>
        </StepTrackingProvider>
      </ServiceWorkerProvider>
    </ThemeProvider>
  )
}
