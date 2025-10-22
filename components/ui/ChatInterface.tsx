'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { useAIChat } from '@/hooks/useAIChat'
import type { ChatMessage } from '@/lib/ai-coach'

export interface ChatInterfaceProps {
  userId: string | undefined
  className?: string
}

/**
 * AI Coach Chat Interface
 */
export function ChatInterface({ userId, className = '' }: ChatInterfaceProps) {
  const {
    messages,
    isLoading,
    isSending,
    error,
    suggestedPrompts,
    greeting,
    sendMessage,
    sendSuggestedPrompt,
    messagesEndRef
  } = useAIChat(userId)

  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  /**
   * Handle send message
   */
  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return

    const message = inputValue
    setInputValue('')

    const success = await sendMessage(message)
    if (success) {
      inputRef.current?.focus()
    }
  }

  /**
   * Handle Enter key to send
   */
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /**
   * Handle suggested prompt click
   */
  const handleSuggestedPrompt = async (prompt: string) => {
    setInputValue('')
    await sendSuggestedPrompt(prompt)
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-3 text-muted-foreground">Loading chat...</span>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-4 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🤖</div>
          <div>
            <h3 className="font-bold">AI Nutrition Coach</h3>
            <p className="text-sm opacity-90">Your personal wellness advisor</p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-[400px] max-h-[600px]">
        {/* Greeting */}
        {messages.length === 0 && greeting && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg p-4 shadow-sm max-w-[80%]">
              <div className="flex items-start gap-2">
                <span className="text-2xl">🤖</span>
                <div>
                  <p className="text-sm text-foreground">{greeting}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Prompts */}
        {messages.length === 0 && suggestedPrompts.length > 0 && (
          <div className="flex flex-wrap gap-2 my-4">
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSuggestedPrompt(prompt)}
                disabled={isSending}
                className="bg-white border border-primary text-primary px-3 py-2 rounded-full text-sm hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Sending Indicator */}
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="animate-pulse flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animation-delay-200"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animation-delay-400"></div>
                </div>
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 rounded-b-lg border-t">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about nutrition, meals, or your progress..."
            disabled={isSending}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? '...' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          💡 Tip: Ask about meal ideas, nutrition tips, or how you're doing
        </p>
      </div>
    </div>
  )
}

/**
 * Individual message bubble
 */
interface MessageBubbleProps {
  message: ChatMessage
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`rounded-lg p-4 shadow-sm max-w-[80%] ${
          isUser
            ? 'bg-primary text-white'
            : 'bg-white text-foreground'
        }`}
      >
        <div className="flex items-start gap-2">
          {!isUser && <span className="text-2xl">🤖</span>}
          <div className="flex-1">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            <p className={`text-xs mt-2 ${isUser ? 'text-white/70' : 'text-muted-foreground'}`}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {isUser && <span className="text-2xl">👤</span>}
        </div>
      </div>
    </div>
  )
}

/**
 * Compact chat widget (minimized version for dashboard)
 */
export interface ChatWidgetProps {
  userId: string | undefined
  onExpand?: () => void
}

export function ChatWidget({ userId, onExpand }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true)
          onExpand?.()
        }}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-primary to-primary-dark text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform z-50"
        aria-label="Open AI Coach"
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <span className="font-medium">Ask Coach</span>
        </div>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-2xl z-50 overflow-hidden">
      {/* Close Button */}
      <button
        onClick={() => setIsOpen(false)}
        className="absolute top-2 right-2 text-white hover:bg-white/20 rounded-full p-2 z-10"
        aria-label="Close chat"
      >
        ✕
      </button>

      {/* Chat Interface */}
      <ChatInterface userId={userId} className="h-[600px]" />
    </div>
  )
}
