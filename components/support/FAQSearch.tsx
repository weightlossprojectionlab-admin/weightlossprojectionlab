'use client'

import { useState, useEffect, useRef } from 'react'
import { FAQItem, FAQSearchResult, FAQCategory, FAQSection } from '@/types/support'
import { searchFAQs, recordFAQFeedback, getSectionDisplayName } from '@/lib/faq-operations'
import { useAuth } from '@/hooks/useAuth'

interface FAQSearchProps {
  category: FAQCategory
  availableSections?: FAQSection[]
  onSelectFAQ?: (faq: FAQItem) => void
  placeholder?: string
}

export default function FAQSearch({
  category,
  availableSections,
  onSelectFAQ,
  placeholder = 'Search for help...'
}: FAQSearchProps) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FAQSearchResult[]>([])
  const [selectedSection, setSelectedSection] = useState<FAQSection | undefined>()
  const [isSearching, setIsSearching] = useState(false)
  const [expandedFAQs, setExpandedFAQs] = useState<Set<string>>(new Set())
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set())
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined)

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    if (query.trim().length < 2) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    debounceTimer.current = setTimeout(() => {
      const searchResults = searchFAQs(query, category, selectedSection)
      setResults(searchResults)
      setIsSearching(false)
    }, 300)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [query, category, selectedSection])

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(faqId)) {
        newSet.delete(faqId)
      } else {
        newSet.add(faqId)
        // Call onSelectFAQ when expanding
        if (onSelectFAQ) {
          const faq = results.find(r => r.item.id === faqId)?.item
          if (faq) onSelectFAQ(faq)
        }
      }
      return newSet
    })
  }

  const handleFeedback = async (faqId: string, helpful: boolean) => {
    if (feedbackGiven.has(faqId)) return

    const success = await recordFAQFeedback(faqId, helpful, user?.uid)

    if (success) {
      setFeedbackGiven(prev => new Set([...prev, faqId]))

      // Update the count optimistically in the UI
      setResults(prev => prev.map(result => {
        if (result.item.id === faqId) {
          return {
            ...result,
            item: {
              ...result.item,
              helpfulCount: helpful ? result.item.helpfulCount + 1 : result.item.helpfulCount,
              notHelpfulCount: !helpful ? result.item.notHelpfulCount + 1 : result.item.notHelpfulCount
            }
          }
        }
        return result
      }))
    }
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setExpandedFAQs(new Set())
    searchInputRef.current?.focus()
  }

  return (
    <div className="w-full">
      {/* Search Input */}
      <div className="relative mb-6">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 pl-12 pr-12 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Section Filter */}
        {availableSections && availableSections.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSection(undefined)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                !selectedSection
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted-dark'
              }`}
            >
              All Sections
            </button>
            {availableSections.map(section => (
              <button
                key={section}
                onClick={() => setSelectedSection(section)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  selectedSection === section
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted-dark'
                }`}
              >
                {getSectionDisplayName(section)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Results */}
      {isSearching && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-muted border-t-primary"></div>
          <p className="mt-2 text-sm text-muted-foreground">Searching...</p>
        </div>
      )}

      {!isSearching && query.trim().length >= 2 && results.length === 0 && (
        <div className="text-center py-8 bg-muted rounded-lg">
          <div className="text-4xl mb-2">🔍</div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No results found</h3>
          <p className="text-sm text-muted-foreground">
            Try different keywords or browse categories below
          </p>
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground mb-3">
            Found {results.length} result{results.length !== 1 ? 's' : ''}
          </div>

          {results.map(result => (
            <FAQResultCard
              key={result.item.id}
              result={result}
              isExpanded={expandedFAQs.has(result.item.id)}
              onToggle={() => toggleFAQ(result.item.id)}
              onFeedback={(helpful) => handleFeedback(result.item.id, helpful)}
              feedbackGiven={feedbackGiven.has(result.item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface FAQResultCardProps {
  result: FAQSearchResult
  isExpanded: boolean
  onToggle: () => void
  onFeedback: (helpful: boolean) => void
  feedbackGiven: boolean
}

function FAQResultCard({
  result,
  isExpanded,
  onToggle,
  onFeedback,
  feedbackGiven
}: FAQResultCardProps) {
  const { item, highlightedQuestion, highlightedAnswer } = result
  const helpfulPercentage = Math.round(
    (item.helpfulCount / (item.helpfulCount + item.notHelpfulCount || 1)) * 100
  )

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary transition-colors">
      {/* Question Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-4 flex items-start justify-between text-left hover:bg-muted transition-colors"
      >
        <div className="flex-1 pr-4">
          <h3
            className="text-base font-semibold text-foreground mb-1"
            dangerouslySetInnerHTML={{
              __html: highlightedQuestion || item.question
            }}
          />
          {!isExpanded && highlightedAnswer && (
            <p
              className="text-sm text-muted-foreground line-clamp-2"
              dangerouslySetInnerHTML={{ __html: highlightedAnswer }}
            />
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-muted-foreground">
              {getSectionDisplayName(item.section)}
            </span>
            <span className="text-xs text-muted-foreground">
              {helpfulPercentage}% found helpful
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <svg
            className={`w-5 h-5 text-muted-foreground transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Answer Body */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border">
          <div className="prose prose-sm max-w-none mt-4 text-foreground">
            <div
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(item.answer) }}
            />
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {item.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Feedback Buttons */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Was this helpful?</span>
              <div className="flex gap-2">
                <button
                  onClick={() => onFeedback(true)}
                  disabled={feedbackGiven}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    feedbackGiven
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                  </svg>
                  Yes {feedbackGiven && `(${item.helpfulCount})`}
                </button>
                <button
                  onClick={() => onFeedback(false)}
                  disabled={feedbackGiven}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    feedbackGiven
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                  </svg>
                  No {feedbackGiven && `(${item.notHelpfulCount})`}
                </button>
              </div>
            </div>
            {feedbackGiven && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                Thank you for your feedback!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Simple markdown formatting for FAQ answers
 */
function formatMarkdown(text: string): string {
  let formatted = text

  // Headers
  formatted = formatted.replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
  formatted = formatted.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
  formatted = formatted.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>')

  // Bold
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Lists
  formatted = formatted.replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
  formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4">$2</li>')

  // Checkmarks and X marks
  formatted = formatted.replace(/✅/g, '<span class="text-green-600 dark:text-green-400">✅</span>')
  formatted = formatted.replace(/❌/g, '<span class="text-red-600 dark:text-red-400">❌</span>')

  // Emojis in general (preserve them)
  // Already handled by the raw HTML rendering

  return formatted
}
