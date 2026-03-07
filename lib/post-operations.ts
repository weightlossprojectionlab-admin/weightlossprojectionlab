// Post Operations Library
// PRD Reference: social_retention_and_group_missions (PRD v1.3.7)
// Backend operations for group social feed

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
  DocumentSnapshot
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import type { GroupPost, PostMedia, PostReaction, PostComment, CreatePostInput } from '@/schemas/firestore/posts'

/**
 * Upload media file to Firebase Storage
 */
async function uploadMedia(
  groupId: string,
  postId: string,
  file: File,
  type: 'image' | 'video'
): Promise<PostMedia> {
  try {
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name}`
    const storagePath = `groups/${groupId}/posts/${postId}/${filename}`
    const storageRef = ref(storage, storagePath)

    logger.info('[PostOps] Uploading media', { groupId, postId, filename, type })

    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
    })

    const url = await getDownloadURL(snapshot.ref)

    // For videos, we could generate thumbnail later
    const media: PostMedia = {
      type,
      url,
      size: file.size,
    }

    logger.info('[PostOps] Media uploaded successfully', { url })
    return media
  } catch (error) {
    logger.error('[PostOps] Error uploading media', error as Error)
    throw error
  }
}

/**
 * Create a new post
 */
export async function createPost(
  input: CreatePostInput,
  files?: File[]
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    logger.info('[PostOps] Creating post', { groupId: input.groupId, authorId: input.authorId })

    // Validate content
    if (!input.content.trim() && (!files || files.length === 0)) {
      return { success: false, error: 'Post must have content or media' }
    }

    // Create post document first (to get ID for media upload)
    const postRef = await addDoc(collection(db, `groups/${input.groupId}/posts`), {
      groupId: input.groupId,
      authorId: input.authorId,
      authorName: input.authorName,
      content: input.content.trim(),
      reactionsCount: 0,
      commentsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isPinned: false,
      isEdited: false,
    })

    const postId = postRef.id

    // Upload media if provided
    let media: PostMedia[] | undefined
    if (files && files.length > 0) {
      media = []
      for (const file of files) {
        const type = file.type.startsWith('image/') ? 'image' : 'video'
        const uploadedMedia = await uploadMedia(input.groupId, postId, file, type)
        media.push(uploadedMedia)
      }

      // Update post with media URLs
      await updateDoc(postRef, { media })
    }

    logger.info('[PostOps] Post created successfully', { postId })
    return { success: true, postId }
  } catch (error) {
    logger.error('[PostOps] Error creating post', error as Error)
    return { success: false, error: 'Failed to create post' }
  }
}

/**
 * Update a post
 */
export async function updatePost(
  groupId: string,
  postId: string,
  updates: { content?: string; isPinned?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[PostOps] Updating post', { groupId, postId })

    const postRef = doc(db, `groups/${groupId}/posts`, postId)
    await updateDoc(postRef, {
      ...updates,
      updatedAt: serverTimestamp(),
      isEdited: updates.content ? true : undefined,
    })

    logger.info('[PostOps] Post updated successfully', { postId })
    return { success: true }
  } catch (error) {
    logger.error('[PostOps] Error updating post', error as Error)
    return { success: false, error: 'Failed to update post' }
  }
}

/**
 * Delete a post
 */
export async function deletePost(
  groupId: string,
  postId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[PostOps] Deleting post', { groupId, postId })

    // Get post to delete media
    const postRef = doc(db, `groups/${groupId}/posts`, postId)
    const postSnap = await getDoc(postRef)

    if (postSnap.exists()) {
      const post = postSnap.data() as GroupPost

      // Delete media from storage
      if (post.media && post.media.length > 0) {
        for (const media of post.media) {
          try {
            const mediaRef = ref(storage, media.url)
            await deleteObject(mediaRef)
          } catch (error) {
            logger.warn('[PostOps] Failed to delete media', { url: media.url })
          }
        }
      }
    }

    // Delete post document
    await deleteDoc(postRef)

    logger.info('[PostOps] Post deleted successfully', { postId })
    return { success: true }
  } catch (error) {
    logger.error('[PostOps] Error deleting post', error as Error)
    return { success: false, error: 'Failed to delete post' }
  }
}

/**
 * Add reaction to post
 */
export async function addReaction(
  groupId: string,
  postId: string,
  userId: string,
  displayName: string,
  type: PostReaction['type']
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[PostOps] Adding reaction', { groupId, postId, userId, type })

    // Check if user already reacted
    const existingReactions = await getDocs(
      query(
        collection(db, `groups/${groupId}/posts/${postId}/reactions`),
        where('userId', '==', userId)
      )
    )

    // If already reacted, update the reaction type
    if (!existingReactions.empty) {
      const reactionDoc = existingReactions.docs[0]
      await updateDoc(reactionDoc.ref, {
        type,
        createdAt: serverTimestamp(),
      })
      logger.info('[PostOps] Reaction updated', { postId, userId })
      return { success: true }
    }

    // Create new reaction
    await addDoc(collection(db, `groups/${groupId}/posts/${postId}/reactions`), {
      postId,
      userId,
      displayName,
      type,
      createdAt: serverTimestamp(),
    })

    // Increment reaction count
    const postRef = doc(db, `groups/${groupId}/posts`, postId)
    await updateDoc(postRef, {
      reactionsCount: increment(1),
    })

    logger.info('[PostOps] Reaction added successfully', { postId, userId })
    return { success: true }
  } catch (error) {
    logger.error('[PostOps] Error adding reaction', error as Error)
    return { success: false, error: 'Failed to add reaction' }
  }
}

/**
 * Remove reaction from post
 */
export async function removeReaction(
  groupId: string,
  postId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[PostOps] Removing reaction', { groupId, postId, userId })

    const reactionsQuery = query(
      collection(db, `groups/${groupId}/posts/${postId}/reactions`),
      where('userId', '==', userId)
    )
    const reactionsSnap = await getDocs(reactionsQuery)

    if (reactionsSnap.empty) {
      return { success: false, error: 'Reaction not found' }
    }

    // Delete reaction
    await deleteDoc(reactionsSnap.docs[0].ref)

    // Decrement reaction count
    const postRef = doc(db, `groups/${groupId}/posts`, postId)
    await updateDoc(postRef, {
      reactionsCount: increment(-1),
    })

    logger.info('[PostOps] Reaction removed successfully', { postId, userId })
    return { success: true }
  } catch (error) {
    logger.error('[PostOps] Error removing reaction', error as Error)
    return { success: false, error: 'Failed to remove reaction' }
  }
}

/**
 * Add comment to post (or reply to comment)
 */
export async function addComment(
  groupId: string,
  postId: string,
  userId: string,
  displayName: string,
  content: string,
  parentCommentId?: string
): Promise<{ success: boolean; commentId?: string; error?: string }> {
  try {
    logger.info('[PostOps] Adding comment', { groupId, postId, userId, parentCommentId })

    if (!content.trim()) {
      return { success: false, error: 'Comment cannot be empty' }
    }

    // Create comment
    const commentData: any = {
      postId,
      userId,
      displayName,
      content: content.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    if (parentCommentId) {
      commentData.parentCommentId = parentCommentId
      commentData.repliesCount = 0
    } else {
      commentData.repliesCount = 0
    }

    const commentRef = await addDoc(
      collection(db, `groups/${groupId}/posts/${postId}/comments`),
      commentData
    )

    // Increment comment count on post
    const postRef = doc(db, `groups/${groupId}/posts`, postId)
    await updateDoc(postRef, {
      commentsCount: increment(1),
    })

    // If this is a reply, increment repliesCount on parent comment
    if (parentCommentId) {
      const parentCommentRef = doc(
        db,
        `groups/${groupId}/posts/${postId}/comments`,
        parentCommentId
      )
      await updateDoc(parentCommentRef, {
        repliesCount: increment(1),
      })
    }

    logger.info('[PostOps] Comment added successfully', { commentId: commentRef.id })
    return { success: true, commentId: commentRef.id }
  } catch (error) {
    logger.error('[PostOps] Error adding comment', error as Error)
    return { success: false, error: 'Failed to add comment' }
  }
}

/**
 * Delete comment
 */
export async function deleteComment(
  groupId: string,
  postId: string,
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[PostOps] Deleting comment', { groupId, postId, commentId })

    const commentRef = doc(db, `groups/${groupId}/posts/${postId}/comments`, commentId)
    await deleteDoc(commentRef)

    // Decrement comment count
    const postRef = doc(db, `groups/${groupId}/posts`, postId)
    await updateDoc(postRef, {
      commentsCount: increment(-1),
    })

    logger.info('[PostOps] Comment deleted successfully', { commentId })
    return { success: true }
  } catch (error) {
    logger.error('[PostOps] Error deleting comment', error as Error)
    return { success: false, error: 'Failed to delete comment' }
  }
}

/**
 * Fetch posts for a group (with pagination)
 */
export async function fetchPosts(
  groupId: string,
  limitCount: number = 20,
  lastDoc?: DocumentSnapshot
): Promise<{ posts: GroupPost[]; lastDoc: DocumentSnapshot | null }> {
  try {
    logger.info('[PostOps] Fetching posts', { groupId, limitCount })

    let postsQuery = query(
      collection(db, `groups/${groupId}/posts`),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )

    if (lastDoc) {
      postsQuery = query(postsQuery, startAfter(lastDoc))
    }

    const postsSnap = await getDocs(postsQuery)

    const posts = postsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as GroupPost[]

    const lastVisible = postsSnap.docs[postsSnap.docs.length - 1] || null

    logger.info('[PostOps] Fetched posts successfully', { count: posts.length })
    return { posts, lastDoc: lastVisible }
  } catch (error) {
    logger.error('[PostOps] Error fetching posts', error as Error)
    throw error
  }
}
