'use client'

import { useState } from 'react'
import { copyToClipboard, getPlatformShareUrls } from '@/lib/social-share-utils'
import { ClipboardDocumentCheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface ReferralShareSectionProps {
  referralUrl: string
  discountPercent?: number
}

const REFERRAL_PLATFORMS = [
  { id: 'twitter', label: 'Share on X', icon: '𝕏', className: 'bg-black hover:bg-gray-800 text-white' },
  { id: 'facebook', label: 'Share on Facebook', icon: 'f', className: 'bg-[#1877F2] hover:bg-[#1565C0] text-white' },
  { id: 'linkedin', label: 'Share on LinkedIn', icon: 'in', className: 'bg-[#0A66C2] hover:bg-[#084E94] text-white' },
  { id: 'whatsapp', label: 'Share on WhatsApp', icon: '💬', className: 'bg-[#25D366] hover:bg-[#1EBE57] text-white' },
] as const

export function ReferralShareSection({ referralUrl, discountPercent = 7 }: ReferralShareSectionProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const success = await copyToClipboard(referralUrl)
    if (success) {
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 2000)
    } else {
      toast.error('Failed to copy')
    }
  }

  const shareContent = {
    title: 'Wellness Projection Lab',
    text: `Track your family's health, medications, and meals with Wellness Projection Lab. Use my link to get ${discountPercent}% off!`,
    url: referralUrl,
  }

  const shareUrls = getPlatformShareUrls(shareContent)

  const handlePlatformShare = (platformId: string) => {
    const url = shareUrls[platformId as keyof typeof shareUrls]
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400')
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-bold text-foreground mb-1">
        Refer your friends, and get paid every time!
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Share this link to earn for every paid signup. Anyone who clicks it will get {discountPercent}% off.
      </p>

      {/* Referral URL + Copy */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          readOnly
          value={referralUrl}
          className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-foreground text-sm font-mono truncate"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-primary hover:bg-primary-hover text-white'
          }`}
        >
          {copied ? (
            <ClipboardDocumentCheckIcon className="h-5 w-5" />
          ) : (
            <ClipboardDocumentIcon className="h-5 w-5" />
          )}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Social Share Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {REFERRAL_PLATFORMS.map(platform => (
          <button
            key={platform.id}
            onClick={() => handlePlatformShare(platform.id)}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-opacity hover:opacity-90 ${platform.className}`}
          >
            <span className="text-base font-bold">{platform.icon}</span>
            {platform.label}
          </button>
        ))}
      </div>
    </div>
  )
}
