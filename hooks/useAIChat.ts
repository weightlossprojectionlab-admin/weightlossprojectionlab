'use client'

import { useState, useEffect, useRef } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import {
  type ChatMessage,
  type ChatContext,
  getSuggestedPrompts,
  generateGreeting,
  fetchUserContext
} from '@/lib/ai-coach'
import toast from 'react-hot-toast'

export interface AIChatState {
  messages: ChatMessage[]
  isLoading: boolean
  isSending: boolean
  error: string | null
  suggestedPrompts: string[]
  greeting: string
}

/**
 * Hook to manage AI Coach chat interactions
 */
export function useAIChat(userId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([])
  const [greeting, setGreeting] = useState('')
  const [context, setContext] = useState<ChatContext>({})

  const messagesEndRef = useRef<HTMLDivElement>(null)

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  /**
   * Load chat history and context
   */
  useEffect(() => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    const loadChat = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch user context
        const userContext = await fetchUserContext(userId)
        setContext(userContext)

        // Generate greeting and suggestions
        setGreeting(generateGreeting(userContext))
        setSuggestedPrompts(getSuggestedPrompts(userContext))

        // Fetch chat history from API
        const user = auth.currentUser
        if (!user) {
          throw new Error('User not authenticated')
        }

        const token = await user.getIdToken()
        const response = await fetch('/api/ai/chat', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to load chat history')
        }

        const data = await response.json()
        setMessages(data.messages || [])

      } catch (err) {
        logger.error('[useAIChat] Error loading chat:', err as Error)
        setError(err instanceof Error ? err.message : 'Failed to load chat')
      } finally {
        setIsLoading(false)
      }
    }

    loadChat()
  }, [userId])

  /**
   * Auto-scroll when messages change
   */
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  /**
   * Send a message to the AI Coach
   */
  const sendMessage = async (content: string): Promise<boolean> => {
    if (!userId || !content.trim()) {
      return false
    }

    try {
      setIsSending(true)
      setError(null)

      // Add user message optimistically
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        userId,
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
        metadata: { source: 'chat' }
      }

      setMessages(prev => [...prev, userMessage])

      // Get auth token
      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }

      const token = await user.getIdToken()

      // Send to API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: content.trim(),
          includeContext: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        userId,
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
        metadata: { source: 'chat' }
      }

      setMessages(prev => [...prev, assistantMessage])

      return true

    } catch (err) {
      logger.error('[useAIChat] Error sending message:', err as Error)
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      toast.error(errorMessage)

      // Remove optimistic user message on error
      setMessages(prev => prev.slice(0, -1))

      return false
    } finally {
      setIsSending(false)
    }
  }

  /**
   * Send a suggested prompt
   */
  const sendSuggestedPrompt = async (prompt: string): Promise<boolean> => {
    return sendMessage(prompt)
  }

  /**
   * Clear chat history (local only)
   */
  const clearMessages = () => {
    setMessages([])
  }

  return {
    messages,
    isLoading,
    isSending,
    error,
    suggestedPrompts,
    greeting,
    context,
    sendMessage,
    sendSuggestedPrompt,
    clearMessages,
    messagesEndRef
  }
}
