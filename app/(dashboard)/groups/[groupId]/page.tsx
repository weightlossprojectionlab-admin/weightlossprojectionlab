'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { joinGroup, leaveGroup, sendSupportAction } from '@/lib/group-operations'
import { logger } from '@/lib/logger'
import type { Group, GroupMember } from '@/schemas/firestore/groups'
import { ArrowLeft, Users, Lock, Globe, Crown, Heart, Sparkles, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function GroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const groupId = params.groupId as string

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  const isMember = user && group?.memberIds?.includes(user.uid)
  const isCreator = user && group?.memberIds?.[0] === user.uid

  useEffect(() => {
    if (!user || !groupId) return

    const fetchGroupData = async () => {
      try {
        setIsLoading(true)

        // Fetch group
        const groupRef = doc(db, 'groups', groupId)
        const groupSnap = await getDoc(groupRef)

        if (!groupSnap.exists()) {
          logger.error('[GroupDetail] Group not found or no permission', { groupId })
          toast.error('Group not found or you do not have permission to view it')
          router.push('/groups')
          return
        }

        const groupData = { id: groupSnap.id, ...groupSnap.data() } as Group
        setGroup(groupData)

        // Fetch members only if user is a member
        if (groupData.memberIds?.includes(user.uid)) {
          const membersRef = collection(db, `groups/${groupId}/members`)
          const membersQuery = query(membersRef, orderBy('joinedAt', 'asc'), limit(50))
          const membersSnap = await getDocs(membersQuery)

          const membersData = membersSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as GroupMember[]

          setMembers(membersData)
        }

        logger.info('[GroupDetail] Fetched group data', {
          groupId,
          memberCount: members.length
        })
      } catch (error) {
        const err = error as any
        logger.error('[GroupDetail] Error fetching group', error as Error, {
          code: err?.code,
          message: err?.message
        })
        toast.error(err?.message || 'Failed to load group')
      } finally {
        setIsLoading(false)
      }
    }

    fetchGroupData()
  }, [user, groupId, router])

  const handleJoin = async () => {
    if (!user || !group) return

    setIsJoining(true)
    try {
      const result = await joinGroup(
        group.groupId,
        user.uid,
        user.displayName || 'Anonymous'
      )

      if (result.success) {
        toast.success('Joined group successfully!')
        // Refresh page data
        window.location.reload()
      } else {
        toast.error(result.error || 'Failed to join group')
      }
    } catch (error) {
      logger.error('[GroupDetail] Error joining group', error as Error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeave = async () => {
    if (!user || !group) return

    if (
      !confirm(
        'Are you sure you want to leave this group? You can rejoin later if the group is public.'
      )
    ) {
      return
    }

    setIsLeaving(true)
    try {
      const result = await leaveGroup(group.groupId, user.uid)

      if (result.success) {
        toast.success('Left group successfully')
        router.push('/groups')
      } else {
        toast.error(result.error || 'Failed to leave group')
      }
    } catch (error) {
      logger.error('[GroupDetail] Error leaving group', error as Error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLeaving(false)
    }
  }

  const handleSendSupport = async (toUid: string, type: 'cheer' | 'tip' | 'motivation') => {
    if (!user || !group) return

    try {
      const result = await sendSupportAction({
        groupId: group.groupId,
        fromUid: user.uid,
        toUid,
        type
      })

      if (result.success) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} sent!`)
      } else {
        toast.error(result.error || 'Failed to send support')
      }
    } catch (error) {
      logger.error('[GroupDetail] Error sending support', error as Error)
      toast.error('An unexpected error occurred')
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600 dark:text-gray-400">Please log in to view groups</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading group...</p>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600 dark:text-gray-400">Group not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        {/* Group Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {group.name}
                </h1>
                {group.privacy === 'private' ? (
                  <Lock className="w-5 h-5 text-gray-500" />
                ) : (
                  <Globe className="w-5 h-5 text-gray-500" />
                )}
              </div>

              {group.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {group.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>
                    {group.memberIds?.length || 0} / {group.maxMembers || 50} members
                  </span>
                </div>
              </div>

              {group.tags && group.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {group.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="ml-4">
              {isMember ? (
                <button
                  onClick={handleLeave}
                  disabled={isLeaving}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  {isLeaving ? 'Leaving...' : 'Leave Group'}
                </button>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {isJoining ? 'Joining...' : 'Join Group'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Members List */}
        {isMember && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Members
            </h2>

            {members.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No members yet</p>
            ) : (
              <div className="space-y-3">
                {members.map((member, index) => (
                  <div
                    key={member.uid}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {index === 0 && (
                        <Crown className="w-5 h-5 text-yellow-500" title="Creator" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.displayName}
                          {member.uid === user?.uid && (
                            <span className="ml-2 text-xs text-gray-500">(You)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Trust Score: {member.trustScore?.toFixed(2) || '0.50'} •
                          Support Actions: {member.supportActionsCount || 0}
                        </p>
                      </div>
                    </div>

                    {member.uid !== user?.uid && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSendSupport(member.uid, 'cheer')}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                          title="Send Cheer"
                        >
                          <Heart className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleSendSupport(member.uid, 'motivation')}
                          className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
                          title="Send Motivation"
                        >
                          <Sparkles className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleSendSupport(member.uid, 'tip')}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                          title="Send Tip"
                        >
                          <TrendingUp className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Non-members view */}
        {!isMember && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Join this group to see members and participate in missions
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
