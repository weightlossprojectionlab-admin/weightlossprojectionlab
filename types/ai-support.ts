/**
 * TypeScript types for AI-powered support system
 *
 * The platform uses Flagstaff AI for 100% self-service support.
 * No live human agents - AI answers all questions using knowledge base.
 * Human escalation only for critical bugs as last resort.
 */

import { Timestamp } from 'firebase/firestore'

/**
 * AI conversation document stored in Firestore
 * Each conversation is isolated (no race conditions)
 */
export interface AIConversation {
  id: string
  userId: string | null // null for anonymous users
  messages: AIMessage[]
  startedAt: Timestamp
  endedAt: Timestamp | null
  status: 'active' | 'completed'
  resolution: 'successful' | 'unsuccessful' | null
  feedbackRating: 1 | 2 | 3 | 4 | 5 | null
  feedbackText: string | null
  topicTags: string[] // e.g., ['pricing', 'medical-logs', 'household-care']
  documentationLinksProvided: string[] // All doc links AI shared
  metadata: {
    userAgent: string
    initialUrl: string
  }
}

/**
 * Individual message in conversation
 */
export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Timestamp
  documentLinks?: string[] // Doc links provided in this specific message
}

/**
 * Pre-aggregated daily analytics (updated by Cloud Function)
 * Optimized for real-time admin dashboard queries
 */
export interface ConversationAnalytics {
  date: string // YYYY-MM-DD
  metrics: {
    totalConversations: number
    successfulResolutions: number
    resolutionRate: number // successful / total
    avgRating: number
    avgDuration: number // seconds
    bugEscalations: number
  }
  topTopics: TopicMetric[]
  documentationGaps: DocumentationGap[]
}

/**
 * Metrics for each support topic
 */
export interface TopicMetric {
  topic: string
  count: number // total conversations about this topic
  successRate: number // successful / count
  avgRating: number
}

/**
 * Documentation gaps identified by low AI resolution rates
 * Admin uses this to prioritize doc improvements
 */
export interface DocumentationGap {
  topic: string
  unsuccessfulCount: number
  topQuestions: string[] // Top 3 unresolved questions
  avgRating: number
}

/**
 * Bug report created when AI escalates critical issues
 * Last resort - only for actual platform bugs
 */
export interface BugReport {
  id: string
  conversationId: string // Link to original AI conversation
  reportedBy: string | null // user UID or null for anonymous
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'new' | 'investigating' | 'resolved'
  createdAt: Timestamp
  resolvedAt?: Timestamp
  metadata: {
    userAgent: string
    url: string
    screenshot?: string
  }
}

/**
 * Response from Flagstaff AI API
 */
export interface FlagstaffResponse {
  content: string // AI's response text
  documentationLinks: string[] // Relevant doc pages
  topicTags: string[] // Auto-detected topics for analytics
  shouldEscalateToBugReport: boolean // AI detected a bug
  suggestedSeverity?: BugReport['severity']
  confidence?: number // 0-1, how confident AI is in answer
}

/**
 * Input for creating new conversation
 */
export interface CreateConversationInput {
  userId: string | null
  initialMessage?: string
}

/**
 * Feedback submitted when user ends conversation
 */
export interface ConversationFeedback {
  rating: 1 | 2 | 3 | 4 | 5
  text?: string
}

/**
 * Input for creating bug report
 */
export interface CreateBugReportInput {
  conversationId: string
  userId: string | null
  description: string
  severity: BugReport['severity']
  screenshot?: string
}
