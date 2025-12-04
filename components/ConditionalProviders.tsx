'use client'

import { usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import { MenuProvider } from '@/contexts/MenuContext'
import { AccountProvider } from '@/contexts/AccountContext'
import { AppMenu } from '@/components/ui/AppMenu'
import { CsrfInitializer } from '@/components/CsrfInitializer'
import { GlobalAlertModal } from '@/components/GlobalAlertModal'

/**
 * Conditionally render providers based on the current route
 *
 * Home page gets minimal providers for maximum performance (no Firebase, no menu, no toasts)
 * All other pages get the full provider stack
 *
 * Note: StepTrackingProvider removed from global providers (performance optimization)
 * Pages that need step tracking should wrap themselves with StepTrackingProvider
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

  // All other pages: Provider stack without StepTrackingProvider (loaded per-page as needed)
  return (
    <ThemeProvider>
      <ServiceWorkerProvider>
        <AccountProvider>
          <MenuProvider>
            <CsrfInitializer />
            <GlobalAlertModal />
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
        </AccountProvider>
      </ServiceWorkerProvider>
    </ThemeProvider>
  )
}
