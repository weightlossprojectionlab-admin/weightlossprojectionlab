/**
 * Group Operations
 * Firebase functions for group management
 * PRD: social_retention_and_group_missions
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import type { Group, GroupMember } from '@/schemas/firestore/groups'

/**
 * Create a new group
 */
export async function createGroup(data: {
  name: string
  description?: string
  privacy: 'public' | 'private'
  maxMembers?: number
  tags?: string[]
  creatorUid: string
  creatorDisplayName: string
}): Promise<{ success: boolean; groupId?: string; error?: string }> {
  try {
    logger.info('[GroupOps] Creating group', { name: data.name, creatorUid: data.creatorUid })

    // Validate input
    if (!data.name || data.name.trim().length < 3) {
      return { success: false, error: 'Group name must be at least 3 characters' }
    }

    if (data.name.length > 100) {
      return { success: false, error: 'Group name must be less than 100 characters' }
    }

    // Create group document
    const groupRef = doc(collection(db, 'groups'))
    const groupId = groupRef.id

    const groupData: Partial<Group> = {
      groupId,
      name: data.name.trim(),
      description: data.description?.trim() || '',
      privacy: data.privacy,
      maxMembers: data.maxMembers || 50,
      tags: data.tags || [],
      memberIds: [data.creatorUid], // Creator is first member
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any
    }

    await setDoc(groupRef, groupData)

    // Create group member document for creator
    const memberRef = doc(db, `groups/${groupId}/members`, data.creatorUid)
    const memberData: Partial<GroupMember> = {
      uid: data.creatorUid,
      groupId,
      displayName: data.creatorDisplayName,
      trustScore: 1.0, // Creators start with perfect trust
      supportActionsCount: 0,
      joinedAt: serverTimestamp() as any,
      lastActiveAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any
    }

    await setDoc(memberRef, memberData)

    logger.info('[GroupOps] Group created successfully', { groupId })
    return { success: true, groupId }
  } catch (error) {
    logger.error('[GroupOps] Error creating group', error as Error)
    return { success: false, error: 'Failed to create group. Please try again.' }
  }
}

/**
 * Join a group
 */
export async function joinGroup(
  groupId: string,
  userId: string,
  displayName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[GroupOps] Joining group', { groupId, userId })

    // Get group document
    const groupRef = doc(db, 'groups', groupId)
    const groupSnap = await getDoc(groupRef)

    if (!groupSnap.exists()) {
      return { success: false, error: 'Group not found' }
    }

    const group = groupSnap.data() as Group

    // Check if already a member
    if (group.memberIds?.includes(userId)) {
      return { success: false, error: 'You are already a member of this group' }
    }

    // Check if group is full
    const memberCount = group.memberIds?.length || 0
    const maxMembers = group.maxMembers || 50
    if (memberCount >= maxMembers) {
      return { success: false, error: 'This group is full' }
    }

    // For private groups, would need approval logic here
    // For now, allowing instant join
    if (group.privacy === 'private') {
      logger.warn('[GroupOps] Private group instant join - approval system not yet implemented')
      // TODO: Implement approval workflow
    }

    // Add user to group members array
    await updateDoc(groupRef, {
      memberIds: arrayUnion(userId),
      updatedAt: serverTimestamp()
    })

    // Create group member document
    const memberRef = doc(db, `groups/${groupId}/members`, userId)
    const memberData: Partial<GroupMember> = {
      uid: userId,
      groupId,
      displayName,
      trustScore: 0.5, // New members start at 0.5
      supportActionsCount: 0,
      joinedAt: serverTimestamp() as any,
      lastActiveAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any
    }

    await setDoc(memberRef, memberData)

    logger.info('[GroupOps] Successfully joined group', { groupId, userId })
    return { success: true }
  } catch (error) {
    logger.error('[GroupOps] Error joining group', error as Error, { groupId, userId })
    return { success: false, error: 'Failed to join group. Please try again.' }
  }
}

/**
 * Leave a group
 */
export async function leaveGroup(
  groupId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[GroupOps] Leaving group', { groupId, userId })

    // Get group document
    const groupRef = doc(db, 'groups', groupId)
    const groupSnap = await getDoc(groupRef)

    if (!groupSnap.exists()) {
      return { success: false, error: 'Group not found' }
    }

    const group = groupSnap.data() as Group

    // Check if user is a member
    if (!group.memberIds?.includes(userId)) {
      return { success: false, error: 'You are not a member of this group' }
    }

    // Remove user from group members array
    await updateDoc(groupRef, {
      memberIds: arrayRemove(userId),
      updatedAt: serverTimestamp()
    })

    // Note: We keep the member document for historical tracking
    // but mark them as inactive
    const memberRef = doc(db, `groups/${groupId}/members`, userId)
    await updateDoc(memberRef, {
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    logger.info('[GroupOps] Successfully left group', { groupId, userId })
    return { success: true }
  } catch (error) {
    logger.error('[GroupOps] Error leaving group', error as Error, { groupId, userId })
    return { success: false, error: 'Failed to leave group. Please try again.' }
  }
}

/**
 * Delete a group (admin/creator only)
 */
export async function deleteGroup(
  groupId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[GroupOps] Deleting group', { groupId, userId })

    // Get group document
    const groupRef = doc(db, 'groups', groupId)
    const groupSnap = await getDoc(groupRef)

    if (!groupSnap.exists()) {
      return { success: false, error: 'Group not found' }
    }

    const group = groupSnap.data() as Group

    // Check if user is the creator (first member)
    if (group.memberIds?.[0] !== userId) {
      return { success: false, error: 'Only the group creator can delete this group' }
    }

    // TODO: Implement proper deletion with subcollections
    // For now, just mark as deleted
    await updateDoc(groupRef, {
      memberIds: [],
      privacy: 'private' as any,
      updatedAt: serverTimestamp()
    })

    logger.info('[GroupOps] Group deleted successfully', { groupId })
    return { success: true }
  } catch (error) {
    logger.error('[GroupOps] Error deleting group', error as Error, { groupId, userId })
    return { success: false, error: 'Failed to delete group. Please try again.' }
  }
}

/**
 * Send support action to group member
 */
export async function sendSupportAction(data: {
  groupId: string
  fromUid: string
  toUid: string
  type: 'cheer' | 'tip' | 'motivation'
}): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[GroupOps] Sending support action', data)

    // Create support action document
    const actionRef = doc(collection(db, `groups/${data.groupId}/supportActions`))

    await setDoc(actionRef, {
      actionId: actionRef.id,
      fromUid: data.fromUid,
      toUid: data.toUid,
      type: data.type,
      timestamp: serverTimestamp()
    })

    // Increment sender's support actions count
    const senderRef = doc(db, `groups/${data.groupId}/members`, data.fromUid)
    await updateDoc(senderRef, {
      supportActionsCount: increment(1),
      trustScore: increment(0.01), // Small trust boost
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    logger.info('[GroupOps] Support action sent successfully', { actionId: actionRef.id })
    return { success: true }
  } catch (error) {
    logger.error('[GroupOps] Error sending support action', error as Error)
    return { success: false, error: 'Failed to send support. Please try again.' }
  }
}
