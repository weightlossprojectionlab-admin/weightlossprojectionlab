/**
 * Screenshot Component
 *
 * Reusable component for displaying product screenshots
 * with optimized loading, zoom functionality, and responsive design
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { XMarkIcon, MagnifyingGlassPlusIcon } from '@heroicons/react/24/outline'

interface ScreenshotProps {
  src: string
  alt: string
  caption?: string
  variant?: 'desktop' | 'mobile'
  priority?: boolean
  className?: string
  zoomable?: boolean
  width?: number
  height?: number
}

export function Screenshot({
  src,
  alt,
  caption,
  variant = 'desktop',
  priority = false,
  className = '',
  zoomable = true,
  width,
  height
}: ScreenshotProps) {
  const [isZoomed, setIsZoomed] = useState(false)

  const handleClick = () => {
    if (zoomable) {
      setIsZoomed(true)
    }
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsZoomed(false)
  }

  return (
    <>
      {/* Screenshot Display */}
      <figure className={`group relative ${className}`}>
        <div
          className={`relative overflow-hidden rounded-xl border-2 border-border shadow-lg transition-all duration-300 ${
            zoomable ? 'cursor-zoom-in hover:shadow-2xl hover:border-blue-300' : ''
          } ${variant === 'mobile' ? 'max-w-sm mx-auto' : ''}`}
          onClick={handleClick}
        >
          {/* Image */}
          <Image
            src={src}
            alt={alt}
            width={width || (variant === 'mobile' ? 430 : 1920)}
            height={height || (variant === 'mobile' ? 932 : 1080)}
            className="w-full h-auto"
            priority={priority}
            quality={90}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAUABQDASIAAhEBAxEB/8QAGAAAAwEBAAAAAAAAAAAAAAAAAAQFBgf/xAAlEAACAQMDBAMBAQAAAAAAAAABAgMABBEFEiETMUFRBhRhcYH/xAAYAQADAQEAAAAAAAAAAAAAAAABAgMABP/EABwRAAICAgMAAAAAAAAAAAAAAAABAgMREiExQf/aAAwDAQACEQMRAD8A6fiuedY1m4s9Tm0tHKQw28chQcbmZgcn9Y/VdDrlY4TbGVyFaRhkj0K831KBbbUtYhQKsaXrgD24OSf7WwS1KSe1i72Wes1l+iDmU+gv9PpNNnu49HnRy8EsjkAEKE+snnGRWl+I+pJpfVhu7W2M0mArxqyB/R4POM/mus9XCKK5p/Lb0VX5BXR+Hb64vmk/kIGiRRs2/K5z/ajRXRj/ABezmfk/H5aJfWtkYVUogHtuzkj9VB/KmlWysHQ7WkU9P71HRRQ/LpR7K/j+Af/Z"
          />

          {/* Zoom Overlay */}
          {zoomable && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                <MagnifyingGlassPlusIcon className="w-6 h-6 text-gray-900 dark:text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Caption */}
        {caption && (
          <figcaption className="mt-3 text-sm text-center text-muted-foreground italic">
            {caption}
          </figcaption>
        )}
      </figure>

      {/* Zoomed Modal */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={handleClose}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
            aria-label="Close zoom"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>

          {/* Zoomed Image */}
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <Image
              src={src}
              alt={alt}
              width={width || (variant === 'mobile' ? 430 : 1920)}
              height={height || (variant === 'mobile' ? 932 : 1080)}
              className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl"
              quality={100}
            />
          </div>

          {/* Caption in Modal */}
          {caption && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-full max-w-2xl text-center">
              {caption}
            </div>
          )}
        </div>
      )}
    </>
  )
}

/**
 * Mobile Screenshot Frame Component
 * Wraps mobile screenshots in a phone frame mockup
 */
export function MobileFrame({ children, variant = 'ios' }: { children: React.ReactNode; variant?: 'ios' | 'android' }) {
  return (
    <div className="relative inline-block">
      {/* Phone Frame */}
      <div
        className={`relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl ${
          variant === 'ios' ? 'border-8 border-gray-800' : 'border-4 border-gray-700'
        }`}
      >
        {/* Notch (iOS) */}
        {variant === 'ios' && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-3xl z-10" />
        )}

        {/* Screen Content */}
        <div className="relative bg-white dark:bg-gray-900 rounded-[2.5rem] overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Screenshot Comparison Component
 * Side-by-side comparison with slider
 */
export function ScreenshotComparison({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Before',
  afterLabel = 'After',
  alt
}: {
  beforeSrc: string
  afterSrc: string
  beforeLabel?: string
  afterLabel?: string
  alt: string
}) {
  const [sliderPosition, setSliderPosition] = useState(50)

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value))
  }

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-border shadow-lg">
      {/* Before Image */}
      <div className="absolute inset-0">
        <Image src={beforeSrc} alt={`${alt} - ${beforeLabel}`} fill className="object-cover" />
      </div>

      {/* After Image with Clip */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <Image src={afterSrc} alt={`${alt} - ${afterLabel}`} fill className="object-cover" />
      </div>

      {/* Slider */}
      <div className="absolute inset-0 flex items-center">
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPosition}
          onChange={handleSliderChange}
          className="w-full cursor-ew-resize opacity-0"
        />
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Slider Handle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12M8 17h12M4 7v10" />
            </svg>
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium pointer-events-none">
        {beforeLabel}
      </div>
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium pointer-events-none">
        {afterLabel}
      </div>
    </div>
  )
}

/**
 * Screenshot Gallery Component
 * Grid of screenshots with lightbox
 */
export function ScreenshotGallery({ screenshots }: { screenshots: Array<{ src: string; alt: string; caption?: string }> }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {screenshots.map((screenshot, index) => (
        <Screenshot
          key={index}
          src={screenshot.src}
          alt={screenshot.alt}
          caption={screenshot.caption}
          zoomable
        />
      ))}
    </div>
  )
}
