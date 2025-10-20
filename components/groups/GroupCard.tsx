// Group Card Component
// PRD Reference: social_retention_and_group_missions (PRD v1.3.7)
// Displays individual group information

'use client';

import { UsersIcon, LockClosedIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { formatTimestamp } from '@/lib/timestamp';
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
  const groupIdToUse = group.id || group.groupId;

  return (
    <div
      className="bg-card border border-border rounded-lg p-5 hover:shadow-lg transition-all cursor-pointer"
      onClick={() => onClick?.(groupIdToUse)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-bold text-foreground">{group.name}</h3>
            {isPrivate ? (
              <LockClosedIcon className="h-4 w-4 text-muted-foreground" title="Private Group" />
            ) : (
              <GlobeAltIcon className="h-4 w-4 text-muted-foreground" title="Public Group" />
            )}
          </div>
          {group.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center space-x-4 mb-4 text-sm text-muted-foreground">
        <div className="flex items-center space-x-1">
          <UsersIcon className="h-4 w-4" />
          <span>{memberCount} / {maxMembers} members</span>
        </div>
        {group.createdAt && (
          <span className="text-xs">
            Created {formatTimestamp(group.createdAt)}
          </span>
        )}
      </div>

      {/* Mission Info */}
      {group.activeMissionId && (
        <div className="bg-accent-light border border-accent rounded-lg p-3 mb-4">
          <div className="text-xs font-semibold text-accent-dark uppercase tracking-wide mb-1">
            Active Mission
          </div>
          <div className="text-sm text-accent-dark">
            Group mission in progress
          </div>
        </div>
      )}

      {/* Member Status Bar */}
      <div className="mb-4">
        <div className="w-full bg-muted-dark rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isFull ? 'bg-error-dark' : 'bg-success'
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
                onClick?.(groupIdToUse);
              }}
              className="flex-1 bg-accent-dark text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors"
            >
              View Group
            </button>
            {onLeave && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLeave(groupIdToUse);
                }}
                className="px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors"
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
                  onJoin(groupIdToUse);
                }}
                className="flex-1 bg-success text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-success-dark transition-colors"
              >
                {isPrivate ? 'Request to Join' : 'Join Group'}
              </button>
            ) : isFull ? (
              <button
                disabled
                className="flex-1 bg-muted-dark text-muted-foreground px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
              >
                Group Full
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.(groupIdToUse);
                }}
                className="flex-1 bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted-dark transition-colors"
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
