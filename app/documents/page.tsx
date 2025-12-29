/**
 * Medical Documents Page
 *
 * Comprehensive guide to the platform's document management system
 * All content is 100% relevant to the actual WLPL platform features
 */

'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  DocumentTextIcon,
  PhotoIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  LockClosedIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
  DocumentMagnifyingGlassIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline'

export default function DocumentsPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center max-w-4xl mx-auto">
            <DocumentTextIcon className="w-20 h-20 mx-auto mb-6 opacity-90" />
            <h1 className="text-5xl font-bold mb-6">Medical Document Management</h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Securely store, organize, and access medical documents for all family members in one centralized location.
              HIPAA-compliant storage with powerful OCR text extraction and intelligent categorization.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/family-admin/documents"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
              >
                Manage Documents
              </Link>
              <Link
                href="/support"
                className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors font-semibold"
              >
                Get Help
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Key Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Document Management Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<CloudArrowUpIcon className="w-12 h-12 text-blue-600" />}
              title="Multi-Format Upload"
              description="Upload images (JPG, PNG, HEIC) and PDFs up to 10MB. Drag and drop or click to browse."
            />
            <FeatureCard
              icon={<DocumentMagnifyingGlassIcon className="w-12 h-12 text-blue-600" />}
              title="AI-Powered OCR"
              description="Automatic text extraction from scanned documents using Google Gemini Vision for searchable content."
            />
            <FeatureCard
              icon={<FunnelIcon className="w-12 h-12 text-blue-600" />}
              title="Smart Categorization"
              description="Organize by type: Insurance Cards, Lab Results, Prescriptions, Imaging, Immunizations, and more."
            />
            <FeatureCard
              icon={<UserGroupIcon className="w-12 h-12 text-blue-600" />}
              title="Family Member Filtering"
              description="Filter documents by specific family members or view all documents across your household."
            />
            <FeatureCard
              icon={<MagnifyingGlassIcon className="w-12 h-12 text-blue-600" />}
              title="Full-Text Search"
              description="Search documents by name, notes, patient name, or extracted text from OCR processing."
            />
            <FeatureCard
              icon={<ShieldCheckIcon className="w-12 h-12 text-blue-600" />}
              title="HIPAA Compliance"
              description="AES-256 encryption at rest, TLS 1.3 in transit. All documents stored securely in Firebase Storage."
            />
          </div>
        </section>

        {/* Document Categories */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Document Categories</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CategoryCard
              icon="💳"
              title="Insurance Cards"
              description="Health insurance cards, dental, vision, and pet insurance documentation"
              examples={['Health insurance cards', 'Dental insurance', 'Vision insurance', 'Pet insurance']}
            />
            <CategoryCard
              icon="🧪"
              title="Lab Results"
              description="Blood work, urinalysis, pathology reports, and diagnostic test results"
              examples={['Blood panels', 'Cholesterol reports', 'A1C results', 'Urinalysis']}
            />
            <CategoryCard
              icon="💊"
              title="Prescriptions"
              description="Prescription documents, medication labels, and refill information"
              examples={['Prescription bottles', 'Rx labels', 'Medication lists', 'Refill slips']}
            />
            <CategoryCard
              icon="🏥"
              title="Imaging"
              description="X-rays, MRIs, CT scans, ultrasounds, and radiology reports"
              examples={['X-ray reports', 'MRI results', 'CT scan images', 'Ultrasound reports']}
            />
            <CategoryCard
              icon="💉"
              title="Immunizations"
              description="Vaccination records, immunization cards, and shot histories"
              examples={['COVID-19 cards', 'Flu shot records', 'Childhood vaccines', 'Travel vaccines']}
            />
            <CategoryCard
              icon="📋"
              title="Other Medical"
              description="Any other medical documents like discharge papers, referrals, and notes"
              examples={['Discharge summaries', 'Referral letters', 'Doctor notes', 'Treatment plans']}
            />
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <StepCard
              number="1"
              title="Upload"
              description="Click 'Upload Document' and select files or drag and drop. Supports images and PDFs."
            />
            <StepCard
              number="2"
              title="Categorize"
              description="Choose document category and assign to a family member. Add optional notes and tags."
            />
            <StepCard
              number="3"
              title="OCR Processing"
              description="AI automatically extracts text from images and PDFs for searchability."
            />
            <StepCard
              number="4"
              title="Access Anytime"
              description="View, download, or share documents. Filter by member, category, or search text."
            />
          </div>
        </section>

        {/* Detailed Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Detailed Features</h2>
          <div className="space-y-4">
            <DetailSection
              title="Multi-Image Document Support"
              icon={<PhotoIcon className="w-6 h-6 text-blue-600" />}
              expanded={expandedSection === 'multi-image'}
              onToggle={() => toggleSection('multi-image')}
            >
              <p className="text-muted-foreground mb-4">
                Upload multiple images for a single document (e.g., front and back of insurance card).
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Each image is stored separately with labels: front, back, bottle, label, information, other</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>OCR runs on each image independently for maximum text extraction</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Thumbnails generated for quick gallery preview</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Primary image designation for default display</span>
                </li>
              </ul>
            </DetailSection>

            <DetailSection
              title="OCR Text Extraction"
              icon={<DocumentMagnifyingGlassIcon className="w-6 h-6 text-blue-600" />}
              expanded={expandedSection === 'ocr'}
              onToggle={() => toggleSection('ocr')}
            >
              <p className="text-muted-foreground mb-4">
                Powered by Google Gemini Vision API for intelligent text recognition and extraction.
              </p>
              <ul className="space-y-2 text-muted-foreground mb-4">
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Automatic OCR processing on upload for images and PDFs</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Extracted text is searchable from the documents list</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>OCR status indicators: Pending, Processing, Completed, Failed</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Confidence scores tracked for quality assurance</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Re-run OCR manually if initial processing fails</span>
                </li>
              </ul>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Pro Tip:</strong> For best OCR results, ensure documents are well-lit, in focus, and text is clearly visible.
                </p>
              </div>
            </DetailSection>

            <DetailSection
              title="Document Metadata Extraction"
              icon={<DocumentTextIcon className="w-6 h-6 text-blue-600" />}
              expanded={expandedSection === 'metadata'}
              onToggle={() => toggleSection('metadata')}
            >
              <p className="text-muted-foreground mb-4">
                Smart extraction of structured data from medical documents.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Insurance Cards:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Provider name</li>
                    <li>• Member name and ID</li>
                    <li>• Group number</li>
                    <li>• RX BIN, PCN, Group</li>
                    <li>• Policy number</li>
                    <li>• Effective/expiration dates</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">General Documents:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Issue dates</li>
                    <li>• Patient name</li>
                    <li>• Date of birth</li>
                    <li>• Provider information</li>
                    <li>• License numbers</li>
                    <li>• Addresses</li>
                  </ul>
                </div>
              </div>
            </DetailSection>

            <DetailSection
              title="Viewing & Downloading"
              icon={<EyeIcon className="w-6 h-6 text-blue-600" />}
              expanded={expandedSection === 'viewing'}
              onToggle={() => toggleSection('viewing')}
            >
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Full-screen preview modal for images and PDFs</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Zoom and pan controls for detailed examination</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Download original files with one click</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>View extracted OCR text alongside document</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Grid and list view modes for flexible browsing</span>
                </li>
              </ul>
            </DetailSection>

            <DetailSection
              title="Search & Filtering"
              icon={<FunnelIcon className="w-6 h-6 text-blue-600" />}
              expanded={expandedSection === 'search'}
              onToggle={() => toggleSection('search')}
            >
              <p className="text-muted-foreground mb-4">
                Powerful search and filtering to find documents instantly.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Full-text search:</strong> Search by document name, notes, patient name, or extracted OCR text</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Category filter:</strong> Filter by insurance, lab results, prescriptions, imaging, immunizations, other</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Family member filter:</strong> View documents for specific patients or all members</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Date sorting:</strong> Sort by upload date (newest first by default)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Stats sidebar:</strong> See document counts by category and total storage used</span>
                </li>
              </ul>
            </DetailSection>

            <DetailSection
              title="Family Collaboration & Notifications"
              icon={<BellAlertIcon className="w-6 h-6 text-blue-600" />}
              expanded={expandedSection === 'collaboration'}
              onToggle={() => toggleSection('collaboration')}
            >
              <p className="text-muted-foreground mb-4">
                Automatic notifications keep family members informed of document uploads.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Real-time notifications sent to family members when documents are uploaded</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Notifications include document name, category, uploader name, and patient name</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Role-based access control: Admins and Members can upload; Viewers can only view</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Upload history tracking with user attribution (who uploaded what)</span>
                </li>
              </ul>
            </DetailSection>

            <DetailSection
              title="Security & Privacy"
              icon={<LockClosedIcon className="w-6 h-6 text-blue-600" />}
              expanded={expandedSection === 'security'}
              onToggle={() => toggleSection('security')}
            >
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>HIPAA Compliance:</strong> All documents encrypted at rest (AES-256) and in transit (TLS 1.3)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Firebase Storage:</strong> Documents stored in secure, geo-redundant cloud storage</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Access Control:</strong> Only authorized family members can view documents they have permission for</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Audit Logs:</strong> All uploads, views, downloads, and deletions are logged with user attribution</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Deletion Controls:</strong> Only Admins and Account Owners can delete documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>7-year retention:</strong> Medical documents retained per HIPAA compliance requirements</span>
                </li>
              </ul>
            </DetailSection>
          </div>
        </section>

        {/* Technical Specifications */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Technical Specifications</h2>
          <div className="bg-card rounded-xl border-2 border-border p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4">Supported Formats</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>Images:</strong> JPG, JPEG, PNG, HEIC</li>
                  <li>• <strong>Documents:</strong> PDF</li>
                  <li>• <strong>Max file size:</strong> 10 MB per file</li>
                  <li>• <strong>Max images per document:</strong> Unlimited</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4">Storage & Performance</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>Storage backend:</strong> Firebase Cloud Storage</li>
                  <li>• <strong>OCR engine:</strong> Google Gemini Vision API</li>
                  <li>• <strong>OCR processing time:</strong> 3-10 seconds per image</li>
                  <li>• <strong>Real-time sync:</strong> Instant across all devices</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4">Access Control</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>Account Owner:</strong> Full access (upload, view, delete)</li>
                  <li>• <strong>Co-Admin:</strong> Full access (upload, view, delete)</li>
                  <li>• <strong>Caregiver:</strong> Upload and view permissions</li>
                  <li>• <strong>Viewer:</strong> View-only access</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4">API Endpoints</h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li>• <code>GET /api/patients/[id]/documents</code></li>
                  <li>• <code>POST /api/patients/[id]/documents</code></li>
                  <li>• <code>DELETE /api/patients/[id]/documents/[docId]</code></li>
                  <li>• <code>POST /api/patients/[id]/documents/[docId]/ocr</code></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Common Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <UseCaseCard
              title="Insurance Card Storage"
              description="Upload front and back of all family members' insurance cards for quick access during appointments."
              steps={[
                'Click Upload Document',
                'Select "Insurance Card" category',
                'Upload front and back images',
                'Add patient name and notes',
                'Access instantly when needed'
              ]}
            />
            <UseCaseCard
              title="Lab Results Tracking"
              description="Keep all lab results organized and searchable by date, patient, and test type."
              steps={[
                'Upload lab result PDFs or photos',
                'Select "Lab Results" category',
                'OCR extracts test values automatically',
                'Search by test name or patient',
                'Compare results over time'
              ]}
            />
            <UseCaseCard
              title="Prescription Management"
              description="Store medication labels and prescription bottles for reference and refill tracking."
              steps={[
                'Photograph prescription bottles',
                'Select "Prescriptions" category',
                'OCR extracts medication details',
                'Link to medication tracking',
                'Reference for refills'
              ]}
            />
            <UseCaseCard
              title="Immunization Records"
              description="Maintain vaccination history for school, travel, and healthcare provider requirements."
              steps={[
                'Upload vaccination cards',
                'Select "Immunizations" category',
                'Organize by patient',
                'Download for school/travel',
                'Track upcoming boosters'
              ]}
            />
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <FAQItem
              question="How secure are my medical documents?"
              answer="All documents are encrypted with AES-256 at rest and TLS 1.3 in transit. We are HIPAA, SOC 2 Type II, and ISO 27001 certified. Documents are stored in Firebase Cloud Storage with geo-redundant backups."
            />
            <FAQItem
              question="Can I upload multiple pages for a single document?"
              answer="Yes! You can upload multiple images or PDFs for a single document. Each image is processed separately for OCR, and you can label them (front, back, etc.) for easy organization."
            />
            <FAQItem
              question="What happens if OCR fails?"
              answer="If OCR processing fails, you can manually re-run it from the document preview modal. You can also add manual notes to make the document searchable."
            />
            <FAQItem
              question="Can family members see all documents?"
              answer="Family members can only see documents for patients they have access to, based on their role and permissions. Account Owners and Co-Admins have access to all documents."
            />
            <FAQItem
              question="How long are documents retained?"
              answer="Medical documents are retained for 7 years per HIPAA requirements. You can delete documents at any time if you're an Admin or Account Owner."
            />
            <FAQItem
              question="Can I download documents for sharing with providers?"
              answer="Yes! Click the download button to save the original file to your device. You can then email it, print it, or upload it to patient portals."
            />
            <FAQItem
              question="What's the maximum file size I can upload?"
              answer="Each file can be up to 10 MB. This is sufficient for high-quality scans and photos. For larger files, consider compressing or splitting into multiple uploads."
            />
            <FAQItem
              question="Can I edit documents after uploading?"
              answer="You can edit the document name, category, notes, and tags, but you cannot edit the file itself. If you need to update the file, delete the old one and upload a new version."
            />
          </div>
        </section>

        {/* Getting Started CTA */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Organize Your Medical Documents?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Start uploading and managing your family's medical documents securely in one centralized location.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/family-admin/documents"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
            >
              Upload Your First Document
            </Link>
            <Link
              href="/docs"
              className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors font-semibold"
            >
              View Documentation
            </Link>
          </div>
        </section>
      </main>

      {/* Footer Links */}
      <div className="bg-secondary border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/support" className="hover:text-foreground transition-colors">
              Help Center
            </Link>
            <Link href="/security" className="hover:text-foreground transition-colors">
              Security
            </Link>
            <Link href="/hipaa" className="hover:text-foreground transition-colors">
              HIPAA Compliance
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Component: Feature Card
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-blue-300 hover:shadow-lg transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

// Component: Category Card
function CategoryCard({
  icon,
  title,
  description,
  examples
}: {
  icon: string
  title: string
  description: string
  examples: string[]
}) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-blue-300 transition-all">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <ul className="space-y-1 text-xs text-muted-foreground">
        {examples.map((example, idx) => (
          <li key={idx}>• {example}</li>
        ))}
      </ul>
    </div>
  )
}

// Component: Step Card
function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

// Component: Detail Section
function DetailSection({
  title,
  icon,
  expanded,
  onToggle,
  children
}: {
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-card rounded-xl border-2 border-border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-secondary transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        {expanded ? (
          <ChevronUpIcon className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="px-6 py-4 border-t border-border">
          {children}
        </div>
      )}
    </div>
  )
}

// Component: Use Case Card
function UseCaseCard({
  title,
  description,
  steps
}: {
  title: string
  description: string
  steps: string[]
}) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6">
      <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      <ol className="space-y-2">
        {steps.map((step, idx) => (
          <li key={idx} className="flex gap-3 text-sm text-muted-foreground">
            <span className="font-semibold text-blue-600">{idx + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// Component: FAQ Item
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-card rounded-xl border-2 border-border overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-secondary transition-colors"
      >
        <h3 className="font-semibold text-foreground pr-4">{question}</h3>
        {isOpen ? (
          <ChevronUpIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 py-4 border-t border-border">
          <p className="text-muted-foreground">{answer}</p>
        </div>
      )}
    </div>
  )
}
