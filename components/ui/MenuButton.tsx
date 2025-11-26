'use client'

import { Bars3Icon } from '@heroicons/react/24/outline'
import { useMenu } from '@/contexts/MenuContext'

interface MenuButtonProps {
  className?: string
  showLabel?: boolean
}

/**
 * Hamburger menu button
 * Opens the app menu drawer
 */
export function MenuButton({ className = '', showLabel = false }: MenuButtonProps) {
  const { toggleMenu } = useMenu()

  return (
    <button
      type="button"
      onClick={toggleMenu}
      className={`flex items-center gap-2 p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:text-white transition-colors ${className}`}
      aria-label="Open menu"
    >
      <Bars3Icon className="h-6 w-6" />
      {showLabel && <span className="text-sm font-medium">Menu</span>}
    </button>
  )
}
