/**
 * Blog Index Page
 *
 * Main blog landing page showcasing all WLPL feature articles
 * Organized by category with search and filtering
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
  ArrowRightIcon
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
    // Platform Posts
    {
      slug: '/blog/dashboard',
      title: 'Health Dashboard',
      description: 'Your family\'s centralized health command center with Intelligent insights',
      category: 'platform',
      icon: <ChartBarIcon className="w-6 h-6" />,
      readTime: '5 min read',
      image: '/screenshots/family-care/family-dashboard-overview-desktop-light.png'
    },
    {
      slug: '/blog/profile',
      title: 'User Profile',
      description: 'Personalized health settings and account management',
      category: 'platform',
      icon: <UserGroupIcon className="w-6 h-6" />,
      readTime: '4 min read'
    },
    {
      slug: '/blog/patients',
      title: 'Patient Management',
      description: 'Create and manage health profiles for every family member',
      category: 'platform',
      icon: <HeartIcon className="w-6 h-6" />,
      readTime: '6 min read'
    },
    {
      slug: '/blog/family-care',
      title: 'Family Care Dashboard',
      description: 'Coordinate health for your whole family from one place',
      category: 'platform',
      icon: <UserGroupIcon className="w-6 h-6" />,
      readTime: '7 min read',
      image: '/screenshots/family-care/management-tools-desktop-light.png'
    },
    {
      slug: '/blog/appointments',
      title: 'Appointment Scheduling',
      description: 'Manage medical appointments with reminders and driver assignment',
      category: 'platform',
      icon: <DocumentTextIcon className="w-6 h-6" />,
      readTime: '5 min read'
    },

    // Features Posts
    {
      slug: '/blog/meal-tracking',
      title: 'AI Meal Tracking',
      description: 'Photo-based meal logging with AI nutritional analysis',
      category: 'features',
      icon: <BeakerIcon className="w-6 h-6" />,
      readTime: '6 min read'
    },
    {
      slug: '/blog/weight-tracking',
      title: 'Weight Progress Tracking',
      description: 'Visualize your weight loss journey with interactive charts',
      category: 'features',
      icon: <ChartBarIcon className="w-6 h-6" />,
      readTime: '5 min read'
    },
    {
      slug: '/blog/ai-health-reports',
      title: 'WLPL Health Reports',
      description: 'Weekly personalized health insights powered by WLPL platform',
      category: 'features',
      icon: <BeakerIcon className="w-6 h-6" />,
      readTime: '7 min read'
    },
    {
      slug: '/blog/smart-shopping',
      title: 'Smart Shopping Lists',
      description: 'Platform-generated grocery lists based on your meal plans',
      category: 'features',
      icon: <DocumentTextIcon className="w-6 h-6" />,
      readTime: '5 min read'
    },
    {
      slug: '/blog/inventory-management',
      title: 'Kitchen Inventory',
      description: 'Track pantry items with expiration alerts and waste reduction',
      category: 'features',
      icon: <DocumentTextIcon className="w-6 h-6" />,
      readTime: '4 min read'
    },

    // Healthcare Posts
    {
      slug: '/blog/patient-care',
      title: 'Comprehensive Patient Care',
      description: 'Full health profiles with vitals, medications, and medical history',
      category: 'healthcare',
      icon: <HeartIcon className="w-6 h-6" />,
      readTime: '8 min read',
      image: '/screenshots/patient-care/patient-profile-vitals-desktop-light.png'
    },
    {
      slug: '/blog/providers',
      title: 'Healthcare Providers',
      description: 'Organize your medical team with provider directory',
      category: 'healthcare',
      icon: <UserGroupIcon className="w-6 h-6" />,
      readTime: '4 min read'
    },
    {
      slug: '/blog/medications',
      title: 'Medication Tracking',
      description: 'Track prescriptions with dosage reminders and refill alerts',
      category: 'healthcare',
      icon: <BeakerIcon className="w-6 h-6" />,
      readTime: '6 min read'
    },
    {
      slug: '/blog/vitals-tracking',
      title: 'Vitals Monitoring',
      description: 'Track blood pressure, glucose, temperature, and more',
      category: 'healthcare',
      icon: <HeartIcon className="w-6 h-6" />,
      readTime: '5 min read'
    },
    {
      slug: '/blog/medical-documents',
      title: 'Medical Documents',
      description: 'Secure storage with OCR text extraction and smart organization',
      category: 'healthcare',
      icon: <DocumentTextIcon className="w-6 h-6" />,
      readTime: '6 min read'
    }
  ]

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = [
    { id: 'all', label: 'All Posts', count: blogPosts.length },
    { id: 'platform', label: 'Platform', count: blogPosts.filter(p => p.category === 'platform').length },
    { id: 'features', label: 'Features', count: blogPosts.filter(p => p.category === 'features').length },
    { id: 'healthcare', label: 'Healthcare', count: blogPosts.filter(p => p.category === 'healthcare').length }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">WLPL Blog</h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Explore our comprehensive guides on health tracking, family care coordination, and intelligent wellness management.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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

        {/* Featured Posts */}
        {selectedCategory === 'all' && searchQuery === '' && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-8">Featured Articles</h2>
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
                      Read More
                      <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* All Posts Grid */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-8">
            {searchQuery ? `Search Results (${filteredPosts.length})` : 'All Articles'}
          </h2>

          {filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <MagnifyingGlassIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No articles found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter to find what you're looking for.
              </p>
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
                          {post.category}
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
                      Read
                      <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="mt-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Start Your Health Journey?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Join thousands of families using WLPL to track health, coordinate care, and achieve their wellness goals.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
            >
              Start Free Trial
            </Link>
          </div>
          <p className="text-sm text-blue-200 mt-6">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </section>
      </main>
    </div>
  )
}
