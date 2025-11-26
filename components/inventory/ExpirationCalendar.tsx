'use client'

/**
 * Expiration Calendar Component
 *
 * Visual calendar showing items expiring soon
 * Features:
 * - Month view with expiring items per day
 * - Color coding: expired (red), expiring soon (yellow), fresh (green)
 * - Click day to see all expiring items
 * - Quick actions: use now, extend expiration, mark as used
 */

import { useState, useMemo } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon } from '@heroicons/react/24/outline'
import type { ShoppingItem } from '@/types/shopping'
import { getCategoryMetadata } from '@/lib/product-categories'

interface ExpirationCalendarProps {
  items: ShoppingItem[]
  onItemClick?: (item: ShoppingItem) => void
  className?: string
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  expiringItems: ShoppingItem[]
  status: 'expired' | 'expiring-soon' | 'expiring-later' | 'none'
}

export function ExpirationCalendar({
  items,
  onItemClick,
  className = ''
}: ExpirationCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)

  // Filter items with expiration dates
  const itemsWithExpiration = useMemo(() => {
    return items.filter(item => item.inStock && item.expiresAt)
  }, [items])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // First day of the month
    const firstDay = new Date(year, month, 1)
    const firstDayOfWeek = firstDay.getDay() // 0 = Sunday

    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()

    // Previous month padding
    const prevMonthDays = firstDayOfWeek
    const prevMonth = new Date(year, month, 0)
    const prevMonthLastDay = prevMonth.getDate()

    const days: CalendarDay[] = []
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    // Add previous month days
    for (let i = prevMonthLastDay - prevMonthDays + 1; i <= prevMonthLastDay; i++) {
      const date = new Date(year, month - 1, i)
      days.push({
        date,
        isCurrentMonth: false,
        expiringItems: getItemsExpiringOnDate(date),
        status: 'none'
      })
    }

    // Add current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i)
      const expiringItems = getItemsExpiringOnDate(date)
      const status = getDateStatus(date, expiringItems, now)

      days.push({
        date,
        isCurrentMonth: true,
        expiringItems,
        status
      })
    }

    // Add next month days to complete the grid
    const remainingDays = 42 - days.length // 6 rows × 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i)
      days.push({
        date,
        isCurrentMonth: false,
        expiringItems: getItemsExpiringOnDate(date),
        status: 'none'
      })
    }

    return days
  }, [currentDate, itemsWithExpiration])

  /**
   * Get items expiring on a specific date
   */
  function getItemsExpiringOnDate(date: Date): ShoppingItem[] {
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)

    return itemsWithExpiration.filter(item => {
      if (!item.expiresAt) return false
      const expiryDate = new Date(item.expiresAt)
      expiryDate.setHours(0, 0, 0, 0)
      return expiryDate.getTime() === targetDate.getTime()
    })
  }

  /**
   * Get status for a date
   */
  function getDateStatus(date: Date, expiringItems: ShoppingItem[], now: Date): CalendarDay['status'] {
    if (expiringItems.length === 0) return 'none'

    const dateTime = date.getTime()
    const nowTime = now.getTime()
    const threeDaysFromNow = nowTime + (3 * 24 * 60 * 60 * 1000)
    const sevenDaysFromNow = nowTime + (7 * 24 * 60 * 60 * 1000)

    if (dateTime < nowTime) return 'expired'
    if (dateTime <= threeDaysFromNow) return 'expiring-soon'
    if (dateTime <= sevenDaysFromNow) return 'expiring-later'
    return 'none'
  }

  /**
   * Navigate to previous month
   */
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  /**
   * Navigate to next month
   */
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  /**
   * Go to today
   */
  const goToToday = () => {
    setCurrentDate(new Date())
  }

  /**
   * Handle day click
   */
  const handleDayClick = (day: CalendarDay) => {
    if (day.expiringItems.length > 0) {
      setSelectedDay(day)
    }
  }

  /**
   * Get status badge color
   */
  const getStatusColor = (status: CalendarDay['status']) => {
    switch (status) {
      case 'expired':
        return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700'
      case 'expiring-soon':
        return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700'
      case 'expiring-later':
        return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700'
      default:
        return ''
    }
  }

  /**
   * Get status dot color
   */
  const getDotColor = (status: CalendarDay['status']) => {
    switch (status) {
      case 'expired':
        return 'bg-error-light0'
      case 'expiring-soon':
        return 'bg-orange-500'
      case 'expiring-later':
        return 'bg-warning-light0'
      default:
        return 'bg-gray-300'
    }
  }

  return (
    <div className={className}>
      {/* Calendar Header */}
      <div className="bg-card rounded-lg shadow p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground dark:text-white">
            Expiration Calendar
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-muted hover:bg-gray-200 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeftIcon className="h-5 w-5 text-muted-foreground" />
          </button>

          <h3 className="text-lg font-semibold text-foreground dark:text-white">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>

          <button
            onClick={nextMonth}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const isToday = day.date.toDateString() === new Date().toDateString()

            return (
              <button
                key={index}
                onClick={() => handleDayClick(day)}
                disabled={day.expiringItems.length === 0}
                className={`
                  aspect-square p-1 rounded-lg border-2 transition-all
                  ${day.isCurrentMonth ? 'text-foreground dark:text-white' : 'text-muted-foreground dark:text-muted-foreground'}
                  ${isToday ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'}
                  ${day.expiringItems.length > 0 ? getStatusColor(day.status) + ' cursor-pointer hover:shadow-md' : 'hover:bg-background'}
                  ${!day.isCurrentMonth && day.expiringItems.length === 0 ? 'opacity-50' : ''}
                  disabled:cursor-default
                `}
              >
                <div className="text-sm font-medium mb-1">
                  {day.date.getDate()}
                </div>
                {day.expiringItems.length > 0 && (
                  <div className="flex items-center justify-center gap-0.5">
                    {day.expiringItems.slice(0, 3).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full ${getDotColor(day.status)}`}
                      />
                    ))}
                    {day.expiringItems.length > 3 && (
                      <span className="text-[10px] font-bold ml-0.5">
                        +{day.expiringItems.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-error-light0" />
              <span className="text-muted-foreground">Expired</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-muted-foreground">Expiring Soon (3 days)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-warning-light0" />
              <span className="text-muted-foreground">Expiring Later (7 days)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Day Modal */}
      {selectedDay && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-card border-b border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground dark:text-white">
                    {selectedDay.date.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDay.expiringItems.length} item{selectedDay.expiringItems.length !== 1 ? 's' : ''} expiring
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Items List */}
            <div className="p-4 space-y-3">
              {selectedDay.expiringItems.map(item => {
                const categoryMeta = getCategoryMetadata(item.category)

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onItemClick?.(item)
                      setSelectedDay(null)
                    }}
                    className="w-full bg-background rounded-lg p-3 hover:bg-muted transition-colors text-left"
                  >
                    <div className="flex items-start gap-3">
                      {/* Product Image */}
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-2xl">
                          {categoryMeta.icon}
                        </div>
                      )}

                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground dark:text-white truncate">
                          {item.productName}
                        </h4>
                        {item.brand && (
                          <p className="text-sm text-muted-foreground truncate">
                            {item.brand}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                            {categoryMeta.displayName}
                          </span>
                          {item.quantity > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Qty: {item.quantity} {item.unit || 'units'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expiry Icon */}
                      <div className="flex-shrink-0">
                        <ClockIcon className={`h-5 w-5 ${
                          selectedDay.status === 'expired' ? 'text-red-500' :
                          selectedDay.status === 'expiring-soon' ? 'text-warning' :
                          'text-yellow-500'
                        }`} />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
