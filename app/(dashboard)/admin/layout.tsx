'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { AdminNav } from '@/components/admin/AdminNav'
import { Spinner } from '@/components/ui/Spinner'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAdmin, loading } = useAdminAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAdmin) {
      // Redirect non-admin users
      router.push('/dashboard')
    }
  }, [isAdmin, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Spinner size="large" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking permissions...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-red-700 dark:text-red-300">
            You do not have permission to access the admin panel.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Admin Sidebar Navigation */}
      <AdminNav />

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
