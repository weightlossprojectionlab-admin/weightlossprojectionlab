// Groups List Component
// PRD Reference: social_retention_and_group_missions (PRD v1.3.7)
// Displays list of groups with search and filtering

'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import GroupCard from './GroupCard';
import type { Group } from '@/schemas/firestore/groups';

interface GroupsListProps {
  groups: Group[];
  userGroupIds?: string[];
  onJoinGroup?: (groupId: string) => void;
  onLeaveGroup?: (groupId: string) => void;
  onViewGroup?: (groupId: string) => void;
}

export default function GroupsList({
  groups,
  userGroupIds = [],
  onJoinGroup,
  onLeaveGroup,
  onViewGroup
}: GroupsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'my-groups' | 'public'>('all');

  // Filter groups
  const filteredGroups = groups.filter(group => {
    // Search filter
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (group.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    if (!matchesSearch) return false;

    // Type filter
    const groupId = group.id || group.groupId;
    if (filter === 'my-groups') {
      return userGroupIds.includes(groupId);
    } else if (filter === 'public') {
      return group.privacy === 'public';
    }

    return true;
  });

  const myGroupsCount = groups.filter(g => userGroupIds.includes(g.id || g.groupId)).length;
  const publicGroupsCount = groups.filter(g => g.privacy === 'public').length;

  if (groups.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <div className="text-gray-400 mb-3">
          <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Groups Available</h3>
        <p className="text-sm text-gray-600">Be the first to create a group!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({groups.length})
            </button>
            <button
              onClick={() => setFilter('my-groups')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'my-groups'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              My Groups ({myGroupsCount})
            </button>
            <button
              onClick={() => setFilter('public')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'public'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Public ({publicGroupsCount})
            </button>
          </div>
        </div>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => {
            const groupId = group.id || group.groupId;
            return (
              <GroupCard
                key={groupId}
                group={group}
                isMember={userGroupIds.includes(groupId)}
                onJoin={onJoinGroup}
                onLeave={onLeaveGroup}
                onClick={onViewGroup}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">
            {searchQuery
              ? `No groups found matching "${searchQuery}"`
              : 'No groups found with the selected filter.'}
          </p>
        </div>
      )}
    </div>
  );
}
