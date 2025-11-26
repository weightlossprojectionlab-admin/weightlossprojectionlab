'use client'

import { SocialPlatform, PLATFORM_SPECS } from '@/lib/social-media-cards'

export interface PlatformSelectorProps {
  onSelectPlatform: (platform: SocialPlatform) => void
  className?: string
}

const PLATFORMS: Array<{
  id: SocialPlatform
  icon: string
  color: string
  cta: string
}> = [
  { id: 'instagram-story', icon: '📸', color: 'bg-gradient-to-br from-purple-500 to-pink-500', cta: 'Share My Story' },
  { id: 'instagram-post', icon: '📷', color: 'bg-gradient-to-br from-purple-600 to-pink-600', cta: 'Post My Win' },
  { id: 'tiktok', icon: '🎵', color: 'bg-black', cta: 'My Journey' },
  { id: 'facebook', icon: '📘', color: 'bg-secondary', cta: 'Tell Friends' },
  { id: 'pinterest', icon: '📍', color: 'bg-error', cta: 'Pin Progress' },
  { id: 'twitter', icon: '𝕏', color: 'bg-black', cta: 'Share Win' }
]

/**
 * Platform selector overlay for sharing meal photos to social media
 * Shows on hover with platform-specific share buttons
 */
export function PlatformSelector({ onSelectPlatform, className = '' }: PlatformSelectorProps) {
  return (
    <div className={`absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${className}`}>
      <p className="text-white font-bold text-base mb-1">✨ Ready to Share My Progress!</p>
      <div className="grid grid-cols-3 gap-2 px-4">
        {PLATFORMS.map((platform) => {
          const spec = PLATFORM_SPECS[platform.id]
          return (
            <button
              key={platform.id}
              onClick={(e) => {
                e.stopPropagation()
                onSelectPlatform(platform.id)
              }}
              className={`${platform.color} text-white p-3 rounded-lg transition-transform hover:scale-110 flex flex-col items-center gap-1 shadow-lg hover:shadow-xl`}
              title={platform.cta}
              aria-label={platform.cta}
            >
              <span className="text-2xl">{platform.icon}</span>
              <span className="text-[10px] font-semibold leading-tight text-center">{platform.cta}</span>
            </button>
          )
        })}
      </div>
      <p className="text-white/80 text-xs mt-1">👆 Pick a platform - downloads instantly!</p>
    </div>
  )
}
