'use client'

/**
 * Enterprise-Level Platform Footer
 * Comprehensive footer with all platform sections, legal, and social links
 * Features intelligent link gating based on user permissions and subscription tier
 */

import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { useFeatureGates } from '@/hooks/useFeatureGate'
import { useMemo } from 'react'

interface FooterLink {
  href: string
  label: string
  public?: boolean // Always visible
  requiresAuth?: boolean // Must be logged in
  requiresFeature?: string // Requires specific feature
  requiresAdmin?: boolean // Admin only
}

// Define features array outside component to prevent re-renders
const GATED_FEATURES = [
  'appointments',
  'medications',
  'vitals-tracking',
  'providers',
  'medical-records',
  'multiple-patients',
  'patient-management',
  'family-directory',
  'household-management',
  'advanced-analytics',
] as const

export function Footer() {
  const currentYear = new Date().getFullYear()
  const { user, loading, isAdmin } = useUser()

  // Check all features that have gated links
  const featureGates = useFeatureGates(GATED_FEATURES as unknown as string[])

  // Define link structure with gating rules
  const linkSections = useMemo(() => ({
    platform: [
      { href: '/blog/dashboard', label: 'Dashboard', public: true },
      { href: '/blog/profile', label: 'Profile', public: true },
      { href: '/blog/patients', label: 'Patients', public: true },
      { href: '/blog/family-care', label: 'Family Care', public: true },
      { href: '/blog/appointments', label: 'Appointments', public: true },
    ] as FooterLink[],
    features: [
      { href: '/blog/meal-tracking', label: 'Meal Tracking', public: true },
      { href: '/blog/weight-tracking', label: 'Weight Tracking', public: true },
      { href: '/blog/ai-health-reports', label: 'AI Health Reports', public: true },
      { href: '/blog/smart-shopping', label: 'Smart Shopping', public: true },
      { href: '/blog/inventory-management', label: 'Inventory Management', public: true },
    ] as FooterLink[],
    healthcare: [
      { href: '/blog/patient-care', label: 'Patient Care', public: true },
      { href: '/blog/providers', label: 'Providers', public: true },
      { href: '/blog/medications', label: 'Medications', public: true },
      { href: '/blog/vitals-tracking', label: 'Vitals Tracking', public: true },
      { href: '/blog/medical-documents', label: 'Medical Documents', public: true },
    ] as FooterLink[],
    resources: [
      { href: '/pricing', label: 'Pricing', public: true },
      { href: '/docs', label: 'Documentation', public: true },
      { href: '/blog', label: 'Blog', public: true },
      { href: '/support', label: 'Help Center', public: true },
    ] as FooterLink[],
    company: [
      { href: '/about', label: 'About Us', public: true },
      { href: '/careers', label: 'Careers', public: true },
      { href: '/contact', label: 'Contact', public: true },
      { href: '/press', label: 'Press Kit', public: true },
      { href: '/partners', label: 'Partners', public: true },
    ] as FooterLink[],
    legal: [
      { href: '/privacy', label: 'Privacy Policy', public: true },
      { href: '/terms', label: 'Terms of Service', public: true },
      { href: '/hipaa', label: 'HIPAA Compliance', public: true },
      { href: '/security', label: 'Security', public: true },
      { href: '/accessibility', label: 'Accessibility', public: true },
    ] as FooterLink[],
  }), [])

  // Filter links based on user permissions
  const shouldShowLink = (link: FooterLink): boolean => {
    // Always show public links
    if (link.public) return true

    // Loading state - hide gated links
    if (loading) return false

    // Admin-only links
    if (link.requiresAdmin && !isAdmin) return false

    // Auth-required links
    if (link.requiresAuth && !user) return false

    // Feature-gated links
    if (link.requiresFeature) {
      const gate = featureGates[link.requiresFeature]
      if (!gate || !gate.canAccess) return false
    }

    return true
  }

  const filterLinks = (links: FooterLink[]) => links.filter(shouldShowLink)

  // Get filtered links for each section
  const platformLinks = filterLinks(linkSections.platform)
  const featureLinks = filterLinks(linkSections.features)
  const healthcareLinks = filterLinks(linkSections.healthcare)
  const resourceLinks = filterLinks(linkSections.resources)
  const companyLinks = filterLinks(linkSections.company)
  const legalLinks = filterLinks(linkSections.legal)

  // Helper to render section only if it has visible links
  const renderSection = (title: string, links: FooterLink[]) => {
    if (links.length === 0) return null

    return (
      <div>
        <h3 className="text-white font-semibold mb-4">{title}</h3>
        <ul className="space-y-3">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-white transition-colors">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
          {renderSection('Platform', platformLinks)}
          {renderSection('Features', featureLinks)}
          {renderSection('Healthcare', healthcareLinks)}
          {renderSection('Resources', resourceLinks)}
          {renderSection('Company', companyLinks)}
          {renderSection('Legal', legalLinks)}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 mb-8"></div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Brand & Copyright */}
          <div className="text-center md:text-left">
            <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
              <div className="text-2xl">⚖️</div>
              <span className="text-white font-bold text-lg">Weight Loss Projection Lab</span>
            </div>
            <p className="text-sm text-gray-400">
              &copy; {currentYear} Weight Loss Projection Lab. All rights reserved.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              AI-powered health tracking platform. HIPAA compliant.
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-6">
            <a
              href="https://twitter.com/wlpl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Twitter"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
            <a
              href="https://github.com/wlpl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="GitHub"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
            <a
              href="https://linkedin.com/company/wlpl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="LinkedIn"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a
              href="https://youtube.com/@wlpl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="YouTube"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
          </div>

          {/* Trust Badges */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <span className="text-green-500">✓</span>
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-green-500">✓</span>
              <span>SOC 2 Type II</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-green-500">✓</span>
              <span>ISO 27001</span>
            </div>
          </div>
        </div>

        {/* Mobile App Links */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <p className="text-sm text-gray-400">Get the mobile app:</p>
            <div className="flex gap-3">
              <a
                href="https://apps.apple.com/app/wlpl"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <span className="text-sm font-medium">App Store</span>
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.wlpl"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z" />
                </svg>
                <span className="text-sm font-medium">Google Play</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
