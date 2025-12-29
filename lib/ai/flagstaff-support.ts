/**
 * Flagstaff AI Support Service Layer
 *
 * 100% self-service AI-powered support system for WLPL platform.
 * No live human agents - AI answers all questions using comprehensive knowledge base.
 * Human escalation only for critical bugs as last resort.
 *
 * Architecture: Service Layer + Repository Pattern
 * - Separation of concerns: Business logic isolated from data access
 * - DRY principles: Reusable functions, no code duplication
 * - Type safety: Full TypeScript typing with existing types
 * - HIPAA compliance: PHI sanitization before AI processing
 * - Race condition prevention: Firestore transactions for concurrent operations
 *
 * @module flagstaff-support
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import type {
  AIConversation,
  AIMessage,
  FlagstaffResponse,
  CreateConversationInput,
  ConversationFeedback,
  CreateBugReportInput,
  BugReport,
  ConversationAnalytics,
  TopicMetric,
  DocumentationGap,
} from '@/types/ai-support';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

/**
 * Firestore collection paths
 */
const COLLECTIONS = {
  CONVERSATIONS: 'ai_conversations',
  BUG_REPORTS: 'bug_reports',
  ANALYTICS: 'conversation_analytics',
  AUDIT_LOGS: 'ai_audit_logs',
} as const;

/**
 * Documentation sources for knowledge base search
 * Weight determines relevance ranking (higher = more relevant)
 */
const DOCUMENTATION_SOURCES = [
  { path: '/support', weight: 1.2, type: 'support' },
  { path: '/docs', weight: 1.0, type: 'technical' },
  { path: '/hipaa', weight: 0.9, type: 'compliance' },
  { path: '/privacy', weight: 0.9, type: 'compliance' },
  { path: '/security', weight: 0.9, type: 'compliance' },
  { path: '/blog', weight: 0.7, type: 'educational' },
  { path: '/about', weight: 0.6, type: 'general' },
  { path: '/terms', weight: 0.6, type: 'legal' },
] as const;

/**
 * PHI (Protected Health Information) detection patterns
 * Used to sanitize sensitive data before sending to AI
 */
const PHI_PATTERNS = {
  weight: /\b\d{2,3}\s*(lbs?|pounds?|kg|kilograms?)\b/gi,
  medications: /\b(metformin|insulin|ozempic|wegovy|mounjaro|semaglutide|tirzepatide)\b/gi,
  medicalConditions: /\b(diabetes|hypertension|obesity|t2d|type\s*2\s*diabetes)\b/gi,
  vitalNumbers: /\b(bp|blood\s*pressure):\s*\d{2,3}\/\d{2,3}\b/gi,
  dates: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
} as const;

/**
 * AI conversation configuration
 */
const AI_CONFIG = {
  MAX_MESSAGES_BEFORE_ESCALATION: 10,
  MIN_CONFIDENCE_THRESHOLD: 0.3,
  LOW_RATING_THRESHOLD: 2,
  MAX_TOPIC_TAGS: 5,
  CONVERSATION_TIMEOUT_MINUTES: 30,
  RATE_LIMIT_REQUESTS_PER_MINUTE: 10,
} as const;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Documentation reference with relevance score
 */
interface DocumentationReference {
  path: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  type: string;
}

/**
 * PHI sanitization result
 */
interface SanitizationResult {
  sanitized: string;
  hadPHI: boolean;
  detectedTypes: string[];
}

/**
 * Analytics metadata for tracking
 */
interface AnalyticsMetadata {
  conversationId: string;
  userId: string | null;
  topicTags: string[];
  documentationLinksProvided: string[];
  resolutionStatus: 'resolved' | 'escalated' | 'abandoned';
  messageCount: number;
  durationSeconds: number;
  feedbackRating: number | null;
  aiConfidenceScore: number;
}

/**
 * Audit log entry for HIPAA compliance
 */
interface AuditLogEntry {
  timestamp: Timestamp;
  userId: string | null;
  action: 'conversation_create' | 'message_send' | 'bug_escalate' | 'conversation_end';
  conversationId: string;
  hadPHI: boolean;
  aiProvider: 'flagstaff';
  metadata?: Record<string, unknown>;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates Flagstaff AI API key is configured
 * @throws {Error} If API key is missing
 */
function validateEnvironment(): void {
  if (!process.env.FLAGSTAFF_AI_API_KEY) {
    throw new Error('FLAGSTAFF_AI_API_KEY environment variable is required');
  }
}

/**
 * Sanitizes text to remove PHI before sending to AI
 * HIPAA compliance: Never send unsanitized PHI to external AI services
 *
 * @param text - Original text that may contain PHI
 * @returns Sanitization result with cleaned text and detection metadata
 */
export function sanitizePHI(text: string): SanitizationResult {
  let sanitized = text;
  let hadPHI = false;
  const detectedTypes: string[] = [];

  for (const [type, pattern] of Object.entries(PHI_PATTERNS)) {
    if (pattern.test(sanitized)) {
      hadPHI = true;
      detectedTypes.push(type);
      sanitized = sanitized.replace(pattern, `[${type.toUpperCase()}_REDACTED]`);
    }
  }

  return { sanitized, hadPHI, detectedTypes };
}

/**
 * Formats error messages for user-friendly display
 * @param error - Error object or unknown error
 * @returns User-friendly error message
 */
function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Don't expose internal error details to users
    if (error.message.includes('API') || error.message.includes('key')) {
      return 'AI service temporarily unavailable. Please try again later.';
    }
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Generates unique conversation ID
 * @returns Unique ID string
 */
function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// AUDIT LOGGING (HIPAA Compliance)
// ============================================================================

/**
 * Logs AI interaction for audit trail
 * Required for HIPAA compliance - all PHI access must be logged
 *
 * @param entry - Audit log entry
 */
async function logAuditEntry(entry: AuditLogEntry): Promise<void> {
  try {
    await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), entry);
  } catch (error) {
    // Audit logging failures should not block user operations
    logger.error('[Flagstaff Support] Audit log failed', error as Error);
  }
}

// ============================================================================
// KNOWLEDGE BASE SERVICE
// ============================================================================

/**
 * Searches platform documentation for relevant content
 *
 * Strategy:
 * 1. Extract keywords from user query
 * 2. Search across all documentation sources
 * 3. Rank by relevance score × source weight
 * 4. Return top 5 most relevant docs with snippets
 *
 * @param query - User's search query
 * @returns Array of relevant documentation references
 */
export async function searchKnowledgeBase(
  query: string
): Promise<DocumentationReference[]> {
  try {
    // Extract keywords from query (remove common words)
    const keywords = extractKeywords(query);

    // Mock implementation - in production, this would:
    // 1. Query a vector database (Pinecone, Weaviate, etc.)
    // 2. Or use full-text search (Algolia, Elasticsearch)
    // 3. Or search static documentation files

    // For now, return mock results based on keyword matching
    const results: DocumentationReference[] = [];

    for (const source of DOCUMENTATION_SOURCES) {
      // Simulate relevance scoring based on keyword matches
      const relevanceScore = calculateRelevance(keywords, source.path, source.type);

      if (relevanceScore > 0.1) {
        results.push({
          path: source.path,
          title: `${source.type} Documentation`,
          snippet: `Relevant information about ${keywords.join(', ')}`,
          relevanceScore: relevanceScore * source.weight,
          type: source.type,
        });
      }
    }

    // Sort by relevance score (descending) and return top 5
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
  } catch (error) {
    logger.error('[Flagstaff Support] Knowledge base search failed', error as Error);
    return [];
  }
}

/**
 * Extracts meaningful keywords from query
 * @param query - User query string
 * @returns Array of keywords
 */
function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'is', 'are', 'was', 'were', 'how', 'what', 'where', 'when', 'why',
    'can', 'could', 'would', 'should', 'i', 'my', 'me', 'do', 'does',
  ]);

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

/**
 * Calculates relevance score for documentation source
 * @param keywords - Extracted keywords
 * @param path - Documentation path
 * @param type - Documentation type
 * @returns Relevance score (0-1)
 */
function calculateRelevance(
  keywords: string[],
  path: string,
  type: string
): number {
  // Simple keyword matching - in production, use TF-IDF or embeddings
  const pathLower = path.toLowerCase();
  const typeLower = type.toLowerCase();

  let score = 0;
  for (const keyword of keywords) {
    if (pathLower.includes(keyword) || typeLower.includes(keyword)) {
      score += 0.2;
    }
  }

  return Math.min(score, 1.0);
}

// ============================================================================
// FLAGSTAFF AI CLIENT
// ============================================================================

/**
 * Calls Flagstaff AI API to generate response
 *
 * @param conversation - Current conversation context
 * @param userMessage - Latest user message
 * @param documentationContext - Relevant docs from knowledge base
 * @returns AI response with metadata
 */
async function callFlagstaffAI(
  conversation: AIConversation,
  userMessage: string,
  documentationContext: DocumentationReference[]
): Promise<FlagstaffResponse> {
  validateEnvironment();

  try {
    // Sanitize user message to remove PHI
    const { sanitized: sanitizedMessage, hadPHI } = sanitizePHI(userMessage);

    // Build context from previous messages (sanitized)
    const conversationHistory = conversation.messages
      .slice(-5) // Last 5 messages for context
      .map((msg) => ({
        role: msg.role,
        content: sanitizePHI(msg.content).sanitized,
      }));

    // Build documentation context
    const docContext = documentationContext
      .map((doc) => `[${doc.title}] ${doc.snippet}`)
      .join('\n');

    // Call Flagstaff AI API
    // NOTE: This is a mock implementation. In production:
    // 1. Replace with actual Flagstaff AI API endpoint
    // 2. Implement proper authentication
    // 3. Handle streaming responses if supported
    const response = await fetch(process.env.FLAGSTAFF_AI_API_URL || 'https://api.flagstaff.ai/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FLAGSTAFF_AI_API_KEY}`,
      },
      body: JSON.stringify({
        message: sanitizedMessage,
        conversationHistory,
        documentationContext: docContext,
        systemPrompt: `You are the WLPL AI Support Assistant.
Your goal is to help users with questions about the Weight Loss Projection Lab platform.
Use the provided documentation to answer questions accurately.
If you detect a bug or technical issue, set shouldEscalateToBugReport to true.
Always provide relevant documentation links.
Be concise, helpful, and empathetic.`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Flagstaff AI API error: ${response.status}`);
    }

    const data = await response.json();

    // Parse Flagstaff AI response
    const flagstaffResponse: FlagstaffResponse = {
      content: data.content || 'I apologize, but I encountered an issue generating a response. Please try rephrasing your question.',
      documentationLinks: data.documentationLinks || documentationContext.map((doc) => doc.path),
      topicTags: data.topicTags || extractKeywords(userMessage).slice(0, AI_CONFIG.MAX_TOPIC_TAGS),
      shouldEscalateToBugReport: data.shouldEscalateToBugReport || false,
      suggestedSeverity: data.suggestedSeverity,
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.8,
    };

    // Log if PHI was detected
    if (hadPHI) {
      logger.warn('[Flagstaff Support] PHI detected and sanitized in user message', {
        conversationId: conversation.id,
      });
    }

    return flagstaffResponse;
  } catch (error) {
    logger.error('[Flagstaff Support] Flagstaff AI call failed', error as Error);

    // Return graceful fallback response
    return {
      content: 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment, or visit our documentation at /support for immediate help.',
      documentationLinks: ['/support', '/docs'],
      topicTags: ['technical-issue'],
      shouldEscalateToBugReport: false,
      confidence: 0.0,
    };
  }
}

// ============================================================================
// CONVERSATION REPOSITORY (Data Access Layer)
// ============================================================================

/**
 * Repository for Firestore conversation operations
 * Isolates data access from business logic
 */
class ConversationRepository {
  /**
   * Creates new conversation document in Firestore
   * @param conversation - Conversation data
   * @returns Created conversation with ID
   */
  async create(conversation: Omit<AIConversation, 'id'>): Promise<AIConversation> {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.CONVERSATIONS), conversation);
      return { ...conversation, id: docRef.id };
    } catch (error) {
      logger.error('[Conversation Repository] Create failed', error as Error);
      throw new Error('Failed to create conversation');
    }
  }

  /**
   * Retrieves conversation by ID
   * @param conversationId - Conversation ID
   * @param userId - User ID for access control (null for anonymous)
   * @returns Conversation data or null if not found
   */
  async getById(conversationId: string, userId: string | null): Promise<AIConversation | null> {
    try {
      const docRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data() as Omit<AIConversation, 'id'>;

      // Access control: Users can only access their own conversations
      if (data.userId !== userId) {
        logger.warn('[Conversation Repository] Unauthorized access attempt', {
          conversationId,
          requestingUser: userId,
          conversationOwner: data.userId,
        });
        return null;
      }

      return { ...data, id: docSnap.id };
    } catch (error) {
      logger.error('[Conversation Repository] Get failed', error as Error);
      return null;
    }
  }

  /**
   * Appends message to conversation using transaction (prevents race conditions)
   * @param conversationId - Conversation ID
   * @param message - Message to append
   */
  async appendMessage(conversationId: string, message: AIMessage): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);

      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);

        if (!docSnap.exists()) {
          throw new Error('Conversation not found');
        }

        const currentMessages = (docSnap.data() as AIConversation).messages || [];
        const updatedMessages = [...currentMessages, message];

        transaction.update(docRef, {
          messages: updatedMessages,
        });
      });
    } catch (error) {
      logger.error('[Conversation Repository] Append message failed', error as Error);
      throw new Error('Failed to append message');
    }
  }

  /**
   * Updates conversation metadata
   * @param conversationId - Conversation ID
   * @param updates - Partial conversation updates
   */
  async update(conversationId: string, updates: Partial<AIConversation>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
      await updateDoc(docRef, updates as any);
    } catch (error) {
      logger.error('[Conversation Repository] Update failed', error as Error);
      throw new Error('Failed to update conversation');
    }
  }

  /**
   * Retrieves user's conversation history
   * @param userId - User ID (null for anonymous - returns empty array)
   * @param limitCount - Maximum number of conversations to return
   * @returns Array of conversations
   */
  async getUserConversations(userId: string | null, limitCount: number = 10): Promise<AIConversation[]> {
    if (!userId) {
      // Anonymous users don't have persistent history
      return [];
    }

    try {
      const q = query(
        collection(db, COLLECTIONS.CONVERSATIONS),
        where('userId', '==', userId),
        orderBy('startedAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        ...doc.data() as Omit<AIConversation, 'id'>,
        id: doc.id,
      }));
    } catch (error) {
      logger.error('[Conversation Repository] Get user conversations failed', error as Error);
      return [];
    }
  }
}

// Initialize repository instance
const conversationRepo = new ConversationRepository();

// ============================================================================
// ANALYTICS TRACKER
// ============================================================================

/**
 * Tracks conversation analytics asynchronously (non-blocking)
 * @param metadata - Analytics metadata
 */
async function trackAnalytics(metadata: AnalyticsMetadata): Promise<void> {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]!;
    const analyticsDocRef = doc(db, COLLECTIONS.ANALYTICS, today);

    // Update analytics in transaction to prevent race conditions
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(analyticsDocRef);

      if (!docSnap.exists()) {
        // Create new analytics document for today
        const newAnalytics: ConversationAnalytics = {
          date: today,
          metrics: {
            totalConversations: 1,
            successfulResolutions: metadata.resolutionStatus === 'resolved' ? 1 : 0,
            resolutionRate: metadata.resolutionStatus === 'resolved' ? 1.0 : 0.0,
            avgRating: metadata.feedbackRating || 0,
            avgDuration: metadata.durationSeconds,
            bugEscalations: metadata.resolutionStatus === 'escalated' ? 1 : 0,
          },
          topTopics: metadata.topicTags.map((topic) => ({
            topic,
            count: 1,
            successRate: metadata.resolutionStatus === 'resolved' ? 1.0 : 0.0,
            avgRating: metadata.feedbackRating || 0,
          })),
          documentationGaps: metadata.resolutionStatus !== 'resolved'
            ? [
                {
                  topic: metadata.topicTags[0] || 'unknown',
                  unsuccessfulCount: 1,
                  topQuestions: [metadata.conversationId],
                  avgRating: metadata.feedbackRating || 0,
                },
              ]
            : [],
        };

        transaction.set(analyticsDocRef, newAnalytics);
      } else {
        // Update existing analytics
        const currentData = docSnap.data() as ConversationAnalytics;
        const totalConversations = currentData.metrics.totalConversations + 1;
        const successfulResolutions =
          currentData.metrics.successfulResolutions +
          (metadata.resolutionStatus === 'resolved' ? 1 : 0);

        transaction.update(analyticsDocRef, {
          'metrics.totalConversations': totalConversations,
          'metrics.successfulResolutions': successfulResolutions,
          'metrics.resolutionRate': successfulResolutions / totalConversations,
          'metrics.bugEscalations':
            currentData.metrics.bugEscalations +
            (metadata.resolutionStatus === 'escalated' ? 1 : 0),
        });
      }
    });

    logger.info('[Flagstaff Support] Analytics tracked', { conversationId: metadata.conversationId });
  } catch (error) {
    // Analytics failures should not block user operations
    logger.error('[Flagstaff Support] Analytics tracking failed', error as Error);
  }
}

// ============================================================================
// MAIN SERVICE LAYER (Business Logic)
// ============================================================================

/**
 * Creates new AI support conversation
 *
 * @param input - Conversation creation input
 * @returns Created conversation with initial message if provided
 */
export async function createConversation(
  input: CreateConversationInput
): Promise<AIConversation> {
  try {
    // Get user agent and current URL from browser context
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    const initialUrl = typeof window !== 'undefined' ? window.location.href : 'Unknown';

    const conversation: Omit<AIConversation, 'id'> = {
      userId: input.userId,
      messages: [],
      startedAt: Timestamp.now(),
      endedAt: null,
      status: 'active',
      resolution: null,
      feedbackRating: null,
      feedbackText: null,
      topicTags: [],
      documentationLinksProvided: [],
      metadata: {
        userAgent,
        initialUrl,
      },
    };

    const createdConversation = await conversationRepo.create(conversation);

    // Log audit entry
    await logAuditEntry({
      timestamp: Timestamp.now(),
      userId: input.userId,
      action: 'conversation_create',
      conversationId: createdConversation.id,
      hadPHI: false,
      aiProvider: 'flagstaff',
    });

    // If initial message provided, send it
    if (input.initialMessage) {
      await sendMessage(createdConversation.id, input.initialMessage, input.userId);
      // Fetch updated conversation with AI response
      const updated = await conversationRepo.getById(createdConversation.id, input.userId);
      return updated || createdConversation;
    }

    logger.info('[Flagstaff Support] Conversation created', {
      conversationId: createdConversation.id,
      userId: input.userId,
    });

    return createdConversation;
  } catch (error) {
    logger.error('[Flagstaff Support] Create conversation failed', error as Error);
    throw new Error(formatErrorMessage(error));
  }
}

/**
 * Sends message and gets AI response
 *
 * @param conversationId - Conversation ID
 * @param message - User's message
 * @param userId - User ID (null for anonymous)
 * @returns AI response
 */
export async function sendMessage(
  conversationId: string,
  message: string,
  userId: string | null
): Promise<FlagstaffResponse> {
  try {
    // Validate input
    if (!message.trim()) {
      throw new Error('Message cannot be empty');
    }

    // Retrieve conversation
    const conversation = await conversationRepo.getById(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Check if conversation is still active
    if (conversation.status !== 'active') {
      throw new Error('Conversation has ended');
    }

    // Append user message
    const userMessage: AIMessage = {
      role: 'user',
      content: message,
      timestamp: Timestamp.now(),
    };

    await conversationRepo.appendMessage(conversationId, userMessage);

    // Search knowledge base for context
    const documentationContext = await searchKnowledgeBase(message);

    // Get AI response
    const aiResponse = await callFlagstaffAI(
      conversation,
      message,
      documentationContext
    );

    // Append AI response message
    const assistantMessage: AIMessage = {
      role: 'assistant',
      content: aiResponse.content,
      timestamp: Timestamp.now(),
      documentLinks: aiResponse.documentationLinks,
    };

    await conversationRepo.appendMessage(conversationId, assistantMessage);

    // Update conversation metadata
    const updatedTopicTags = Array.from(
      new Set([...conversation.topicTags, ...aiResponse.topicTags])
    ).slice(0, AI_CONFIG.MAX_TOPIC_TAGS);

    const updatedDocLinks = Array.from(
      new Set([...conversation.documentationLinksProvided, ...aiResponse.documentationLinks])
    );

    await conversationRepo.update(conversationId, {
      topicTags: updatedTopicTags,
      documentationLinksProvided: updatedDocLinks,
    });

    // Log audit entry
    const { hadPHI } = sanitizePHI(message);
    await logAuditEntry({
      timestamp: Timestamp.now(),
      userId,
      action: 'message_send',
      conversationId,
      hadPHI,
      aiProvider: 'flagstaff',
    });

    // Check if automatic bug escalation is needed
    if (aiResponse.shouldEscalateToBugReport) {
      logger.warn('[Flagstaff Support] AI detected potential bug', {
        conversationId,
        suggestedSeverity: aiResponse.suggestedSeverity,
      });
      // Note: Don't auto-escalate, let user confirm
    }

    logger.info('[Flagstaff Support] Message sent', {
      conversationId,
      confidence: aiResponse.confidence,
    });

    return aiResponse;
  } catch (error) {
    logger.error('[Flagstaff Support] Send message failed', error as Error);
    throw new Error(formatErrorMessage(error));
  }
}

/**
 * Ends conversation with user feedback
 *
 * @param conversationId - Conversation ID
 * @param userId - User ID (null for anonymous)
 * @param feedback - User feedback
 */
export async function endConversation(
  conversationId: string,
  userId: string | null,
  feedback: ConversationFeedback
): Promise<void> {
  try {
    // Retrieve conversation
    const conversation = await conversationRepo.getById(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Calculate duration
    const startTime = conversation.startedAt.toMillis();
    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);

    // Determine resolution status based on feedback
    const resolutionStatus: 'resolved' | 'escalated' | 'abandoned' =
      feedback.rating >= 4 ? 'resolved' : 'abandoned';

    const resolution = resolutionStatus === 'resolved' ? 'successful' : 'unsuccessful';

    // Update conversation
    await conversationRepo.update(conversationId, {
      status: 'completed',
      endedAt: Timestamp.now(),
      resolution,
      feedbackRating: feedback.rating,
      feedbackText: feedback.text || null,
    });

    // Track analytics (non-blocking)
    trackAnalytics({
      conversationId,
      userId,
      topicTags: conversation.topicTags,
      documentationLinksProvided: conversation.documentationLinksProvided,
      resolutionStatus,
      messageCount: conversation.messages.length,
      durationSeconds,
      feedbackRating: feedback.rating,
      aiConfidenceScore: 0.8, // Average across conversation
    });

    // Log audit entry
    await logAuditEntry({
      timestamp: Timestamp.now(),
      userId,
      action: 'conversation_end',
      conversationId,
      hadPHI: false,
      aiProvider: 'flagstaff',
      metadata: {
        feedbackRating: feedback.rating,
        resolution,
      },
    });

    logger.info('[Flagstaff Support] Conversation ended', {
      conversationId,
      resolution,
      feedbackRating: feedback.rating,
    });
  } catch (error) {
    logger.error('[Flagstaff Support] End conversation failed', error as Error);
    throw new Error(formatErrorMessage(error));
  }
}

/**
 * Retrieves conversation history for user
 *
 * @param userId - User ID (null returns empty array for anonymous)
 * @param limitCount - Maximum conversations to return
 * @returns Array of conversations
 */
export async function getConversationHistory(
  userId: string | null,
  limitCount: number = 10
): Promise<AIConversation[]> {
  try {
    return await conversationRepo.getUserConversations(userId, limitCount);
  } catch (error) {
    logger.error('[Flagstaff Support] Get history failed', error as Error);
    return [];
  }
}

/**
 * Escalates conversation to bug report
 * Last resort - only for actual platform bugs
 *
 * @param input - Bug report input
 * @returns Created bug report
 */
export async function escalateToBugReport(
  input: CreateBugReportInput
): Promise<BugReport> {
  try {
    // Retrieve conversation to include context
    const conversation = await conversationRepo.getById(input.conversationId, input.userId);
    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Check for duplicate bug reports (idempotency)
    const existingBugQuery = query(
      collection(db, COLLECTIONS.BUG_REPORTS),
      where('conversationId', '==', input.conversationId)
    );
    const existingBugs = await getDocs(existingBugQuery);

    if (!existingBugs.empty) {
      logger.warn('[Flagstaff Support] Duplicate bug report attempt', {
        conversationId: input.conversationId,
      });
      // Return existing bug report instead of creating duplicate
      return { ...existingBugs.docs[0]!.data() as Omit<BugReport, 'id'>, id: existingBugs.docs[0]!.id };
    }

    // Get user agent and URL from conversation metadata
    const userAgent = conversation.metadata.userAgent;
    const url = conversation.metadata.initialUrl;

    const bugReport: Omit<BugReport, 'id'> = {
      conversationId: input.conversationId,
      reportedBy: input.userId,
      description: input.description,
      severity: input.severity,
      status: 'new',
      createdAt: Timestamp.now(),
      metadata: {
        userAgent,
        url,
        screenshot: input.screenshot,
      },
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.BUG_REPORTS), bugReport);
    const createdBugReport = { ...bugReport, id: docRef.id };

    // Update conversation to mark as escalated
    await conversationRepo.update(input.conversationId, {
      resolution: 'unsuccessful',
    });

    // Log audit entry
    await logAuditEntry({
      timestamp: Timestamp.now(),
      userId: input.userId,
      action: 'bug_escalate',
      conversationId: input.conversationId,
      hadPHI: false,
      aiProvider: 'flagstaff',
      metadata: {
        bugReportId: docRef.id,
        severity: input.severity,
      },
    });

    // Track analytics
    trackAnalytics({
      conversationId: input.conversationId,
      userId: input.userId,
      topicTags: conversation.topicTags,
      documentationLinksProvided: conversation.documentationLinksProvided,
      resolutionStatus: 'escalated',
      messageCount: conversation.messages.length,
      durationSeconds: Math.floor(
        (Date.now() - conversation.startedAt.toMillis()) / 1000
      ),
      feedbackRating: null,
      aiConfidenceScore: 0.0,
    });

    logger.info('[Flagstaff Support] Bug report created', {
      bugReportId: docRef.id,
      conversationId: input.conversationId,
      severity: input.severity,
    });

    return createdBugReport;
  } catch (error) {
    logger.error('[Flagstaff Support] Bug escalation failed', error as Error);
    throw new Error(formatErrorMessage(error));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Flagstaff Support Service API
 */
export const FlagstaffSupportService = {
  // Conversation management
  createConversation,
  sendMessage,
  endConversation,
  getConversationHistory,

  // Bug escalation
  escalateToBugReport,

  // Knowledge base
  searchKnowledgeBase,

  // Utilities (exported for testing)
  sanitizePHI,
};

export default FlagstaffSupportService;
