/**
 * Cloud Function: AI Conversation Analytics Aggregation
 *
 * Triggered when a conversation ends (status changes to 'completed')
 * Aggregates metrics into daily analytics for admin dashboard
 *
 * Updates:
 * - conversation_analytics/{date} - Daily aggregated metrics
 * - Documentation gaps identification
 * - Topic-based success rates
 */

import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import {
  AIConversation,
  ConversationAnalytics,
  TopicMetric,
  DocumentationGap
} from '../../types/ai-support'

// Initialize Firebase Admin (only once per module)
if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

/**
 * Triggered when conversation document is updated
 * Runs analytics aggregation when status changes to 'completed'
 */
export const onConversationComplete = functions.firestore
  .document('ai_conversations/{conversationId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() as AIConversation
    const after = change.after.data() as AIConversation

    // Only process when conversation completes
    if (before.status === 'active' && after.status === 'completed') {
      await aggregateConversationMetrics(after)
    }
  })

/**
 * Aggregate conversation metrics into daily analytics
 */
async function aggregateConversationMetrics(conversation: AIConversation): Promise<void> {
  try {
    const date = getDateString(conversation.startedAt)
    const analyticsRef = db.collection('conversation_analytics').doc(date)

    await db.runTransaction(async (transaction) => {
      const analyticsDoc = await transaction.get(analyticsRef)

      if (analyticsDoc.exists) {
        // Update existing analytics
        const existingData = analyticsDoc.data() as ConversationAnalytics

        const updatedMetrics = calculateUpdatedMetrics(existingData, conversation)
        const updatedTopics = updateTopTopics(existingData.topTopics, conversation)
        const updatedGaps = updateDocumentationGaps(existingData.documentationGaps, conversation)

        transaction.update(analyticsRef, {
          metrics: updatedMetrics,
          topTopics: updatedTopics,
          documentationGaps: updatedGaps
        })
      } else {
        // Create new analytics document
        const newAnalytics = createNewAnalytics(date, conversation)
        transaction.set(analyticsRef, newAnalytics)
      }
    })

    console.log(`Analytics updated for ${date}`)
  } catch (error) {
    console.error('Error aggregating conversation metrics:', error)
    throw error
  }
}

/**
 * Calculate updated metrics incorporating new conversation
 */
function calculateUpdatedMetrics(
  existing: ConversationAnalytics,
  conversation: AIConversation
): ConversationAnalytics['metrics'] {
  const totalConversations = existing.metrics.totalConversations + 1
  const successfulResolutions = existing.metrics.successfulResolutions +
    (conversation.resolution === 'successful' ? 1 : 0)
  const resolutionRate = successfulResolutions / totalConversations

  // Calculate average rating
  const totalRating = existing.metrics.avgRating * existing.metrics.totalConversations
  const newRating = conversation.feedbackRating || 0
  const avgRating = (totalRating + newRating) / totalConversations

  // Calculate average duration
  const duration = conversation.endedAt
    ? (conversation.endedAt.toMillis() - conversation.startedAt.toMillis()) / 1000
    : 0
  const totalDuration = existing.metrics.avgDuration * existing.metrics.totalConversations
  const avgDuration = (totalDuration + duration) / totalConversations

  // Count bug escalations
  const bugEscalations = existing.metrics.bugEscalations +
    (conversation.topicTags.includes('bug_escalation') ? 1 : 0)

  return {
    totalConversations,
    successfulResolutions,
    resolutionRate,
    avgRating,
    avgDuration,
    bugEscalations
  }
}

/**
 * Update top topics list with new conversation
 */
function updateTopTopics(
  existingTopics: TopicMetric[],
  conversation: AIConversation
): TopicMetric[] {
  const topicsMap = new Map<string, TopicMetric>()

  // Load existing topics into map
  existingTopics.forEach(topic => {
    topicsMap.set(topic.topic, topic)
  })

  // Update with new conversation topics
  conversation.topicTags.forEach(tag => {
    const existing = topicsMap.get(tag)

    if (existing) {
      // Update existing topic
      const newCount = existing.count + 1
      const successCount = (existing.successRate * existing.count) +
        (conversation.resolution === 'successful' ? 1 : 0)
      const newSuccessRate = successCount / newCount

      const totalRating = existing.avgRating * existing.count
      const newRating = conversation.feedbackRating || 0
      const newAvgRating = (totalRating + newRating) / newCount

      topicsMap.set(tag, {
        topic: tag,
        count: newCount,
        successRate: newSuccessRate,
        avgRating: newAvgRating
      })
    } else {
      // Create new topic
      topicsMap.set(tag, {
        topic: tag,
        count: 1,
        successRate: conversation.resolution === 'successful' ? 1 : 0,
        avgRating: conversation.feedbackRating || 0
      })
    }
  })

  // Convert back to array and sort by count (descending)
  return Array.from(topicsMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20) // Keep top 20 topics
}

/**
 * Update documentation gaps with unsuccessful conversations
 */
function updateDocumentationGaps(
  existingGaps: DocumentationGap[],
  conversation: AIConversation
): DocumentationGap[] {
  // Only track unsuccessful resolutions
  if (conversation.resolution === 'successful') {
    return existingGaps
  }

  const gapsMap = new Map<string, DocumentationGap>()

  // Load existing gaps into map
  existingGaps.forEach(gap => {
    gapsMap.set(gap.topic, gap)
  })

  // Extract first user message as the question
  const firstUserMessage = conversation.messages.find(m => m.role === 'user')
  const question = firstUserMessage?.content || 'Unknown question'

  // Update gaps for each topic
  conversation.topicTags.forEach(tag => {
    const existing = gapsMap.get(tag)

    if (existing) {
      // Update existing gap
      const newUnsuccessfulCount = existing.unsuccessfulCount + 1

      // Add question to top questions (keep top 3)
      const topQuestions = [...existing.topQuestions, question]
        .slice(0, 3)

      const totalRating = existing.avgRating * existing.unsuccessfulCount
      const newRating = conversation.feedbackRating || 0
      const newAvgRating = (totalRating + newRating) / newUnsuccessfulCount

      gapsMap.set(tag, {
        topic: tag,
        unsuccessfulCount: newUnsuccessfulCount,
        topQuestions,
        avgRating: newAvgRating
      })
    } else {
      // Create new gap
      gapsMap.set(tag, {
        topic: tag,
        unsuccessfulCount: 1,
        topQuestions: [question],
        avgRating: conversation.feedbackRating || 0
      })
    }
  })

  // Convert back to array and sort by unsuccessfulCount (descending)
  return Array.from(gapsMap.values())
    .sort((a, b) => b.unsuccessfulCount - a.unsuccessfulCount)
    .slice(0, 10) // Keep top 10 gaps
}

/**
 * Create new analytics document for a date
 */
function createNewAnalytics(
  date: string,
  conversation: AIConversation
): ConversationAnalytics {
  const duration = conversation.endedAt
    ? (conversation.endedAt.toMillis() - conversation.startedAt.toMillis()) / 1000
    : 0

  const topTopics: TopicMetric[] = conversation.topicTags.map(tag => ({
    topic: tag,
    count: 1,
    successRate: conversation.resolution === 'successful' ? 1 : 0,
    avgRating: conversation.feedbackRating || 0
  }))

  const documentationGaps: DocumentationGap[] = conversation.resolution === 'unsuccessful'
    ? conversation.topicTags.map(tag => {
        const firstUserMessage = conversation.messages.find(m => m.role === 'user')
        const question = firstUserMessage?.content || 'Unknown question'

        return {
          topic: tag,
          unsuccessfulCount: 1,
          topQuestions: [question],
          avgRating: conversation.feedbackRating || 0
        }
      })
    : []

  return {
    date,
    metrics: {
      totalConversations: 1,
      successfulResolutions: conversation.resolution === 'successful' ? 1 : 0,
      resolutionRate: conversation.resolution === 'successful' ? 1 : 0,
      avgRating: conversation.feedbackRating || 0,
      avgDuration: duration,
      bugEscalations: conversation.topicTags.includes('bug_escalation') ? 1 : 0
    },
    topTopics,
    documentationGaps
  }
}

/**
 * Get date string in YYYY-MM-DD format
 */
function getDateString(timestamp: admin.firestore.Timestamp): string {
  const date = timestamp.toDate()
  return date.toISOString().split('T')[0]
}

/**
 * Manual trigger for recalculating all analytics
 * Use this for backfilling or fixing data issues
 */
export const recalculateAllAnalytics = functions.https.onCall(async (data, context) => {
  // Only allow admins to trigger this
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can recalculate analytics'
    )
  }

  try {
    const conversationsSnapshot = await db
      .collection('ai_conversations')
      .where('status', '==', 'completed')
      .get()

    const conversations = conversationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AIConversation[]

    console.log(`Recalculating analytics for ${conversations.length} conversations`)

    // Group conversations by date
    const conversationsByDate = new Map<string, AIConversation[]>()

    conversations.forEach(conversation => {
      const date = getDateString(conversation.startedAt)
      const existing = conversationsByDate.get(date) || []
      conversationsByDate.set(date, [...existing, conversation])
    })

    // Recalculate analytics for each date
    const batch = db.batch()
    const analyticsCollection = db.collection('conversation_analytics')

    conversationsByDate.forEach((dateConversations, date) => {
      const analyticsRef = analyticsCollection.doc(date)

      // Calculate fresh analytics from scratch
      let analytics = createNewAnalytics(date, dateConversations[0])

      // Aggregate remaining conversations
      for (let i = 1; i < dateConversations.length; i++) {
        const conversation = dateConversations[i]
        analytics.metrics = calculateUpdatedMetrics(analytics, conversation)
        analytics.topTopics = updateTopTopics(analytics.topTopics, conversation)
        analytics.documentationGaps = updateDocumentationGaps(analytics.documentationGaps, conversation)
      }

      batch.set(analyticsRef, analytics)
    })

    await batch.commit()

    console.log(`Recalculated analytics for ${conversationsByDate.size} dates`)

    return {
      success: true,
      datesProcessed: conversationsByDate.size,
      conversationsProcessed: conversations.length
    }
  } catch (error) {
    console.error('Error recalculating analytics:', error)
    throw new functions.https.HttpsError('internal', 'Failed to recalculate analytics')
  }
})
