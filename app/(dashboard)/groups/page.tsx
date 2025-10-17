// Groups Dashboard Page
// PRD Reference: social_retention_and_group_missions (PRD v1.3.7)

'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import GroupsList from '@/components/groups/GroupsList';
import { PlusIcon } from '@heroicons/react/24/outline';

// TODO: Create useGroups hook similar to useMissions
// For now, using mock data structure

export default function GroupsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Replace with actual useGroups hook
  const groups: any[] = [];
  const userGroupIds: string[] = [];
  const error = null;

  const handleJoinGroup = async (groupId: string) => {
    console.log('Join group:', groupId);
    // TODO: Implement Firebase function to join group
  };

  const handleLeaveGroup = async (groupId: string) => {
    console.log('Leave group:', groupId);
    // TODO: Implement Firebase function to leave group
  };

  const handleViewGroup = (groupId: string) => {
    console.log('View group:', groupId);
    // TODO: Navigate to group detail page
  };

  const handleCreateGroup = () => {
    console.log('Create new group');
    // TODO: Open create group modal or navigate to create page
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading groups...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Groups</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Groups</h1>
          <p className="text-gray-600 mt-1">Join groups to connect with others and complete missions together</p>
        </div>
        <button
          onClick={handleCreateGroup}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Create Group</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">My Groups</div>
          <div className="text-2xl font-bold text-gray-900">{userGroupIds.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Total Groups</div>
          <div className="text-2xl font-bold text-gray-900">{groups.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Public Groups</div>
          <div className="text-2xl font-bold text-gray-900">
            {groups.filter(g => g.privacy === 'public').length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Total Members</div>
          <div className="text-2xl font-bold text-gray-900">
            {groups.reduce((sum, g) => sum + (g.memberIds?.length || 0), 0)}
          </div>
        </div>
      </div>

      {/* Groups List */}
      <GroupsList
        groups={groups}
        userGroupIds={userGroupIds}
        onJoinGroup={handleJoinGroup}
        onLeaveGroup={handleLeaveGroup}
        onViewGroup={handleViewGroup}
      />

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">About Groups</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Join groups to connect with others on similar weight loss journeys</li>
          <li>• Complete group missions to earn bonus XP</li>
          <li>• Private groups require approval to join</li>
          <li>• Group admins can create custom missions for their members</li>
        </ul>
      </div>
    </div>
  );
}
