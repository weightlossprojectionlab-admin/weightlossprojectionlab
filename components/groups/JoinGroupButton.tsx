// Join Group Button Component
// PRD Reference: social_retention_and_group_missions (PRD v1.3.7)
// Reusable button for joining groups

'use client';

import { useState } from 'react';
import { UserPlusIcon, CheckIcon } from '@heroicons/react/24/outline';

interface JoinGroupButtonProps {
  groupId: string;
  groupName: string;
  isPrivate?: boolean;
  isMember?: boolean;
  isFull?: boolean;
  onJoin?: (groupId: string) => Promise<void> | void;
  className?: string;
}

export default function JoinGroupButton({
  groupId,
  groupName,
  isPrivate = false,
  isMember = false,
  isFull = false,
  onJoin,
  className = ''
}: JoinGroupButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isJoined, setIsJoined] = useState(isMember);

  const handleJoin = async () => {
    if (!onJoin || isLoading || isJoined || isFull) return;

    setIsLoading(true);
    try {
      await onJoin(groupId);
      setIsJoined(true);
    } catch (error) {
      console.error('Failed to join group:', error);
      // Optionally show error toast
    } finally {
      setIsLoading(false);
    }
  };

  if (isJoined) {
    return (
      <button
        disabled
        className={`inline-flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium cursor-default ${className}`}
      >
        <CheckIcon className="h-5 w-5" />
        <span>Member</span>
      </button>
    );
  }

  if (isFull) {
    return (
      <button
        disabled
        className={`inline-flex items-center space-x-2 px-4 py-2 bg-gray-300 text-gray-600 rounded-lg font-medium cursor-not-allowed ${className}`}
      >
        <span>Group Full</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleJoin}
      disabled={isLoading}
      className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
        isLoading
          ? 'bg-blue-400 text-white cursor-wait'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      } ${className}`}
    >
      <UserPlusIcon className="h-5 w-5" />
      <span>
        {isLoading
          ? 'Joining...'
          : isPrivate
          ? 'Request to Join'
          : 'Join Group'}
      </span>
    </button>
  );
}
