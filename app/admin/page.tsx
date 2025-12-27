/**
 * Admin Dashboard
 *
 * Central hub for admin-only features and tools
 */

'use client'

import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage and monitor platform operations
            </p>
          </div>

          {/* Admin Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Marketing & Ads */}
            <Link
              href="/admin/marketing"
              className="bg-card p-6 rounded-lg border border-border hover:border-primary hover:shadow-lg transition-all group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                🎨
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Marketing & Ads
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate persona-driven ads for multiple social media platforms
              </p>
              <div className="text-sm text-primary font-medium">
                Open Tool →
              </div>
            </Link>

            {/* User Management - Placeholder */}
            <div className="bg-card p-6 rounded-lg border border-border opacity-50">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                User Management
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                View and manage user accounts and subscriptions
              </p>
              <div className="text-sm text-muted-foreground">
                Coming Soon
              </div>
            </div>

            {/* Analytics - Placeholder */}
            <div className="bg-card p-6 rounded-lg border border-border opacity-50">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Analytics
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                View platform metrics and user engagement data
              </p>
              <div className="text-sm text-muted-foreground">
                Coming Soon
              </div>
            </div>

            {/* System Settings - Placeholder */}
            <div className="bg-card p-6 rounded-lg border border-border opacity-50">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                System Settings
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure platform settings and feature flags
              </p>
              <div className="text-sm text-muted-foreground">
                Coming Soon
              </div>
            </div>

            {/* Content Management - Placeholder */}
            <div className="bg-card p-6 rounded-lg border border-border opacity-50">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Content Management
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Manage templates, recipes, and educational content
              </p>
              <div className="text-sm text-muted-foreground">
                Coming Soon
              </div>
            </div>

            {/* Support & Feedback - Placeholder */}
            <div className="bg-card p-6 rounded-lg border border-border opacity-50">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Support & Feedback
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                View user feedback and support tickets
              </p>
              <div className="text-sm text-muted-foreground">
                Coming Soon
              </div>
            </div>
          </div>

          {/* Quick Stats - Placeholder */}
          <div className="mt-8 bg-gradient-to-br from-primary/10 to-purple-600/10 p-6 rounded-lg border border-primary/20">
            <h2 className="text-xl font-bold text-foreground mb-4">Quick Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">-</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">-</div>
                <div className="text-sm text-muted-foreground">Active Subscriptions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">-</div>
                <div className="text-sm text-muted-foreground">Revenue (MRR)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">-</div>
                <div className="text-sm text-muted-foreground">Active Households</div>
              </div>
            </div>
          </div>

          {/* Back to Dashboard Link */}
          <div className="mt-8">
            <Link
              href="/dashboard"
              className="text-sm text-primary hover:underline"
            >
              ← Back to Main Dashboard
            </Link>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
