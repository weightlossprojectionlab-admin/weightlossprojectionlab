/**
 * Support Portal Types
 * FAQ and knowledge base system for customers and shoppers
 */

// FAQ System
export type FAQCategory = 'customer' | 'shopper' | 'both'

export type FAQSection =
  // Customer sections
  | 'getting-started'
  | 'ordering'
  | 'during-shopping'
  | 'delivery'
  | 'billing'
  | 'fraud-prevention'
  | 'after-delivery'
  // Shopper sections
  | 'shopper-getting-started'
  | 'shopping-orders'
  | 'shopper-delivery'
  | 'payments'
  | 'issues-escalation'

export interface FAQItem {
  id: string
  category: FAQCategory
  section: FAQSection
  question: string
  answer: string // Markdown supported
  tags: string[]
  helpfulCount: number
  notHelpfulCount: number
  relatedArticles: string[] // Array of FAQ IDs
  lastUpdated: Date
  priority: number // For ordering (higher = more important)
  searchKeywords?: string[] // Additional keywords for search
}

export interface FAQSearchResult {
  item: FAQItem
  score: number // Relevance score (0-1)
  matchedKeywords: string[] // Keywords that matched
  highlightedQuestion?: string // Question with matched terms highlighted
  highlightedAnswer?: string // Answer excerpt with matched terms highlighted
}

export interface FAQFeedback {
  id: string
  faqId: string
  userId?: string // Optional - can be anonymous
  helpful: boolean
  comment?: string
  createdAt: Date
}

// Support Ticket System
export type CustomerTicketType =
  | 'missing_item'
  | 'damaged_item'
  | 'wrong_item'
  | 'late_delivery'
  | 'shopper_issue'
  | 'billing_question'
  | 'refund_request'
  | 'general_inquiry'

export type ShopperTicketType =
  | 'payment_issue'
  | 'card_declined'
  | 'customer_not_responding'
  | 'unsafe_delivery_location'
  | 'order_question'
  | 'app_technical_issue'
  | 'false_fraud_claim'

export type TicketPriority = 'critical' | 'high' | 'medium' | 'low'
export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'

export interface SupportTicket {
  id: string
  userId: string
  userType: 'customer' | 'shopper'
  type: CustomerTicketType | ShopperTicketType
  priority: TicketPriority
  status: TicketStatus
  subject: string
  description: string
  orderId?: string // Related order if applicable
  attachments?: string[] // URLs to uploaded photos/documents
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  assignedTo?: string // Admin user ID
  internalNotes?: string
  customerResponse?: string
  resolution?: string
}

// Analytics
export interface FAQAnalytics {
  faqId: string
  views: number
  helpfulVotes: number
  notHelpfulVotes: number
  helpfulPercentage: number
  searchAppearances: number
  clickThroughRate: number
  lastViewed: Date
}

export interface SupportAnalytics {
  totalTickets: number
  openTickets: number
  averageResponseTime: number // in minutes
  averageResolutionTime: number // in minutes
  ticketsByType: Record<string, number>
  ticketsByPriority: Record<TicketPriority, number>
  customerSatisfaction: number // 0-100
  topIssues: Array<{ type: string; count: number }>
}
