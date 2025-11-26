'use client'

import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse'
}: SkeletonProps) {
  const baseClasses = 'bg-muted'

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-muted via-background to-muted bg-[length:200%_100%]',
    none: ''
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      aria-live="polite"
      aria-busy="true"
    />
  )
}

// Pre-made skeleton components for common patterns
export function MealCardSkeleton() {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <Skeleton variant="rectangular" width={64} height={64} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" />
          <div className="flex items-center space-x-4">
            <Skeleton variant="text" width={60} />
            <Skeleton variant="text" width={60} />
            <Skeleton variant="text" width={60} />
          </div>
        </div>
        <div className="flex space-x-2">
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="circular" width={24} height={24} />
        </div>
      </div>
    </div>
  )
}

export function GalleryImageSkeleton() {
  return (
    <Skeleton
      variant="rectangular"
      className="aspect-square"
      animation="wave"
    />
  )
}

export function SummaryCardSkeleton() {
  return (
    <div className="bg-card rounded-lg p-4">
      <Skeleton variant="text" width="50%" className="mb-4" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-muted rounded-lg p-3">
            <Skeleton variant="text" width="60%" className="mb-2" />
            <Skeleton variant="text" width="40%" height={32} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function TemplateCardSkeleton() {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <div className="flex space-x-4">
            <Skeleton variant="text" width={60} />
            <Skeleton variant="text" width={40} />
          </div>
        </div>
        <Skeleton variant="circular" width={24} height={24} />
      </div>
      <Skeleton variant="text" width="90%" className="mb-3" />
      <Skeleton variant="rectangular" width="100%" height={36} />
    </div>
  )
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <MealCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton variant="text" width="60%" className="mb-2" />
          <Skeleton variant="text" width="40%" height={32} />
        </div>
        <Skeleton variant="circular" width={48} height={48} />
      </div>
    </div>
  )
}

export function ChartCardSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow-sm p-6">
      <Skeleton variant="text" width="40%" className="mb-4" height={24} />
      <Skeleton variant="rectangular" width="100%" height={300} />
    </div>
  )
}

export function PhotoGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <GalleryImageSkeleton key={i} />
      ))}
    </div>
  )
}

export function ProgressPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts */}
      <ChartCardSkeleton />
      <ChartCardSkeleton />
      <ChartCardSkeleton />
    </div>
  )
}
