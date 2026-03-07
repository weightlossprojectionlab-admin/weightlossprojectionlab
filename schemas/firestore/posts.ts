// Group Posts Schema
// PRD Reference: social_retention_and_group_missions (PRD v1.3.7)
// Social media feed within groups

import { Timestamp } from 'firebase/firestore'

/**
 * Post media attachment
 */
export interface PostMedia {
  type: 'image' | 'video'
  url: string
  thumbnailUrl?: string // For videos
  width?: number
  height?: number
  size?: number // bytes
}

/**
 * Post reaction
 */
export interface PostReaction {
  id: string
  postId: string
  userId: string
  displayName: string
  type: 'like' | 'love' | 'celebrate' | 'support' | 'inspire'
  createdAt: Timestamp | Date
}

/**
 * Post comment
 */
export interface PostComment {
  id: string
  postId: string
  userId: string
  displayName: string
  content: string
  parentCommentId?: string // For threaded replies
  repliesCount?: number
  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
}

/**
 * Group post
 * Firestore path: groups/{groupId}/posts/{postId}
 */
export interface GroupPost {
  id: string
  groupId: string
  authorId: string
  authorName: string

  // Content
  content: string
  media?: PostMedia[]

  // Engagement
  reactionsCount: number
  commentsCount: number

  // Metadata
  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
  isPinned?: boolean
  isEdited?: boolean
}

/**
 * Post creation input
 */
export interface CreatePostInput {
  groupId: string
  authorId: string
  authorName: string
  content: string
  media?: PostMedia[]
}

/**
 * Post update input
 */
export interface UpdatePostInput {
  content?: string
  isPinned?: boolean
}
