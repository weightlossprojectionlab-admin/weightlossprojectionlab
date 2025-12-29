/**
 * AI Support Analytics Component
 *
 * Displays real-time analytics for AI-powered support system
 * Shows resolution rates, top topics, documentation gaps
 */

'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ConversationAnalytics, TopicMetric, DocumentationGap } from '@/types/ai-support'
import {
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  StarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  BugAntIcon
} from '@heroicons/react/24/outline'

interface AISupportAnalyticsProps {
  className?: string
}

export function AISupportAnalytics({ className = '' }: AISupportAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ConversationAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch last 30 days of analytics
  useEffect(() => {
    const analyticsQuery = query(
      collection(db, 'conversation_analytics'),
      orderBy('date', 'desc'),
      limit(30)
    )

    const unsubscribe = onSnapshot(
      analyticsQuery,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          date: doc.id
        })) as ConversationAnalytics[]

        setAnalytics(data)
        setLoading(false)
      },
      (err) => {
        console.error('Error fetching AI support analytics:', err)
        setError('Failed to load analytics')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className={`bg-card rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-card rounded-lg shadow p-6 ${className}`}>
        <div className="text-error">{error}</div>
      </div>
    )
  }

  // Calculate aggregate metrics from last 30 days
  const totalMetrics = analytics.reduce(
    (acc, day) => ({
      totalConversations: acc.totalConversations + day.metrics.totalConversations,
      successfulResolutions: acc.successfulResolutions + day.metrics.successfulResolutions,
      totalRating: acc.totalRating + (day.metrics.avgRating * day.metrics.totalConversations),
      totalDuration: acc.totalDuration + (day.metrics.avgDuration * day.metrics.totalConversations),
      bugEscalations: acc.bugEscalations + day.metrics.bugEscalations
    }),
    { totalConversations: 0, successfulResolutions: 0, totalRating: 0, totalDuration: 0, bugEscalations: 0 }
  )

  const overallResolutionRate = totalMetrics.totalConversations > 0
    ? (totalMetrics.successfulResolutions / totalMetrics.totalConversations) * 100
    : 0

  const overallAvgRating = totalMetrics.totalConversations > 0
    ? totalMetrics.totalRating / totalMetrics.totalConversations
    : 0

  const overallAvgDuration = totalMetrics.totalConversations > 0
    ? totalMetrics.totalDuration / totalMetrics.totalConversations
    : 0

  // Aggregate top topics across all days
  const topicsMap = new Map<string, TopicMetric>()
  analytics.forEach(day => {
    day.topTopics.forEach(topic => {
      const existing = topicsMap.get(topic.topic)
      if (existing) {
        const newCount = existing.count + topic.count
        const successCount = (existing.successRate * existing.count) + (topic.successRate * topic.count)
        const totalRating = (existing.avgRating * existing.count) + (topic.avgRating * topic.count)

        topicsMap.set(topic.topic, {
          topic: topic.topic,
          count: newCount,
          successRate: successCount / newCount,
          avgRating: totalRating / newCount
        })
      } else {
        topicsMap.set(topic.topic, topic)
      }
    })
  })

  const topTopics = Array.from(topicsMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Aggregate documentation gaps
  const gapsMap = new Map<string, DocumentationGap>()
  analytics.forEach(day => {
    day.documentationGaps.forEach(gap => {
      const existing = gapsMap.get(gap.topic)
      if (existing) {
        const newCount = existing.unsuccessfulCount + gap.unsuccessfulCount
        const totalRating = (existing.avgRating * existing.unsuccessfulCount) + (gap.avgRating * gap.unsuccessfulCount)

        gapsMap.set(gap.topic, {
          topic: gap.topic,
          unsuccessfulCount: newCount,
          topQuestions: [...new Set([...existing.topQuestions, ...gap.topQuestions])].slice(0, 3),
          avgRating: totalRating / newCount
        })
      } else {
        gapsMap.set(gap.topic, gap)
      }
    })
  })

  const documentationGaps = Array.from(gapsMap.values())
    .sort((a, b) => b.unsuccessfulCount - a.unsuccessfulCount)
    .slice(0, 5)

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="h-6 w-6 text-primary" />
          AI Support Analytics
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Last 30 days of AI-powered support conversations
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-blue-700 dark:text-blue-300">Total</span>
          </div>
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {totalMetrics.totalConversations.toLocaleString()}
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            Conversations
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            <span className="text-xs text-green-700 dark:text-green-300">Success</span>
          </div>
          <div className="text-3xl font-bold text-green-900 dark:text-green-100">
            {overallResolutionRate.toFixed(1)}%
          </div>
          <div className="text-xs text-green-700 dark:text-green-300 mt-1">
            Resolution Rate
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <StarIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            <span className="text-xs text-yellow-700 dark:text-yellow-300">Quality</span>
          </div>
          <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
            {overallAvgRating.toFixed(1)}
          </div>
          <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
            Avg Rating (1-5)
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <ClockIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <span className="text-xs text-purple-700 dark:text-purple-300">Speed</span>
          </div>
          <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {Math.round(overallAvgDuration / 60)}m
          </div>
          <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
            Avg Duration
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Topics */}
        <div className="bg-card rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-primary" />
            Top Topics
          </h3>
          <div className="space-y-3">
            {topTopics.map((topic, index) => (
              <div key={topic.topic} className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-bold text-muted-foreground">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-foreground capitalize">
                      {topic.topic.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {topic.count} conversations
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${
                    topic.successRate >= 0.8 ? 'text-success' :
                    topic.successRate >= 0.6 ? 'text-yellow-600' :
                    'text-error'
                  }`}>
                    {(topic.successRate * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {topic.avgRating.toFixed(1)}★
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Documentation Gaps */}
        <div className="bg-card rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
            Documentation Gaps
            {totalMetrics.bugEscalations > 0 && (
              <span className="ml-auto text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-full flex items-center gap-1">
                <BugAntIcon className="h-3 w-3" />
                {totalMetrics.bugEscalations} bugs
              </span>
            )}
          </h3>
          <div className="space-y-3">
            {documentationGaps.length > 0 ? (
              documentationGaps.map((gap, index) => (
                <div key={gap.topic} className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-foreground capitalize">
                      {gap.topic.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                      {gap.unsuccessfulCount} failures
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Top question: "{gap.topQuestions[0]?.substring(0, 80)}..."
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircleIcon className="h-12 w-12 mx-auto mb-2 text-success" />
                <p>No documentation gaps detected!</p>
                <p className="text-xs mt-1">All topics have high success rates</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
