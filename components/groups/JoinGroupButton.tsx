// Join Group Button Component
// PRD Reference: social_retention_and_group_missions (PRD v1.3.7)
// Reusable button for joining groups

'use client';

import { useState } from 'react';
import { UserPlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Spinner } from '@/components/ui/Spinner';

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
        className={`inline-flex items-center space-x-2 px-4 py-2 bg-success-light text-success-dark rounded-lg font-medium cursor-default ${className}`}
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
        className={`inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800-dark text-gray-600 dark:text-gray-400 rounded-lg font-medium cursor-not-allowed ${className}`}
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
          ? 'bg-accent-dark text-white cursor-wait'
          : 'bg-accent-dark text-white hover:bg-accent-dark'
      } ${className}`}
    >
      {isLoading ? (
        <Spinner size="sm" />
      ) : (
        <UserPlusIcon className="h-5 w-5" />
      )}
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
