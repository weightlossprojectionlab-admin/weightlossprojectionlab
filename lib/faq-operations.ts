/**
 * FAQ Operations
 * Search, filtering, and feedback management for FAQ system
 */

import { FAQItem, FAQSearchResult, FAQCategory, FAQSection } from '@/types/support'
import { faqs, getRelatedFAQs as getRelatedFAQsData } from '@/data/faqs'

/**
 * Search FAQs using full-text search with relevance scoring
 */
export function searchFAQs(
  query: string,
  category?: FAQCategory,
  section?: FAQSection
): FAQSearchResult[] {
  if (!query || query.trim().length < 2) {
    return []
  }

  const searchTerms = query.toLowerCase().trim().split(/\s+/)
  let results: FAQSearchResult[] = []

  // Filter by category and section first
  let filteredFAQs = faqs
  if (category && category !== 'both') {
    filteredFAQs = filteredFAQs.filter(faq =>
      faq.category === category || faq.category === 'both'
    )
  }
  if (section) {
    filteredFAQs = filteredFAQs.filter(faq => faq.section === section)
  }

  // Score each FAQ based on relevance
  for (const faq of filteredFAQs) {
    const searchableText = [
      faq.question,
      faq.answer,
      ...faq.tags,
      ...(faq.searchKeywords || [])
    ].join(' ').toLowerCase()

    let score = 0
    const matchedKeywords: string[] = []

    // Score based on matches
    for (const term of searchTerms) {
      // Exact match in question (highest priority)
      if (faq.question.toLowerCase().includes(term)) {
        score += 10
        matchedKeywords.push(term)
      }

      // Match in tags (high priority)
      if (faq.tags.some(tag => tag.toLowerCase().includes(term))) {
        score += 5
        matchedKeywords.push(term)
      }

      // Match in answer (medium priority)
      if (faq.answer.toLowerCase().includes(term)) {
        score += 3
        matchedKeywords.push(term)
      }

      // Match in search keywords (medium priority)
      if (faq.searchKeywords?.some(keyword => keyword.toLowerCase().includes(term))) {
        score += 4
        matchedKeywords.push(term)
      }

      // Partial match (low priority)
      if (searchableText.includes(term)) {
        score += 1
      }
    }

    // Boost score based on priority and helpful votes
    if (score > 0) {
      score += faq.priority * 0.1
      const helpfulRatio = faq.helpfulCount / (faq.helpfulCount + faq.notHelpfulCount || 1)
      score += helpfulRatio * 2
    }

    if (score > 0) {
      results.push({
        item: faq,
        score,
        matchedKeywords: [...new Set(matchedKeywords)],
        highlightedQuestion: highlightMatches(faq.question, searchTerms),
        highlightedAnswer: getAnswerExcerpt(faq.answer, searchTerms)
      })
    }
  }

  // Sort by score (descending)
  results.sort((a, b) => b.score - a.score)

  // Return top 10 results
  return results.slice(0, 10)
}

/**
 * Get all FAQs in a category
 */
export function getFAQsByCategory(category: FAQCategory): FAQItem[] {
  if (category === 'both') {
    return faqs
  }
  return faqs.filter(faq => faq.category === category || faq.category === 'both')
}

/**
 * Get all FAQs in a section
 */
export function getFAQsBySection(section: FAQSection): FAQItem[] {
  return faqs.filter(faq => faq.section === section)
}

/**
 * Get related FAQs for a given FAQ ID
 */
export function getRelatedFAQs(faqId: string): FAQItem[] {
  return getRelatedFAQsData(faqId)
}

/**
 * Get FAQ by ID
 */
export function getFAQById(faqId: string): FAQItem | undefined {
  return faqs.find(faq => faq.id === faqId)
}

/**
 * Get popular FAQs (sorted by helpful votes)
 */
export function getPopularFAQs(category?: FAQCategory, limit: number = 10): FAQItem[] {
  let filtered = category ? getFAQsByCategory(category) : faqs

  return filtered
    .sort((a, b) => {
      const aRatio = a.helpfulCount / (a.helpfulCount + a.notHelpfulCount || 1)
      const bRatio = b.helpfulCount / (b.helpfulCount + b.notHelpfulCount || 1)
      return (bRatio * b.helpfulCount) - (aRatio * a.helpfulCount)
    })
    .slice(0, limit)
}

/**
 * Get FAQs grouped by section
 */
export function getFAQsGroupedBySection(category: FAQCategory): Record<string, FAQItem[]> {
  const filtered = getFAQsByCategory(category)
  const grouped: Record<string, FAQItem[]> = {}

  for (const faq of filtered) {
    if (!grouped[faq.section]) {
      grouped[faq.section] = []
    }
    grouped[faq.section].push(faq)
  }

  // Sort within each section by priority
  for (const section in grouped) {
    grouped[section].sort((a, b) => b.priority - a.priority)
  }

  return grouped
}

/**
 * Record feedback for an FAQ (helpful or not helpful)
 * In a real app, this would update the database
 */
export async function recordFAQFeedback(
  faqId: string,
  helpful: boolean,
  userId?: string,
  comment?: string
): Promise<boolean> {
  try {
    // In a real implementation, this would:
    // 1. Save to Firestore
    // 2. Update the FAQ's helpfulCount or notHelpfulCount
    // 3. Track user's feedback to prevent duplicate votes
    // 4. Store optional comment for review

    // For now, just return success
    console.log('FAQ Feedback:', { faqId, helpful, userId, comment })

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300))

    return true
  } catch (error) {
    console.error('Error recording FAQ feedback:', error)
    return false
  }
}

/**
 * Get section display name from section ID
 */
export function getSectionDisplayName(section: FAQSection): string {
  const sectionNames: Record<FAQSection, string> = {
    'getting-started': 'Getting Started',
    'ordering': 'Ordering',
    'during-shopping': 'During Shopping',
    'delivery': 'Delivery',
    'billing': 'Billing & Payments',
    'fraud-prevention': 'Fraud Prevention',
    'after-delivery': 'After Delivery',
    'shopper-getting-started': 'Getting Started',
    'shopping-orders': 'Shopping Orders',
    'shopper-delivery': 'Delivery',
    'payments': 'Payments & Earnings',
    'issues-escalation': 'Issues & Escalation'
  }
  return sectionNames[section] || section
}

/**
 * Get customer FAQ sections
 */
export function getCustomerSections(): FAQSection[] {
  return [
    'getting-started',
    'ordering',
    'during-shopping',
    'delivery',
    'billing',
    'fraud-prevention',
    'after-delivery'
  ]
}

/**
 * Get shopper FAQ sections
 */
export function getShopperSections(): FAQSection[] {
  return [
    'shopper-getting-started',
    'shopping-orders',
    'shopper-delivery',
    'payments',
    'issues-escalation'
  ]
}

// Helper functions

/**
 * Highlight search terms in text
 */
function highlightMatches(text: string, terms: string[]): string {
  let highlighted = text

  for (const term of terms) {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi')
    highlighted = highlighted.replace(regex, '<mark>$1</mark>')
  }

  return highlighted
}

/**
 * Get excerpt from answer with highlighted search terms
 */
function getAnswerExcerpt(answer: string, terms: string[]): string {
  const maxLength = 200
  let bestExcerpt = answer.substring(0, maxLength)

  // Try to find excerpt containing search terms
  for (const term of terms) {
    const index = answer.toLowerCase().indexOf(term.toLowerCase())
    if (index !== -1) {
      const start = Math.max(0, index - 100)
      const end = Math.min(answer.length, index + 100)
      let excerpt = answer.substring(start, end)

      if (start > 0) excerpt = '...' + excerpt
      if (end < answer.length) excerpt = excerpt + '...'

      bestExcerpt = highlightMatches(excerpt, terms)
      break
    }
  }

  // Clean up markdown formatting in excerpt
  bestExcerpt = bestExcerpt
    .replace(/#{1,6}\s/g, '') // Remove markdown headers
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '') // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text

  return bestExcerpt
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
