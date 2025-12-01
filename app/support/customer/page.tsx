'use client'

import { useState } from 'react'
import Link from 'next/link'
import FAQSearch from '@/components/support/FAQSearch'
import {
  getFAQsGroupedBySection,
  getPopularFAQs,
  getCustomerSections,
  getSectionDisplayName,
  getRelatedFAQs
} from '@/lib/faq-operations'
import { FAQItem } from '@/types/support'

export default function CustomerSupportPage() {
  const [selectedFAQ, setSelectedFAQ] = useState<FAQItem | null>(null)
  const [showAllFAQs, setShowAllFAQs] = useState(false)

  const popularFAQs = getPopularFAQs('customer', 5)
  const allFAQsGrouped = getFAQsGroupedBySection('customer')
  const customerSections = getCustomerSections()

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-3">How can we help you?</h1>
            <p className="text-lg text-white/90">
              Search our knowledge base or browse categories below
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="bg-card rounded-lg shadow-lg p-6 -mt-16 mb-8">
          <FAQSearch
            category="customer"
            availableSections={customerSections}
            onSelectFAQ={setSelectedFAQ}
            placeholder="Search for help (e.g., 'how to place order', 'refund', 'delivery PIN')"
          />
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/orders"
            className="bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors"
          >
            <div className="text-3xl mb-2">📦</div>
            <h3 className="font-semibold text-foreground mb-1">Track Order</h3>
            <p className="text-sm text-muted-foreground">
              View your active and past orders
            </p>
          </Link>

          <Link
            href="/support/contact"
            className="bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors"
          >
            <div className="text-3xl mb-2">💬</div>
            <h3 className="font-semibold text-foreground mb-1">Contact Support</h3>
            <p className="text-sm text-muted-foreground">
              Get help from our support team
            </p>
          </Link>

          <Link
            href="/account/settings"
            className="bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors"
          >
            <div className="text-3xl mb-2">⚙️</div>
            <h3 className="font-semibold text-foreground mb-1">Account Settings</h3>
            <p className="text-sm text-muted-foreground">
              Manage your account and preferences
            </p>
          </Link>
        </div>

        {/* Popular FAQs */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Popular Questions</h2>
          <div className="space-y-3">
            {popularFAQs.map(faq => (
              <PopularFAQCard key={faq.id} faq={faq} onClick={() => setSelectedFAQ(faq)} />
            ))}
          </div>
        </div>

        {/* Browse by Category */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Browse by Category</h2>
            <button
              onClick={() => setShowAllFAQs(!showAllFAQs)}
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              {showAllFAQs ? 'Show Less' : 'Show All FAQs'}
            </button>
          </div>

          {showAllFAQs ? (
            <div className="space-y-6">
              {customerSections.map(section => (
                <CategorySection
                  key={section}
                  section={section}
                  faqs={allFAQsGrouped[section] || []}
                  onSelectFAQ={setSelectedFAQ}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customerSections.map(section => (
                <CategoryCard
                  key={section}
                  section={section}
                  count={allFAQsGrouped[section]?.length || 0}
                  onClick={() => setShowAllFAQs(true)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Still Need Help */}
        <div className="bg-gradient-to-r from-primary/10 to-primary-dark/10 border border-primary/20 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Still need help?</h2>
          <p className="text-muted-foreground mb-4">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/support/contact"
              className="btn btn-primary"
            >
              Contact Support
            </Link>
            <Link
              href="/support/live-chat"
              className="btn btn-secondary"
            >
              Live Chat
            </Link>
          </div>
        </div>

        {/* Selected FAQ Modal/Detail View */}
        {selectedFAQ && (
          <FAQDetailModal faq={selectedFAQ} onClose={() => setSelectedFAQ(null)} />
        )}
      </div>
    </div>
  )
}

interface PopularFAQCardProps {
  faq: FAQItem
  onClick: () => void
}

function PopularFAQCard({ faq, onClick }: PopularFAQCardProps) {
  const helpfulPercentage = Math.round(
    (faq.helpfulCount / (faq.helpfulCount + faq.notHelpfulCount || 1)) * 100
  )

  return (
    <button
      onClick={onClick}
      className="w-full bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">{faq.question}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{getSectionDisplayName(faq.section)}</span>
            <span>•</span>
            <span>{helpfulPercentage}% helpful</span>
          </div>
        </div>
        <svg
          className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}

interface CategoryCardProps {
  section: string
  count: number
  onClick: () => void
}

function CategoryCard({ section, count, onClick }: CategoryCardProps) {
  const icons: Record<string, string> = {
    'getting-started': '🚀',
    'ordering': '🛒',
    'during-shopping': '🛍️',
    'delivery': '🚚',
    'billing': '💳',
    'fraud-prevention': '🔒',
    'after-delivery': '📋'
  }

  return (
    <button
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors text-left"
    >
      <div className="text-3xl mb-2">{icons[section] || '📄'}</div>
      <h3 className="font-semibold text-foreground mb-1">
        {getSectionDisplayName(section)}
      </h3>
      <p className="text-sm text-muted-foreground">
        {count} article{count !== 1 ? 's' : ''}
      </p>
    </button>
  )
}

interface CategorySectionProps {
  section: string
  faqs: FAQItem[]
  onSelectFAQ: (faq: FAQItem) => void
}

function CategorySection({ section, faqs, onSelectFAQ }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(false)
  const displayFAQs = expanded ? faqs : faqs.slice(0, 5)

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-xl font-bold text-foreground mb-4">
        {getSectionDisplayName(section)}
      </h3>
      <div className="space-y-2">
        {displayFAQs.map(faq => (
          <button
            key={faq.id}
            onClick={() => onSelectFAQ(faq)}
            className="w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors"
          >
            <span className="text-foreground hover:text-primary">{faq.question}</span>
          </button>
        ))}
      </div>
      {faqs.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-sm text-primary hover:text-primary-dark font-medium"
        >
          {expanded ? 'Show Less' : `Show ${faqs.length - 5} More`}
        </button>
      )}
    </div>
  )
}

interface FAQDetailModalProps {
  faq: FAQItem
  onClose: () => void
}

function FAQDetailModal({ faq, onClose }: FAQDetailModalProps) {
  const relatedFAQs = getRelatedFAQs(faq.id)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-lg shadow-xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex-1 pr-4">
            <div className="text-sm text-muted-foreground mb-2">
              {getSectionDisplayName(faq.section)}
            </div>
            <h2 className="text-2xl font-bold text-foreground">{faq.question}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap mb-6">
            {faq.answer}
          </div>

          {/* Tags */}
          {faq.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {faq.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Related Articles */}
          {relatedFAQs.length > 0 && (
            <div className="border-t border-border pt-6">
              <h3 className="font-semibold text-foreground mb-3">Related Articles</h3>
              <div className="space-y-2">
                {relatedFAQs.map(relatedFAQ => (
                  <button
                    key={relatedFAQ.id}
                    onClick={() => {
                      onClose()
                      setTimeout(() => {
                        const modal = document.querySelector(`[data-faq-id="${relatedFAQ.id}"]`)
                        modal?.scrollIntoView({ behavior: 'smooth' })
                      }, 100)
                    }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors text-sm text-primary hover:text-primary-dark"
                  >
                    {relatedFAQ.question} →
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <button onClick={onClose} className="btn btn-primary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
