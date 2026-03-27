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
      { href: '/referrals', label: 'Referrals', public: true },
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
              <svg width="32" height="32" viewBox="0 0 512 512" className="flex-shrink-0">
                <circle cx="256" cy="256" r="230" fill="none" stroke="#ffffff" strokeWidth="20"/>
                <g transform="translate(256, 280)">
                  <path d="M -140 -70 L -115 40 L -90 -70 L -65 40 L -40 -70" stroke="#ffffff" strokeWidth="20" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  <g>
                    <path d="M 0 -70 L 0 60" stroke="#ffffff" strokeWidth="20" fill="none" strokeLinecap="round"/>
                    <path d="M 0 -70 Q 60 -70 60 -30 Q 60 10 0 10" stroke="#ffffff" strokeWidth="20" fill="none" strokeLinecap="round"/>
                    <g transform="translate(30, -30)">
                      <rect x="-8" y="-12" width="8" height="24" fill="#8B5CF6" rx="2"/>
                      <rect x="-2" y="-3" width="34" height="6" fill="#8B5CF6" rx="1"/>
                      <rect x="30" y="-12" width="8" height="24" fill="#8B5CF6" rx="2"/>
                    </g>
                  </g>
                  <path d="M 80 -70 L 80 60 L 140 60" stroke="#9FE870" strokeWidth="20" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </g>
              </svg>
              <span className="text-white font-bold text-lg">Wellness Projection Lab</span>
            </div>
            <p className="text-sm text-gray-400">
              &copy; {currentYear} Wellness Projection Lab. All rights reserved.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Intelligent wellness tracking with proprietary ML. HIPAA compliant.
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-6">
            <a
              href="https://x.com/LossWeight85941"
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
              href="https://www.linkedin.com/in/weight-loss-project-undefined-378b773b4"
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
              href="https://www.youtube.com/@WellnessLossProjectLab"
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
      </div>
    </footer>
  )
}
