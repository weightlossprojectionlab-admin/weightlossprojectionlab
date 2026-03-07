// Post Card Component
// PRD Reference: social_retention_and_group_missions (PRD v1.3.7)
// Display individual post with reactions and comments

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  addReaction,
  removeReaction,
  addComment,
  deleteComment,
  deletePost,
} from '@/lib/post-operations'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { GroupPost, PostReaction, PostComment } from '@/schemas/firestore/posts'
import {
  Heart,
  Sparkles,
  ThumbsUp,
  MessageCircle,
  Trash2,
  MoreVertical,
  Send,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

interface PostCardProps {
  post: GroupPost
  groupId: string
  isCreator: boolean
  onDeleted?: () => void
}

export default function PostCard({ post, groupId, isCreator, onDeleted }: PostCardProps) {
  const { user } = useAuth()
  const [reactions, setReactions] = useState<PostReaction[]>([])
  const [comments, setComments] = useState<PostComment[]>([])
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [showReplies, setShowReplies] = useState<Set<string>>(new Set())

  const isAuthor = user?.uid === post.authorId
  const userReaction = reactions.find((r) => r.userId === user?.uid)

  // Real-time reactions listener
  useEffect(() => {
    const reactionsQuery = query(
      collection(db, `groups/${groupId}/posts/${post.id}/reactions`),
      limit(100)
    )

    const unsubscribe = onSnapshot(
      reactionsQuery,
      (snapshot) => {
        const reactionsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as PostReaction[]
        setReactions(reactionsData)
      },
      (error) => {
        logger.error('[PostCard] Error fetching reactions', error)
      }
    )

    return () => unsubscribe()
  }, [groupId, post.id])

  // Real-time comments listener
  useEffect(() => {
    const commentsQuery = query(
      collection(db, `groups/${groupId}/posts/${post.id}/comments`),
      orderBy('createdAt', 'asc'),
      limit(50)
    )

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const commentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as PostComment[]
        setComments(commentsData)
      },
      (error) => {
        logger.error('[PostCard] Error fetching comments', error)
      }
    )

    return () => unsubscribe()
  }, [groupId, post.id])

  const handleReaction = async (type: PostReaction['type']) => {
    if (!user) return

    if (userReaction) {
      // Remove reaction if same type, otherwise update
      if (userReaction.type === type) {
        await removeReaction(groupId, post.id, user.uid)
      } else {
        await addReaction(groupId, post.id, user.uid, user.displayName || 'Anonymous', type)
      }
    } else {
      await addReaction(groupId, post.id, user.uid, user.displayName || 'Anonymous', type)
    }
  }

  const handleAddComment = async (e: React.FormEvent, parentCommentId?: string) => {
    e.preventDefault()
    if (!user || !commentText.trim()) return

    setIsSubmittingComment(true)
    try {
      const result = await addComment(
        groupId,
        post.id,
        user.uid,
        user.displayName || 'Anonymous',
        commentText,
        parentCommentId
      )

      if (result.success) {
        setCommentText('')
        setReplyingTo(null)
        setShowComments(true)
        // Auto-expand replies if this was a reply
        if (parentCommentId) {
          setShowReplies((prev) => new Set(prev).add(parentCommentId))
        }
      } else {
        toast.error(result.error || 'Failed to add comment')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const toggleReplies = (commentId: string) => {
    setShowReplies((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return

    const result = await deleteComment(groupId, post.id, commentId)
    if (result.success) {
      toast.success('Comment deleted')
    } else {
      toast.error(result.error || 'Failed to delete comment')
    }
  }

  const handleDeletePost = async () => {
    // Close menu first to prevent race condition
    setShowMenu(false)

    // Use setTimeout to ensure menu closes before confirmation dialog
    setTimeout(async () => {
      if (!confirm('Delete this post? This cannot be undone.')) return

      const result = await deletePost(groupId, post.id)
      if (result.success) {
        toast.success('Post deleted')
        onDeleted?.()
      } else {
        toast.error(result.error || 'Failed to delete post')
      }
    }, 100)
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          {/* Profile Picture Placeholder */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold">
            {post.authorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {post.authorName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(post.createdAt)}
              {post.isEdited && ' • edited'}
            </p>
          </div>
        </div>

        {isAuthor && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 bg-white dark:bg-gray-700 shadow-lg rounded-lg py-1 z-10">
                <button
                  onClick={handleDeletePost}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Text */}
      {post.content && (
        <p className="px-4 pb-3 text-gray-900 dark:text-white whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className={`${post.media.length === 1 ? '' : 'grid grid-cols-2 gap-0.5'}`}>
          {post.media.map((media, index) => (
            <div key={index} className="relative bg-gray-100 dark:bg-gray-900">
              {media.type === 'image' ? (
                <img
                  src={media.url}
                  alt={`Post media ${index + 1}`}
                  className="w-full h-auto object-cover cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => window.open(media.url, '_blank')}
                />
              ) : (
                <video
                  src={media.url}
                  controls
                  className="w-full h-auto object-cover"
                  preload="metadata"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Engagement Summary Bar */}
      <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
        {reactions.length > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              {['like', 'love', 'celebrate', 'support', 'inspire'].map((type) => {
                const hasType = reactions.some((r) => r.type === type)
                if (!hasType) return null
                return (
                  <div
                    key={type}
                    className="w-5 h-5 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700 text-xs"
                  >
                    {type === 'like' && '👍'}
                    {type === 'love' && '❤️'}
                    {type === 'celebrate' && '🎉'}
                    {type === 'support' && '🤝'}
                    {type === 'inspire' && '✨'}
                  </div>
                )
              })}
            </div>
            <span>{reactions.length}</span>
          </div>
        ) : (
          <div />
        )}

        {comments.length > 0 && (
          <button
            onClick={() => setShowComments(!showComments)}
            className="hover:underline"
          >
            {comments.length} comment{comments.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 border-t border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleReaction('like')}
          className={`flex items-center justify-center gap-2 py-2 transition-colors ${
            userReaction
              ? 'text-purple-600 dark:text-purple-400 font-semibold'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          {userReaction?.type === 'like' && <ThumbsUp className="w-4 h-4" />}
          {userReaction?.type === 'love' && <Heart className="w-4 h-4" />}
          {userReaction?.type === 'celebrate' && <Sparkles className="w-4 h-4" />}
          {!userReaction && <ThumbsUp className="w-4 h-4" />}
          <span className="text-sm">
            {userReaction ? userReaction.type.charAt(0).toUpperCase() + userReaction.type.slice(1) : 'Like'}
          </span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center justify-center gap-2 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm">Comment</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 pb-4 space-y-3">
          {/* Comment List */}
          {comments
            .filter((c) => !c.parentCommentId)
            .map((comment) => {
              const replies = comments.filter((c) => c.parentCommentId === comment.id)
              const isExpanded = showReplies.has(comment.id)

              return (
                <div key={comment.id} className="space-y-2">
                  {/* Main Comment */}
                  <div className="flex gap-2">
                    {/* Comment Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {comment.displayName.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1">
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-3 py-2">
                        <div className="flex items-start justify-between">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">
                            {comment.displayName}
                          </p>
                          {user?.uid === comment.userId && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-gray-500 hover:text-red-600 ml-2"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                          {comment.content}
                        </p>
                      </div>

                      {/* Comment Actions */}
                      <div className="flex items-center gap-3 mt-1 ml-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        <span>{formatTimestamp(comment.createdAt)}</span>
                        <button
                          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                          className="hover:underline"
                        >
                          Reply
                        </button>
                        {replies.length > 0 && (
                          <button
                            onClick={() => toggleReplies(comment.id)}
                            className="hover:underline text-purple-600 dark:text-purple-400"
                          >
                            {isExpanded ? 'Hide' : `View ${replies.length}`} {replies.length === 1 ? 'reply' : 'replies'}
                          </button>
                        )}
                      </div>

                      {/* Reply Input for this comment */}
                      {replyingTo === comment.id && (
                        <form onSubmit={(e) => handleAddComment(e, comment.id)} className="flex gap-2 mt-2 ml-3">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                            {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder={`Reply to ${comment.displayName}...`}
                            className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-600 dark:text-white text-sm"
                            disabled={isSubmittingComment}
                            autoFocus
                          />
                          {commentText.trim() && (
                            <button
                              type="submit"
                              disabled={isSubmittingComment}
                              className="text-purple-600 hover:text-purple-700 disabled:opacity-50"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Replies */}
                  {isExpanded && replies.length > 0 && (
                    <div className="ml-10 space-y-2">
                      {replies.map((reply) => (
                        <div key={reply.id} className="flex gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                            {reply.displayName.charAt(0).toUpperCase()}
                          </div>

                          <div className="flex-1">
                            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-3 py-2">
                              <div className="flex items-start justify-between">
                                <p className="font-semibold text-xs text-gray-900 dark:text-white">
                                  {reply.displayName}
                                </p>
                                {user?.uid === reply.userId && (
                                  <button
                                    onClick={() => handleDeleteComment(reply.id)}
                                    className="text-gray-500 hover:text-red-600 ml-2"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                                {reply.content}
                              </p>
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 ml-3">
                              {formatTimestamp(reply.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

          {/* Add Comment Form (top-level only) */}
          {!replyingTo && (
            <form onSubmit={(e) => handleAddComment(e)} className="flex gap-2">
              {/* User Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {user?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>

              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-600 dark:text-white text-sm"
                disabled={isSubmittingComment}
              />
              {commentText.trim() && (
                <button
                  type="submit"
                  disabled={isSubmittingComment}
                  className="text-purple-600 hover:text-purple-700 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  )
}
