/**
 * useAIConversation Hook
 *
 * React hook for managing AI-powered support conversations
 * Integrates with Flagstaff AI service layer for 100% self-service support
 *
 * Features:
 * - Real-time conversation state management
 * - Message sending and receiving
 * - Conversation feedback and completion
 * - Bug escalation
 * - Anonymous user support
 * - HIPAA-compliant PHI sanitization
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUser } from './useUser'
import {
  createConversation,
  sendMessage,
  endConversation,
  escalateToBugReport,
  getConversationHistory
} from '@/lib/ai/flagstaff-support'
import {
  AIConversation,
  AIMessage,
  ConversationFeedback,
  FlagstaffResponse,
  CreateBugReportInput,
  BugReport
} from '@/types/ai-support'

interface UseAIConversationOptions {
  conversationId?: string // Load existing conversation
  autoCreate?: boolean // Auto-create conversation on mount
  initialMessage?: string // Send this message after creating conversation
}

interface UseAIConversationReturn {
  // Conversation State
  conversation: AIConversation | null
  messages: AIMessage[]
  loading: boolean
  error: string | null

  // Conversation Actions
  startConversation: (initialMessage?: string) => Promise<AIConversation>
  send: (message: string) => Promise<FlagstaffResponse | null>
  endConversationWithFeedback: (feedback: ConversationFeedback) => Promise<void>

  // Bug Escalation
  escalateToBug: (input: Omit<CreateBugReportInput, 'conversationId' | 'userId'>) => Promise<BugReport | null>

  // History
  conversationHistory: AIConversation[]
  loadHistory: () => Promise<void>

  // State Helpers
  isActive: boolean
  canSendMessages: boolean
}

/**
 * Hook for managing AI-powered support conversations
 *
 * @example
 * ```tsx
 * function SupportChat() {
 *   const {
 *     conversation,
 *     messages,
 *     send,
 *     endConversationWithFeedback,
 *     loading
 *   } = useAIConversation({ autoCreate: true })
 *
 *   const handleSend = async (text: string) => {
 *     const response = await send(text)
 *     if (response) {
 *       console.log('AI response:', response.content)
 *     }
 *   }
 *
 *   return (
 *     <div>
 *       {messages.map(msg => (
 *         <div key={msg.timestamp.toString()}>
 *           <strong>{msg.role}:</strong> {msg.content}
 *         </div>
 *       ))}
 *       <button onClick={() => handleSend('How do I track weight?')}>
 *         Ask Question
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAIConversation(options: UseAIConversationOptions = {}): UseAIConversationReturn {
  const { conversationId, autoCreate = false, initialMessage } = options
  const { user } = useUser()

  // State
  const [conversation, setConversation] = useState<AIConversation | null>(null)
  const [conversationHistory, setConversationHistory] = useState<AIConversation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Computed State
  const messages = conversation?.messages || []
  const isActive = conversation?.status === 'active'
  const canSendMessages = isActive && !loading

  /**
   * Start a new conversation
   */
  const startConversation = useCallback(async (initialMsg?: string) => {
    try {
      setLoading(true)
      setError(null)

      const newConversation = await createConversation({
        userId: user?.id || null,
        initialMessage: initialMsg
      })

      setConversation(newConversation)

      return newConversation
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start conversation'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  /**
   * Send a message and get AI response
   */
  const send = useCallback(async (message: string): Promise<FlagstaffResponse | null> => {
    if (!conversation) {
      setError('No active conversation')
      return null
    }

    if (!canSendMessages) {
      setError('Cannot send messages in current state')
      return null
    }

    try {
      setLoading(true)
      setError(null)

      const response = await sendMessage(
        conversation.id,
        message,
        user?.id || null
      )

      // Conversation will update via onSnapshot listener
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [conversation, canSendMessages, user])

  /**
   * End conversation with feedback
   */
  const endConversationWithFeedback = useCallback(async (feedback: ConversationFeedback) => {
    if (!conversation) {
      setError('No active conversation')
      return
    }

    try {
      setLoading(true)
      setError(null)

      await endConversation(
        conversation.id,
        user?.id || null,
        feedback
      )

      // Conversation will update via onSnapshot listener
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end conversation'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [conversation, user])

  /**
   * Escalate to bug report
   */
  const escalateToBug = useCallback(async (
    input: Omit<CreateBugReportInput, 'conversationId' | 'userId'>
  ): Promise<BugReport | null> => {
    if (!conversation) {
      setError('No active conversation')
      return null
    }

    try {
      setLoading(true)
      setError(null)

      const bugReport = await escalateToBugReport({
        conversationId: conversation.id,
        userId: user?.id || null,
        ...input
      })

      return bugReport
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create bug report'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [conversation, user])

  /**
   * Load conversation history
   */
  const loadHistory = useCallback(async () => {
    if (!user) {
      setConversationHistory([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const history = await getConversationHistory(user.id, 10)
      setConversationHistory(history)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load history'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [user])

  /**
   * Real-time conversation updates via Firestore listener
   */
  useEffect(() => {
    if (!conversation?.id) return

    const conversationRef = doc(db, 'ai_conversations', conversation.id)

    const unsubscribe = onSnapshot(
      conversationRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          setConversation({
            id: snapshot.id,
            ...data
          } as AIConversation)
        }
      },
      (err) => {
        console.error('Error listening to conversation:', err)
        setError('Lost connection to conversation')
      }
    )

    return () => unsubscribe()
  }, [conversation?.id])

  /**
   * Auto-create conversation on mount if requested
   */
  useEffect(() => {
    if (autoCreate && !conversation && !loading) {
      startConversation(initialMessage)
    }
  }, [autoCreate, conversation, loading, initialMessage, startConversation])

  /**
   * Load conversation by ID if provided
   */
  useEffect(() => {
    if (conversationId && !conversation) {
      // Set up real-time listener for existing conversation
      const conversationRef = doc(db, 'ai_conversations', conversationId)

      const unsubscribe = onSnapshot(
        conversationRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data()
            setConversation({
              id: snapshot.id,
              ...data
            } as AIConversation)
          } else {
            setError('Conversation not found')
          }
        },
        (err) => {
          console.error('Error loading conversation:', err)
          setError('Failed to load conversation')
        }
      )

      return () => unsubscribe()
    }
  }, [conversationId, conversation])

  return {
    // State
    conversation,
    messages,
    loading,
    error,

    // Actions
    startConversation,
    send,
    endConversationWithFeedback,
    escalateToBug,

    // History
    conversationHistory,
    loadHistory,

    // Helpers
    isActive,
    canSendMessages
  }
}

/**
 * Lightweight hook for conversation history only
 * Use this when you don't need active conversation management
 *
 * @example
 * ```tsx
 * function ConversationHistory() {
 *   const { history, loading } = useConversationHistory()
 *
 *   return (
 *     <div>
 *       {history.map(conv => (
 *         <div key={conv.id}>
 *           <h3>Conversation from {conv.startedAt.toDate().toLocaleDateString()}</h3>
 *           <p>Status: {conv.status}</p>
 *           <p>Rating: {conv.feedbackRating || 'Not rated'}</p>
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useConversationHistory() {
  const { user } = useUser()
  const [history, setHistory] = useState<AIConversation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    if (!user) {
      setHistory([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const conversations = await getConversationHistory(user.id, 20)
      setHistory(conversations)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load history'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Load on mount and when user changes
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  return {
    history,
    loading,
    error,
    reload: loadHistory
  }
}
