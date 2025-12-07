/**
 * ContactButtons Component
 *
 * Quick contact action buttons for email, phone, and messaging
 */

'use client'

import { useState } from 'react'

interface ContactButtonsProps {
  email?: string
  phone?: string
  name: string
  layout?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
}

export function ContactButtons({
  email,
  phone,
  name,
  layout = 'horizontal',
  size = 'md',
  showLabels = true
}: ContactButtonsProps) {
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)

  const handleEmailClick = () => {
    if (email) {
      window.location.href = `mailto:${email}`
    }
  }

  const handlePhoneClick = () => {
    if (phone) {
      window.location.href = `tel:${phone}`
    }
  }

  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (email) {
      await navigator.clipboard.writeText(email)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    }
  }

  const handleCopyPhone = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (phone) {
      await navigator.clipboard.writeText(phone)
      setCopiedPhone(true)
      setTimeout(() => setCopiedPhone(false), 2000)
    }
  }

  const sizeStyles = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2.5'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  const containerClass =
    layout === 'horizontal' ? 'flex items-center gap-2' : 'flex flex-col gap-2'

  return (
    <div className={containerClass}>
      {email && (
        <div className="relative group">
          <button
            onClick={handleEmailClick}
            className={`inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors ${sizeStyles[size]}`}
            title={`Email ${name}`}
          >
            <svg
              className={iconSizes[size]}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            {showLabels && <span>Email</span>}
          </button>
          <button
            onClick={handleCopyEmail}
            className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white rounded-full p-1"
            title="Copy email"
          >
            {copiedEmail ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
        </div>
      )}

      {phone && (
        <div className="relative group">
          <button
            onClick={handlePhoneClick}
            className={`inline-flex items-center gap-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors ${sizeStyles[size]}`}
            title={`Call ${name}`}
          >
            <svg
              className={iconSizes[size]}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            {showLabels && <span>Call</span>}
          </button>
          <button
            onClick={handleCopyPhone}
            className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white rounded-full p-1"
            title="Copy phone"
          >
            {copiedPhone ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
        </div>
      )}

      {!email && !phone && (
        <div className={`text-muted-foreground ${sizeStyles[size]}`}>
          No contact info available
        </div>
      )}
    </div>
  )
}
