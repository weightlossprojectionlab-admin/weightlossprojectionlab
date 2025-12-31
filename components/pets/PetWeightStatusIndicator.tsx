/**
 * PetWeightStatusIndicator Component
 * Displays weight status (underweight/healthy/overweight) for pets
 * Based on species and breed-specific weight ranges
 */

'use client'

import { evaluateWeight } from '@/lib/pet-weight-ranges'

interface PetWeightStatusIndicatorProps {
  weight: number
  weightUnit: 'lbs' | 'kg'
  species?: string
  breed?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function PetWeightStatusIndicator({
  weight,
  weightUnit,
  species,
  breed,
  size = 'md',
  className = ''
}: PetWeightStatusIndicatorProps) {
  const evaluation = evaluateWeight(weight, weightUnit, species, breed)

  if (evaluation.status === 'unknown') return null

  const statusColors = {
    underweight: 'bg-orange-500/20 border-orange-500/50 text-orange-200',
    healthy: 'bg-green-500/20 border-green-500/50 text-green-200',
    overweight: 'bg-red-500/20 border-red-500/50 text-red-200'
  }

  const statusIcons = {
    underweight: '⚠️',
    healthy: '✓',
    overweight: '⚠️'
  }

  const statusLabels = {
    underweight: 'Below Typical Range',
    healthy: 'Healthy Weight',
    overweight: 'Above Typical Range'
  }

  const sizeClasses = {
    sm: {
      container: 'p-2',
      icon: 'text-sm',
      title: 'text-xs font-medium',
      message: 'text-xs'
    },
    md: {
      container: 'p-3',
      icon: 'text-base',
      title: 'text-xs font-medium',
      message: 'text-xs'
    },
    lg: {
      container: 'p-3',
      icon: 'text-lg',
      title: 'text-sm font-medium',
      message: 'text-sm'
    }
  }

  const sizes = sizeClasses[size]

  return (
    <div className={`rounded-lg border ${statusColors[evaluation.status]} ${sizes.container} ${className}`}>
      <div className="flex items-start gap-2">
        <span className={sizes.icon}>{statusIcons[evaluation.status]}</span>
        <div className="flex-1">
          <p className={sizes.title}>
            {evaluation.status === 'healthy'
              ? 'Healthy Weight Range'
              : statusLabels[evaluation.status]}
          </p>
          <p className={`${sizes.message} mt-0.5 opacity-90`}>
            {evaluation.message}
          </p>
        </div>
      </div>
    </div>
  )
}
