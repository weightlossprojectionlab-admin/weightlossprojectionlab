/**
 * Medical Documents Redirect - Marketing Blog Page
 *
 * This page redirects/markets to the main /documents page since that already exists
 */

import Link from 'next/link'
import { Metadata } from 'next'
import { DocumentTextIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

export const metadata: Metadata = {
  title: 'Medical Documents - Secure Document Storage | Wellness Projection Lab',
  description: 'Securely store and manage medical documents for your family. HIPAA-compliant storage with Intelligent OCR text extraction, smart categorization, and easy sharing with healthcare providers.',
  keywords: 'medical documents, document storage, insurance cards, lab results, prescriptions, HIPAA storage, OCR extraction, medical records',
  openGraph: {
    title: 'Medical Documents - Secure Document Storage',
    description: 'Securely store and manage medical documents for your family with HIPAA-compliant storage and Intelligent OCR.',
    type: 'article',
    url: 'https://weightlossproglab.com/blog/medical-documents',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Medical Documents - Secure Document Storage',
    description: 'Securely store and manage medical documents for your family with HIPAA-compliant storage and Intelligent OCR.',
  },
  alternates: {
    canonical: 'https://weightlossproglab.com/blog/medical-documents'
  }
}

export default function MedicalDocumentsBlogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center max-w-4xl mx-auto">
            <DocumentTextIcon className="w-20 h-20 mx-auto mb-6 opacity-90" />
            <h1 className="text-5xl md:text-6xl font-bold mb-6">Medical Document Management</h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Securely store, organize, and access medical documents for all family members in one centralized location.
              HIPAA-compliant storage with powerful OCR text extraction and intelligent categorization.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/documents"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg flex items-center gap-2"
              >
                <span>Go to Documents</span>
                <ArrowRightIcon className="w-5 h-5" />
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors font-semibold"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <section className="mb-20 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-8">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Full Medical Document Management Available
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Our comprehensive medical document system is already live and ready to use. Store insurance cards,
                lab results, prescriptions, imaging reports, immunization records, and more with HIPAA-compliant
                security and Intelligent OCR text extraction.
              </p>
              <Link
                href="/documents"
                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg"
              >
                <DocumentTextIcon className="w-6 h-6" />
                <span>Access Document Manager</span>
                <ArrowRightIcon className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Feature Overview */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="text-5xl mb-4">📄</div>
              <h3 className="font-semibold text-foreground mb-2">Multi-Format Upload</h3>
              <p className="text-muted-foreground">Images (JPG, PNG, HEIC) and PDFs up to 10MB</p>
            </div>
            <div className="text-center p-6">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="font-semibold text-foreground mb-2">Intelligent OCR</h3>
              <p className="text-muted-foreground">Automatic text extraction with WPL platform</p>
            </div>
            <div className="text-center p-6">
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="font-semibold text-foreground mb-2">HIPAA Compliant</h3>
              <p className="text-muted-foreground">AES-256 encryption with secure cloud storage</p>
            </div>
          </div>
        </section>

        {/* Related Links */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">Related Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RelatedLink href="/blog/patient-care" title="Patient Care" description="Comprehensive patient profiles and health data" />
            <RelatedLink href="/blog/medications" title="Medications" description="Track prescriptions and medication schedules" />
            <RelatedLink href="/blog/appointments" title="Appointments" description="Schedule and manage healthcare appointments" />
            <RelatedLink href="/blog/vitals-tracking" title="Vitals Tracking" description="Monitor vital signs and health metrics" />
            <RelatedLink href="/blog/family-care" title="Family Care" description="Manage health data for multiple family members" />
            <RelatedLink href="/blog/providers" title="Providers" description="Healthcare provider directory and management" />
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Start Organizing Your Medical Documents Today</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Upload, organize, and access your family's medical documents from anywhere with HIPAA-compliant security.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/documents"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
            >
              Go to Documents
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors font-semibold"
            >
              View Pricing
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm">
            <Link href="/security" className="text-white/90 hover:text-white underline">Security</Link>
            <Link href="/hipaa" className="text-white/90 hover:text-white underline">HIPAA Compliance</Link>
            <Link href="/privacy" className="text-white/90 hover:text-white underline">Privacy Policy</Link>
            <Link href="/support" className="text-white/90 hover:text-white underline">Help Center</Link>
          </div>
        </section>
      </main>
    </div>
  )
}

function RelatedLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="bg-card rounded-lg border-2 border-border p-4 hover:border-blue-300 hover:shadow-lg transition-all block">
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
