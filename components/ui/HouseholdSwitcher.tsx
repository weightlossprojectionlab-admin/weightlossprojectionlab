'use client'

/**
 * HouseholdSwitcher Component
 *
 * Dropdown to switch between multiple households
 * Shows in page header when user has 2+ households
 */

import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { HomeIcon, CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { useHousehold } from '@/contexts/HouseholdContext'

export function HouseholdSwitcher() {
  const { activeHousehold, households, setActiveHousehold, hasHouseholds } = useHousehold()

  // Don't show if user has 0 or 1 households
  if (!hasHouseholds || households.length < 2) {
    return null
  }

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted-dark transition-colors text-sm font-medium text-foreground">
        <HomeIcon className="w-4 h-4" />
        <span className="hidden sm:inline truncate max-w-[150px]">
          {activeHousehold?.name || 'Select Household'}
        </span>
        <ChevronDownIcon className="w-4 h-4" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-72 origin-top-right rounded-lg bg-card shadow-lg ring-1 ring-border focus:outline-none z-50">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Switch Household
            </div>
            <div className="space-y-1">
              {households.map((household) => (
                <Menu.Item key={household.id}>
                  {({ active }) => (
                    <button
                      onClick={() => setActiveHousehold(household)}
                      className={`
                        w-full flex items-start gap-3 px-3 py-2 rounded-md transition-colors text-left
                        ${active ? 'bg-muted' : ''}
                        ${household.id === activeHousehold?.id ? 'bg-primary/10' : ''}
                      `}
                    >
                      <HomeIcon className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground truncate">
                            {household.name}
                          </span>
                          {household.id === activeHousehold?.id && (
                            <CheckIcon className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        {household.nickname && (
                          <span className="text-xs text-muted-foreground truncate block">
                            {household.nickname}
                          </span>
                        )}
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <span>{household.memberIds.length} members</span>
                          {household.kitchenConfig?.hasSharedInventory && (
                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
                              Shared
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )}
                </Menu.Item>
              ))}
            </div>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}
