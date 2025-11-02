// useGroups Hook
// PRD Reference: social_retention_and_group_missions (PRD v1.3.7)
// Manages group data fetching and operations

import useSWR from 'swr';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import type { Group, GroupMission } from '@/schemas/firestore/groups';
import { logger } from '@/lib/logger'

export interface GroupsData {
  userGroups: Group[];
  availableGroups: Group[];
  groupMissions: GroupMission[];
  loading: boolean;
  error: Error | null;
}

/**
 * Fetch all groups data for a user
 */
async function fetchGroupsData(userId: string): Promise<Omit<GroupsData, 'loading' | 'error'>> {
  try {
    // Fetch user's groups (groups where user is a member)
    const userGroupsSnap = await getDocs(
      query(
        collection(db, 'groups'),
        where('members', 'array-contains', userId),
        orderBy('createdAt', 'desc')
      )
    );
    const userGroups = userGroupsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Group[];

    // Fetch available public groups (not joined)
    const availableGroupsSnap = await getDocs(
      query(
        collection(db, 'groups'),
        where('visibility', '==', 'public'),
        where('status', '==', 'active'),
        orderBy('memberCount', 'desc'),
        limit(20)
      )
    );
    const allPublicGroups = availableGroupsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Group[];

    // Filter out groups user is already a member of
    const userGroupIds = new Set(userGroups.map(g => g.id));
    const availableGroups = allPublicGroups.filter(g => !userGroupIds.has(g.id));

    // Fetch group missions for user's groups
    const groupMissions: GroupMission[] = [];
    for (const group of userGroups) {
      if (group.activeMissionId) {
        const missionDoc = await getDoc(
          doc(db, `groups/${group.id}/missions/${group.activeMissionId}`)
        );
        if (missionDoc.exists()) {
          groupMissions.push({
            ...missionDoc.data(),
            id: missionDoc.id,
          } as unknown as GroupMission);
        }
      }
    }

    return {
      userGroups,
      availableGroups,
      groupMissions,
    };
  } catch (error) {
    logger.error('Error fetching groups data:', error as Error);
    throw error;
  }
}

/**
 * Hook to fetch and manage groups data
 */
export function useGroups(userId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Omit<GroupsData, 'loading' | 'error'>>(
    userId ? `groups-${userId}` : null,
    () => fetchGroupsData(userId!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
    }
  );

  return {
    userGroups: data?.userGroups || [],
    availableGroups: data?.availableGroups || [],
    groupMissions: data?.groupMissions || [],
    loading: isLoading,
    error: error || null,
    refresh: mutate,
  };
}

/**
 * Helper: Get group by ID
 */
export async function getGroupById(groupId: string): Promise<Group | null> {
  try {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) {
      return null;
    }
    return {
      id: groupDoc.id,
      ...groupDoc.data(),
    } as Group;
  } catch (error) {
    logger.error('Error fetching group:', error as Error);
    return null;
  }
}

/**
 * Helper: Check if user is member of a group
 */
export function isUserMember(group: Group, userId: string): boolean {
  return group.memberIds?.includes(userId) || false;
}

/**
 * Helper: Check if group is full
 */
export function isGroupFull(group: Group): boolean {
  const memberCount = group.memberIds?.length || 0;
  const maxMembers = group.maxMembers || 50;
  return memberCount >= maxMembers;
}

/**
 * Helper: Filter groups by search query
 */
export function filterGroups(groups: Group[], searchQuery: string): Group[] {
  if (!searchQuery.trim()) {
    return groups;
  }

  const query = searchQuery.toLowerCase();
  return groups.filter((group) => {
    const name = group.name?.toLowerCase() || '';
    const description = group.description?.toLowerCase() || '';
    const tags = group.tags?.map(t => t.toLowerCase()).join(' ') || '';

    return name.includes(query) || description.includes(query) || tags.includes(query);
  });
}

/**
 * Helper: Sort groups by criteria
 */
export function sortGroups(groups: Group[], sortBy: 'members' | 'recent' | 'name'): Group[] {
  return [...groups].sort((a, b) => {
    switch (sortBy) {
      case 'members':
        const aCount = a.memberIds?.length || 0;
        const bCount = b.memberIds?.length || 0;
        return bCount - aCount;
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'recent':
      default:
        const aTime = a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt
          ? a.createdAt.seconds
          : 0;
        const bTime = b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt
          ? b.createdAt.seconds
          : 0;
        return bTime - aTime;
    }
  });
}
