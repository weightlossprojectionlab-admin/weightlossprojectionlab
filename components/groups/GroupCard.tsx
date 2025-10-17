// Group Card Component
// PRD Reference: social_retention_and_group_missions (PRD v1.3.7)
// Displays individual group information

'use client';

import { UsersIcon, LockClosedIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import type { Group } from '@/schemas/firestore/groups';

interface GroupCardProps {
  group: Group;
  isMember?: boolean;
  onJoin?: (groupId: string) => void;
  onLeave?: (groupId: string) => void;
  onClick?: (groupId: string) => void;
}

export default function GroupCard({ group, isMember = false, onJoin, onLeave, onClick }: GroupCardProps) {
  const memberCount = group.memberIds?.length || 0;
  const maxMembers = group.maxMembers || 50;
  const isFull = memberCount >= maxMembers;
  const isPrivate = group.privacy === 'private';

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all cursor-pointer"
      onClick={() => onClick?.(group.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-bold text-gray-900">{group.name}</h3>
            {isPrivate ? (
              <LockClosedIcon className="h-4 w-4 text-gray-500" title="Private Group" />
            ) : (
              <GlobeAltIcon className="h-4 w-4 text-gray-500" title="Public Group" />
            )}
          </div>
          {group.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{group.description}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
        <div className="flex items-center space-x-1">
          <UsersIcon className="h-4 w-4" />
          <span>{memberCount} / {maxMembers} members</span>
        </div>
        {group.createdAt && (
          <span className="text-xs">
            Created {new Date(group.createdAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Mission Info */}
      {group.activeMissionId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">
            Active Mission
          </div>
          <div className="text-sm text-blue-800">
            Group mission in progress
          </div>
        </div>
      )}

      {/* Member Status Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isFull ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min((memberCount / maxMembers) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        {isMember ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick?.(group.id);
              }}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              View Group
            </button>
            {onLeave && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLeave(group.id);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Leave
              </button>
            )}
          </>
        ) : (
          <>
            {onJoin && !isFull ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin(group.id);
                }}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                {isPrivate ? 'Request to Join' : 'Join Group'}
              </button>
            ) : isFull ? (
              <button
                disabled
                className="flex-1 bg-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
              >
                Group Full
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.(group.id);
                }}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                View Details
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
