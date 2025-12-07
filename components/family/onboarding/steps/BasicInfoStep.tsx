'use client'

import { useState } from 'react'
import Image from 'next/image'

interface BasicInfoStepProps {
  data: {
    displayName: string
    phoneNumber: string
    photoUrl?: string
  }
  onChange: (data: Partial<BasicInfoStepProps['data']>) => void
}

export function BasicInfoStep({ data, onChange }: BasicInfoStepProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(data.photoUrl || null)
  const [isUploading, setIsUploading] = useState(false)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB')
      return
    }

    setIsUploading(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
        onChange({ photoUrl: reader.result as string })
      }
      reader.readAsDataURL(file)

      // TODO: Upload to Firebase Storage in production
      // For now, we'll use the base64 data URL
    } catch (error) {
      console.error('Error uploading photo:', error)
      alert('Failed to upload photo. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '')

    // Format as (XXX) XXX-XXXX
    if (cleaned.length <= 3) {
      return cleaned
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    onChange({ phoneNumber: formatted })
  }

  return (
    <div className="space-y-6">
      {/* Photo Upload */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {photoPreview ? (
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary">
              <Image
                src={photoPreview}
                alt="Profile photo"
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-border">
              <span className="text-5xl text-muted-foreground">👤</span>
            </div>
          )}

          {/* Upload Button */}
          <label
            htmlFor="photo-upload"
            className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-hover transition-colors shadow-lg"
          >
            <span className="text-xl">📷</span>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={isUploading}
            />
          </label>
        </div>

        <p className="text-sm text-muted-foreground">
          {isUploading ? 'Uploading...' : 'Upload a profile photo (optional)'}
        </p>
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Display Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.displayName}
          onChange={(e) => onChange({ displayName: e.target.value })}
          placeholder="How should we call you?"
          className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
          required
        />
        <p className="text-xs text-muted-foreground">
          This is the name that will appear to other family members
        </p>
      </div>

      {/* Phone Number */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={data.phoneNumber}
          onChange={handlePhoneChange}
          placeholder="(555) 123-4567"
          className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
          required
          maxLength={14}
        />
        <p className="text-xs text-muted-foreground">
          We'll use this for important notifications and emergency contact
        </p>
      </div>

      {/* Privacy Notice */}
      <div className="p-4 rounded-lg bg-muted border border-border">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground mb-1">Your Privacy Matters</h4>
            <p className="text-sm text-muted-foreground">
              Your personal information is only shared with family members you're connected with.
              We take data security seriously and comply with HIPAA regulations.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
