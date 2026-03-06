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
  onViewGroup?: (groupId: string) => void;
}

export default function GroupsList({
  groups,
  userGroupIds = [],
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
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 border-2 border-dashed border-accent/30 rounded-xl p-12 text-center">
        <div className="text-accent-dark mb-4">
          <svg className="h-20 w-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">No Groups Yet</h3>
        <p className="text-base text-muted-foreground mb-6 max-w-md mx-auto">
          Be a pioneer! Create the first group and start building a supportive community for your weight loss journey.
        </p>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-sm mx-auto mb-6">
          <p className="text-sm font-semibold text-accent-dark mb-2">Group Ideas to Get Started:</p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>🏃 "Morning Warriors" - Early bird exercisers</li>
            <li>🥗 "Keto Crew" - Low-carb lifestyle enthusiasts</li>
            <li>🚶 "Weekend Walkers" - Casual fitness buddies</li>
            <li>💪 "Accountability Partners" - Daily check-ins</li>
          </ul>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Click the "Create Group" button above to start your community
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-border rounded-lg text-sm placeholder-muted-foreground dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-dark focus:border-transparent"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-accent-dark text-white'
                  : 'bg-muted text-foreground hover:bg-gray-200'
              }`}
            >
              All ({groups.length})
            </button>
            <button
              onClick={() => setFilter('my-groups')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'my-groups'
                  ? 'bg-accent-dark text-white'
                  : 'bg-muted text-foreground hover:bg-gray-200'
              }`}
            >
              My Groups ({myGroupsCount})
            </button>
            <button
              onClick={() => setFilter('public')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === 'public'
                  ? 'bg-accent-dark text-white'
                  : 'bg-muted text-foreground hover:bg-gray-200'
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
                onClick={onViewGroup}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery
              ? `No groups found matching "${searchQuery}"`
              : 'No groups found with the selected filter.'}
          </p>
        </div>
      )}
    </div>
  );
}
