import type { Metadata } from 'next'
import Link from 'next/link'
import { ReactNode } from 'react'

interface GuideTemplateProps {
  title: string
  description: string
  children: ReactNode
}

export function GuideTemplate({ title, description, children }: GuideTemplateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Breadcrumb */}
        <div className="mb-8">
          <nav className="text-sm text-gray-600 whitespace-nowrap">
            <Link href="/docs" className="hover:text-blue-600">Documentation</Link>
            <span className="mx-2 text-gray-400">/</span>
            <Link href="/docs/user-guides" className="hover:text-blue-600">User Guides</Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-900 font-medium">{title}</span>
          </nav>
        </div>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
          <p className="text-xl text-gray-600">{description}</p>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">{children}</div>

        {/* Support Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-3">Still have questions?</h2>
          <p className="text-blue-100 mb-6">Our support team is here to help</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/support"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Contact Support
            </Link>
            <Link
              href="/docs/user-guides"
              className="bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Back to Guides
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ComingSoonBadge() {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-8 rounded-r-lg">
      <p className="font-semibold text-yellow-900 mb-2">📝 Guide In Progress</p>
      <p className="text-yellow-800 m-0">
        This guide is currently being written. Check back soon for detailed instructions, or{' '}
        <Link href="/support" className="underline font-medium">
          contact support
        </Link>{' '}
        if you need immediate help.
      </p>
    </div>
  )
}
