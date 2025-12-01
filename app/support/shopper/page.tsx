'use client'

import { useState } from 'react'
import Link from 'next/link'
import FAQSearch from '@/components/support/FAQSearch'
import {
  getFAQsGroupedBySection,
  getPopularFAQs,
  getShopperSections,
  getSectionDisplayName,
  getRelatedFAQs
} from '@/lib/faq-operations'
import { FAQItem } from '@/types/support'

export default function ShopperSupportPage() {
  const [selectedFAQ, setSelectedFAQ] = useState<FAQItem | null>(null)
  const [showAllFAQs, setShowAllFAQs] = useState(false)

  const popularFAQs = getPopularFAQs('shopper', 5)
  const allFAQsGrouped = getFAQsGroupedBySection('shopper')
  const shopperSections = getShopperSections()

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="text-4xl mb-3">🛍️</div>
            <h1 className="text-4xl font-bold mb-3">Shopper Support</h1>
            <p className="text-lg text-white/90">
              Get answers to your questions about shopping, delivery, and earnings
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="bg-card rounded-lg shadow-lg p-6 -mt-16 mb-8">
          <FAQSearch
            category="shopper"
            availableSections={shopperSections}
            onSelectFAQ={setSelectedFAQ}
            placeholder="Search for help (e.g., 'stripe card', 'delivery PIN', 'earnings')"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link
            href="/shopper/earnings"
            className="bg-card border border-border rounded-lg p-4 hover:border-green-500 transition-colors"
          >
            <div className="text-3xl mb-2">💰</div>
            <h3 className="font-semibold text-foreground mb-1">Earnings</h3>
            <p className="text-sm text-muted-foreground">View your earnings</p>
          </Link>

          <Link
            href="/shopper/orders"
            className="bg-card border border-border rounded-lg p-4 hover:border-green-500 transition-colors"
          >
            <div className="text-3xl mb-2">📦</div>
            <h3 className="font-semibold text-foreground mb-1">Active Orders</h3>
            <p className="text-sm text-muted-foreground">See your orders</p>
          </Link>

          <Link
            href="/support/contact?type=shopper"
            className="bg-card border border-border rounded-lg p-4 hover:border-green-500 transition-colors"
          >
            <div className="text-3xl mb-2">💬</div>
            <h3 className="font-semibold text-foreground mb-1">Get Help</h3>
            <p className="text-sm text-muted-foreground">Contact support</p>
          </Link>

          <Link
            href="/shopper/training"
            className="bg-card border border-border rounded-lg p-4 hover:border-green-500 transition-colors"
          >
            <div className="text-3xl mb-2">📚</div>
            <h3 className="font-semibold text-foreground mb-1">Training</h3>
            <p className="text-sm text-muted-foreground">Learn best practices</p>
          </Link>
        </div>

        {/* Emergency Support Banner */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🚨</div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-600 dark:text-red-400 mb-1">
                Need Immediate Help?
              </h3>
              <p className="text-sm text-foreground mb-3">
                For urgent issues during active deliveries (unsafe location, card declined, emergency):
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href="tel:555-123-4567"
                  className="btn bg-red-600 hover:bg-red-700 text-white text-sm"
                >
                  Call 24/7 Support: (555) 123-4567
                </a>
                <Link
                  href="/support/live-chat?priority=urgent"
                  className="btn btn-secondary text-sm"
                >
                  Emergency Chat
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Popular FAQs */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Most Helpful Articles</h2>
          <div className="space-y-3">
            {popularFAQs.map(faq => (
              <PopularFAQCard key={faq.id} faq={faq} onClick={() => setSelectedFAQ(faq)} />
            ))}
          </div>
        </div>

        {/* Quick Tips for Shoppers */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-foreground mb-3">💡 Pro Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span className="text-foreground">
                Always take clear delivery photos if customer isn't home
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span className="text-foreground">
                Check card balance before checkout to avoid declines
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span className="text-foreground">
                Respond to customer messages within 3 minutes
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span className="text-foreground">
                Select quality produce - inspect all sides before bagging
              </span>
            </div>
          </div>
        </div>

        {/* Browse by Category */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Browse Topics</h2>
            <button
              onClick={() => setShowAllFAQs(!showAllFAQs)}
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              {showAllFAQs ? 'Show Less' : 'Show All Articles'}
            </button>
          </div>

          {showAllFAQs ? (
            <div className="space-y-6">
              {shopperSections.map(section => (
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
              {shopperSections.map(section => (
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

        {/* Shopper Resources */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-foreground mb-3">📊 Performance Metrics</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Track your ratings, speed, and customer satisfaction
            </p>
            <Link href="/shopper/metrics" className="text-sm text-green-600 hover:text-green-700 font-medium">
              View Dashboard →
            </Link>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-foreground mb-3">🎓 Training Center</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Watch videos and complete courses to improve your skills
            </p>
            <Link href="/shopper/training" className="text-sm text-green-600 hover:text-green-700 font-medium">
              Start Learning →
            </Link>
          </div>
        </div>

        {/* Still Need Help */}
        <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Still need help?</h2>
          <p className="text-muted-foreground mb-4">
            Our shopper support team is available 24/7 to assist you
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="tel:555-123-4567"
              className="btn bg-green-600 hover:bg-green-700 text-white"
            >
              Call (555) 123-4567
            </a>
            <Link
              href="/support/contact?type=shopper"
              className="btn btn-secondary"
            >
              Submit Ticket
            </Link>
            <Link
              href="/support/live-chat"
              className="btn btn-secondary"
            >
              Live Chat
            </Link>
          </div>
        </div>

        {/* Selected FAQ Modal */}
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
      className="w-full bg-card border border-border rounded-lg p-4 hover:border-green-500 transition-colors text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">{faq.question}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{getSectionDisplayName(faq.section)}</span>
            <span>•</span>
            <span>{helpfulPercentage}% helpful</span>
            <span>•</span>
            <span>{faq.helpfulCount} shoppers found this useful</span>
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
    'shopper-getting-started': '🚀',
    'shopping-orders': '🛒',
    'shopper-delivery': '🚚',
    'payments': '💰',
    'issues-escalation': '🆘'
  }

  return (
    <button
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-4 hover:border-green-500 transition-colors text-left"
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
            <span className="text-foreground hover:text-green-600">{faq.question}</span>
          </button>
        ))}
      </div>
      {faqs.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium"
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
                    onClick={() => onClose()}
                    className="w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors text-sm text-green-600 hover:text-green-700"
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
          <button onClick={onClose} className="btn bg-green-600 hover:bg-green-700 text-white w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
