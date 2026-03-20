/**
 * Blog Index — Platform Storefront
 *
 * Repositioned from article listing to product discovery hub.
 * Shows the 4 modes, highlights the interconnection story,
 * and positions WPL as a health operating system.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  MagnifyingGlassIcon,
  ChartBarIcon,
  UserGroupIcon,
  BeakerIcon,
  HeartIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  SparklesIcon,
  UserIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  BellAlertIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'

interface BlogPost {
  slug: string
  title: string
  description: string
  category: 'platform' | 'features' | 'healthcare'
  icon: React.ReactNode
  readTime: string
  image?: string
}

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const blogPosts: BlogPost[] = [
    // Platform
    { slug: '/blog/dashboard', title: 'Health Dashboard', description: 'See everyone\'s health in one glance — and know exactly what needs attention.', category: 'platform', icon: <ChartBarIcon className="w-6 h-6" />, readTime: '5 min read', image: '/screenshots/family-care/family-dashboard-overview-desktop-light.png' },
    { slug: '/blog/profile', title: 'Health Identity', description: 'The AI learns what\'s normal for each person so it can spot what isn\'t.', category: 'platform', icon: <UserGroupIcon className="w-6 h-6" />, readTime: '4 min read' },
    { slug: '/blog/patients', title: 'Health Profiles', description: 'Every person you care about — one intelligent system.', category: 'platform', icon: <HeartIcon className="w-6 h-6" />, readTime: '6 min read' },
    { slug: '/blog/family-care', title: 'Family Care', description: 'One place to protect your entire family\'s health.', category: 'platform', icon: <UserGroupIcon className="w-6 h-6" />, readTime: '7 min read', image: '/screenshots/family-care/management-tools-desktop-light.png' },
    { slug: '/blog/appointments', title: 'Appointments', description: 'Never miss a visit — for anyone in your family.', category: 'platform', icon: <DocumentTextIcon className="w-6 h-6" />, readTime: '5 min read' },
    // Features
    { slug: '/blog/meal-tracking', title: 'AI Meal Tracking', description: 'Know what everyone\'s eating — AI does the math.', category: 'features', icon: <BeakerIcon className="w-6 h-6" />, readTime: '6 min read' },
    { slug: '/blog/weight-tracking', title: 'Weight Projections', description: 'See where you\'re headed — not just where you\'ve been.', category: 'features', icon: <ChartBarIcon className="w-6 h-6" />, readTime: '5 min read' },
    { slug: '/blog/ai-health-reports', title: 'AI Health Reports', description: 'Your family\'s health — interpreted, not just tracked.', category: 'features', icon: <SparklesIcon className="w-6 h-6" />, readTime: '7 min read' },
    { slug: '/blog/smart-shopping', title: 'Smart Shopping', description: 'From meal plan to grocery cart — automatically.', category: 'features', icon: <ClipboardDocumentListIcon className="w-6 h-6" />, readTime: '5 min read' },
    { slug: '/blog/inventory-management', title: 'Kitchen Inventory', description: 'Know what you have. Know what you need. Waste nothing.', category: 'features', icon: <DocumentTextIcon className="w-6 h-6" />, readTime: '4 min read' },
    // Healthcare
    { slug: '/blog/patient-care', title: 'Care Coordination', description: 'Coordinate care across caregivers — no one falls through the cracks.', category: 'healthcare', icon: <HeartIcon className="w-6 h-6" />, readTime: '8 min read', image: '/screenshots/patient-care/patient-profile-vitals-desktop-light.png' },
    { slug: '/blog/providers', title: 'Your Medical Team', description: 'Keep your doctors in the loop — without the paperwork.', category: 'healthcare', icon: <UserGroupIcon className="w-6 h-6" />, readTime: '4 min read' },
    { slug: '/blog/medications', title: 'Medication Safety', description: 'Every pill, every person, every reminder — handled.', category: 'healthcare', icon: <BellAlertIcon className="w-6 h-6" />, readTime: '6 min read' },
    { slug: '/blog/vitals-tracking', title: 'Vitals Monitoring', description: 'Catch problems before they become emergencies.', category: 'healthcare', icon: <HeartIcon className="w-6 h-6" />, readTime: '5 min read' },
    { slug: '/blog/medical-documents', title: 'Medical Documents', description: 'Insurance cards, lab results, prescriptions — always with you.', category: 'healthcare', icon: <DocumentTextIcon className="w-6 h-6" />, readTime: '6 min read' },
  ]

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = [
    { id: 'all', label: 'All', count: blogPosts.length },
    { id: 'platform', label: 'Platform', count: blogPosts.filter(p => p.category === 'platform').length },
    { id: 'features', label: 'Intelligence', count: blogPosts.filter(p => p.category === 'features').length },
    { id: 'healthcare', label: 'Healthcare', count: blogPosts.filter(p => p.category === 'healthcare').length },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Health Operating System</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              The Platform Built for Families Who Take Health Seriously
            </h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed max-w-3xl mx-auto">
              Track meals, weight, vitals, and medications for everyone you care about — powered by AI that detects patterns, projects trends, and alerts you before problems happen.
            </p>

            {/* Search */}
            <div className="relative max-w-2xl mx-auto">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* 4 Modes — Entry Points */}
        {selectedCategory === 'all' && searchQuery === '' && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-3 text-center">One System. Four Ways to Use It.</h2>
            <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
              Tell us who you&apos;re tracking, and the platform adapts.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ModeEntry icon={<UserIcon className="w-6 h-6" />} title="Personal" description="Your own health journey" color="bg-blue-500" href="/blog/weight-tracking" />
              <ModeEntry icon={<HeartIcon className="w-6 h-6" />} title="Family" description="Kids, partner, siblings" color="bg-pink-500" href="/blog/family-care" />
              <ModeEntry icon={<ShieldCheckIcon className="w-6 h-6" />} title="Caregiving" description="Aging parents, duties" color="bg-amber-500" href="/blog/patient-care" />
              <ModeEntry icon={<AcademicCapIcon className="w-6 h-6" />} title="Professional" description="Coaches, providers" color="bg-purple-500" href="/blog/providers" />
            </div>
          </section>
        )}

        {/* Category Filter */}
        <div className="mb-12">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-card border-2 border-border text-foreground hover:border-blue-300 hover:shadow-md'
                }`}
              >
                {category.label}
                <span className="ml-2 text-sm opacity-75">({category.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Featured */}
        {selectedCategory === 'all' && searchQuery === '' && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-8">Start Here</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {blogPosts.filter(p => p.image).slice(0, 3).map((post) => (
                <Link
                  key={post.slug}
                  href={post.slug}
                  className="group bg-card rounded-xl border-2 border-border overflow-hidden hover:border-blue-300 hover:shadow-xl transition-all"
                >
                  {post.image && (
                    <div className="relative h-48 bg-secondary overflow-hidden">
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full capitalize">
                        {post.category}
                      </span>
                      <span className="text-sm text-muted-foreground">{post.readTime}</span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-blue-600 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground mb-4">{post.description}</p>
                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                      Explore
                      <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* The Interconnection Story */}
        {selectedCategory === 'all' && searchQuery === '' && (
          <section className="mb-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-8 md:p-12 text-white">
            <h2 className="text-3xl font-bold mb-4 text-center">Everything Connects</h2>
            <p className="text-white/80 text-center mb-8 max-w-2xl mx-auto">
              Features don&apos;t work in isolation. WPL creates an intelligent loop where each action informs the next.
            </p>
            <div className="flex flex-wrap justify-center items-center gap-3 text-sm">
              {[
                'Profiles', 'Meal Tracking', 'Shopping Lists', 'Kitchen Inventory',
                'Weight Projections', 'AI Reports', 'Vitals', 'Medications',
                'Appointments', 'Providers', 'Documents', 'Duties'
              ].map((item, i) => (
                <span key={i} className="flex items-center gap-2">
                  <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full font-medium">{item}</span>
                  {i < 11 && <ArrowRightIcon className="w-3 h-3 text-white/50" />}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* All Posts Grid */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-8">
            {searchQuery ? `Search Results (${filteredPosts.length})` : 'Explore the Platform'}
          </h2>

          {filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <MagnifyingGlassIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No articles found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={post.slug}
                  className="group bg-card rounded-xl border-2 border-border p-6 hover:border-blue-300 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                      {post.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-secondary text-xs font-semibold rounded capitalize text-foreground">
                          {post.category === 'features' ? 'intelligence' : post.category}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-blue-600 transition-colors">
                        {post.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{post.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{post.readTime}</span>
                    <div className="flex items-center gap-1 text-blue-600 font-medium text-sm">
                      Explore
                      <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="mt-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Your Family&apos;s Health Deserves Better Than Guesswork</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            One system that tracks, analyzes, alerts, and improves — for everyone you care about.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
          >
            Start Your Free Trial
          </Link>
          <p className="text-sm text-blue-200 mt-6">
            No credit card required &bull; 7-day free trial &bull; Cancel anytime
          </p>
        </section>
      </main>
    </div>
  )
}

function ModeEntry({ icon, title, description, color, href }: { icon: React.ReactNode; title: string; description: string; color: string; href: string }) {
  return (
    <Link href={href} className="group flex items-center gap-4 p-4 bg-card rounded-xl border-2 border-border hover:border-blue-300 hover:shadow-lg transition-all">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-foreground group-hover:text-blue-600 transition-colors">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRightIcon className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
    </Link>
  )
}
