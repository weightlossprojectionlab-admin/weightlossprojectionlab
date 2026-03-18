import Link from 'next/link'
import { ReactNode } from 'react'

interface DocCardProps {
  href: string
  icon: ReactNode
  title: string
  description: string
  accentColor?: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal' | 'indigo' | 'yellow' | 'red' | 'gray'
  size?: 'large' | 'small'
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-100',
    hoverBg: 'hover:bg-blue-200',
    icon: 'text-blue-600',
    hover: 'group-hover:text-blue-600',
    text: 'text-blue-600',
  },
  green: {
    bg: 'bg-green-100',
    hoverBg: 'hover:bg-green-200',
    icon: 'text-green-600',
    hover: 'group-hover:text-green-600',
    text: 'text-green-600',
  },
  purple: {
    bg: 'bg-purple-100',
    hoverBg: 'hover:bg-purple-200',
    icon: 'text-purple-600',
    hover: 'group-hover:text-purple-600',
    text: 'text-purple-600',
  },
  orange: {
    bg: 'bg-orange-100',
    hoverBg: 'hover:bg-orange-200',
    icon: 'text-orange-600',
    hover: 'group-hover:text-orange-600',
    text: 'text-orange-600',
  },
  pink: {
    bg: 'bg-pink-100',
    hoverBg: 'hover:bg-pink-200',
    icon: 'text-pink-600',
    hover: 'group-hover:text-pink-600',
    text: 'text-pink-600',
  },
  teal: {
    bg: 'bg-teal-100',
    hoverBg: 'hover:bg-teal-200',
    icon: 'text-teal-600',
    hover: 'group-hover:text-teal-600',
    text: 'text-teal-600',
  },
  indigo: {
    bg: 'bg-indigo-100',
    hoverBg: 'hover:bg-indigo-200',
    icon: 'text-indigo-600',
    hover: 'group-hover:text-indigo-600',
    text: 'text-indigo-600',
  },
  yellow: {
    bg: 'bg-yellow-100',
    hoverBg: 'hover:bg-yellow-200',
    icon: 'text-yellow-600',
    hover: 'group-hover:text-yellow-600',
    text: 'text-yellow-600',
  },
  red: {
    bg: 'bg-red-100',
    hoverBg: 'hover:bg-red-200',
    icon: 'text-red-600',
    hover: 'group-hover:text-red-600',
    text: 'text-red-600',
  },
  gray: {
    bg: 'bg-gray-100',
    hoverBg: 'hover:bg-gray-200',
    icon: 'text-gray-600',
    hover: 'group-hover:text-gray-700',
    text: 'text-gray-600',
  },
}

export function DocCard({
  href,
  icon,
  title,
  description,
  accentColor = 'blue',
  size = 'large',
}: DocCardProps) {
  const colors = colorClasses[accentColor]

  if (size === 'small') {
    return (
      <Link
        href={href}
        className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow group"
      >
        <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center mb-3`}>
          <div className={colors.icon}>{icon}</div>
        </div>
        <h3 className={`font-semibold text-gray-900 mb-2 ${colors.hover}`}>{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow group"
    >
      <div
        className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center mb-4 ${colors.hoverBg} transition-colors`}
      >
        <div className={colors.icon}>{icon}</div>
      </div>
      <h3 className={`text-xl font-bold text-gray-900 mb-2 ${colors.hover}`}>{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <span className={`${colors.text} font-medium flex items-center gap-1`}>
        Read guide
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  )
}
