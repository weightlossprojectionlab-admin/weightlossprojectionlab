// Group Feed Component
// PRD Reference: social_retention_and_group_missions (PRD v1.3.7)
// Social feed with infinite scroll

'use client'

import { useState, useEffect, useCallback } from 'react'
import { collection, query, orderBy, limit, onSnapshot, DocumentSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { fetchPosts } from '@/lib/post-operations'
import type { GroupPost } from '@/schemas/firestore/posts'
import PostCard from './PostCard'
import { Loader2 } from 'lucide-react'
import { logger } from '@/lib/logger'

interface GroupFeedProps {
  groupId: string
  isCreator: boolean
}

export default function GroupFeed({ groupId, isCreator }: GroupFeedProps) {
  const [posts, setPosts] = useState<GroupPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null)

  // Initial load with real-time updates
  useEffect(() => {
    logger.info('[GroupFeed] Setting up onSnapshot listener', { groupId })

    const postsQuery = query(
      collection(db, `groups/${groupId}/posts`),
      orderBy('createdAt', 'desc'),
      limit(10)
    )

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        logger.info('[GroupFeed] onSnapshot triggered', {
          groupId,
          count: snapshot.docs.length,
          docChanges: snapshot.docChanges().length,
          changeTypes: snapshot.docChanges().map(c => c.type)
        })

        const postsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as GroupPost[]

        setPosts(postsData)
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null)
        setHasMore(snapshot.docs.length === 10)
        setIsLoading(false)

        logger.info('[GroupFeed] Posts state updated', { count: postsData.length })
      },
      (error) => {
        logger.error('[GroupFeed] Error in onSnapshot', error)
        setIsLoading(false)
      }
    )

    return () => {
      logger.info('[GroupFeed] Cleaning up onSnapshot listener', { groupId })
      unsubscribe()
    }
  }, [groupId])

  // Load more posts
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !lastDoc) return

    setIsLoadingMore(true)
    try {
      const { posts: newPosts, lastDoc: newLastDoc } = await fetchPosts(groupId, 10, lastDoc)

      if (newPosts.length === 0) {
        setHasMore(false)
      } else {
        setPosts((prev) => [...prev, ...newPosts])
        setLastDoc(newLastDoc)
        setHasMore(newPosts.length === 10)
      }
    } catch (error) {
      logger.error('[GroupFeed] Error loading more posts', error as Error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [groupId, lastDoc, hasMore, isLoadingMore])

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500 &&
        !isLoadingMore &&
        hasMore
      ) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadMore, isLoadingMore, hasMore])

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-2">No posts yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Be the first to share an update!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          groupId={groupId}
          isCreator={isCreator}
          onDeleted={() => handlePostDeleted(post.id)}
        />
      ))}

      {isLoadingMore && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
          You've reached the end
        </p>
      )}
    </div>
  )
}
