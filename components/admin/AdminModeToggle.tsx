'use client'

import { useState } from 'react'
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/outline'

interface AdminModeToggleProps {
  isAdminMode: boolean
  onToggle: (enabled: boolean) => void
}

export function AdminModeToggle({ isAdminMode, onToggle }: AdminModeToggleProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleToggle = () => {
    setIsAnimating(true)
    onToggle(!isAdminMode)
    setTimeout(() => setIsAnimating(false), 300)
  }

  return (
    <button
      onClick={handleToggle}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
        ${isAnimating ? 'scale-95' : 'scale-100'}
        ${
          isAdminMode
            ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }
      `}
    >
      {isAdminMode ? (
        <>
          <LockOpenIcon className="h-5 w-5" />
          <span>Exit Admin Mode</span>
        </>
      ) : (
        <>
          <LockClosedIcon className="h-5 w-5" />
          <span>Enter Admin Mode</span>
        </>
      )}
    </button>
  )
}
