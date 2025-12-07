/**
 * CaregiverProfileForm Component
 *
 * Comprehensive form for editing caregiver profiles
 * Tabbed interface with validation and auto-save or manual save
 */

'use client'

import { useState, useEffect } from 'react'
import { AvailabilityCalendar } from './AvailabilityCalendar'
import type {
  CaregiverProfileFormData,
  AvailabilityStatus,
  DEFAULT_WEEKLY_AVAILABILITY,
  DEFAULT_CAREGIVER_PREFERENCES
} from '@/types/caregiver'

interface CaregiverProfileFormProps {
  initialData?: Partial<CaregiverProfileFormData>
  onSave: (data: CaregiverProfileFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

type TabType = 'basic' | 'professional' | 'availability' | 'preferences'

export function CaregiverProfileForm({
  initialData,
  onSave,
  onCancel,
  loading = false
}: CaregiverProfileFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>('basic')
  const [hasChanges, setHasChanges] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<CaregiverProfileFormData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    photo: initialData?.photo || '',
    relationship: initialData?.relationship || '',
    professionalInfo: initialData?.professionalInfo || undefined,
    availabilityStatus: initialData?.availabilityStatus || 'available',
    weeklySchedule: initialData?.weeklySchedule || DEFAULT_WEEKLY_AVAILABILITY,
    address: initialData?.address || {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    },
    emergencyContact: initialData?.emergencyContact || undefined,
    preferences: {
      ...DEFAULT_CAREGIVER_PREFERENCES,
      ...initialData?.preferences
    },
    profileVisibility: initialData?.profileVisibility || 'family_only',
    shareContactInfo: initialData?.shareContactInfo ?? true,
    shareAvailability: initialData?.shareAvailability ?? true,
    bio: initialData?.bio || ''
  })

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => {
      const keys = field.split('.')
      if (keys.length === 1) {
        return { ...prev, [field]: value }
      }

      const [parent, child] = keys
      return {
        ...prev,
        [parent]: {
          ...(prev[parent as keyof CaregiverProfileFormData] as any),
          [child]: value
        }
      }
    })
    setHasChanges(true)
    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      // Switch to the tab with the first error
      if (errors.name || errors.email) {
        setActiveTab('basic')
      }
      return
    }

    try {
      await onSave(formData)
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving profile:', error)
    }
  }

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      )
      if (!confirmed) return
    }
    onCancel()
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'basic', label: 'Basic Info', icon: '👤' },
    { id: 'professional', label: 'Professional', icon: '💼' },
    { id: 'availability', label: 'Availability', icon: '📅' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' }
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary dark:text-purple-400'
                : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg bg-background text-foreground ${
                  errors.name ? 'border-error' : 'border-border'
                }`}
                placeholder="Enter full name"
              />
              {errors.name && <p className="text-error text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg bg-background text-foreground ${
                  errors.email ? 'border-error' : 'border-border'
                }`}
                placeholder="email@example.com"
              />
              {errors.email && <p className="text-error text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Relationship
              </label>
              <input
                type="text"
                value={formData.relationship || ''}
                onChange={(e) => handleChange('relationship', e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="e.g., daughter, son, spouse"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Bio</label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => handleChange('bio', e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                rows={4}
                placeholder="Tell others about yourself..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Availability Status
              </label>
              <select
                value={formData.availabilityStatus}
                onChange={(e) =>
                  handleChange('availabilityStatus', e.target.value as AvailabilityStatus)
                }
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="away">Away</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Address</h3>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Street
                </label>
                <input
                  type="text"
                  value={formData.address?.street || ''}
                  onChange={(e) => handleChange('address.street', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.address?.city || ''}
                    onChange={(e) => handleChange('address.city', e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.address?.state || ''}
                    onChange={(e) => handleChange('address.state', e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    value={formData.address?.zipCode || ''}
                    onChange={(e) => handleChange('address.zipCode', e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'professional' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Professional Title
              </label>
              <input
                type="text"
                value={formData.professionalInfo?.title || ''}
                onChange={(e) => handleChange('professionalInfo.title', e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="e.g., Registered Nurse, Home Health Aide"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Organization
              </label>
              <input
                type="text"
                value={formData.professionalInfo?.organization || ''}
                onChange={(e) =>
                  handleChange('professionalInfo.organization', e.target.value)
                }
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="Company or organization name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Years of Experience
              </label>
              <input
                type="number"
                value={formData.professionalInfo?.yearsOfExperience || ''}
                onChange={(e) =>
                  handleChange('professionalInfo.yearsOfExperience', parseInt(e.target.value))
                }
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                License Number
              </label>
              <input
                type="text"
                value={formData.professionalInfo?.licenseNumber || ''}
                onChange={(e) =>
                  handleChange('professionalInfo.licenseNumber', e.target.value)
                }
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>
          </div>
        )}

        {activeTab === 'availability' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Weekly Schedule
              </h3>
              <AvailabilityCalendar
                schedule={formData.weeklySchedule!}
                onChange={(schedule) => handleChange('weeklySchedule', schedule)}
                editable={true}
              />
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Preferred Contact Method
              </label>
              <select
                value={formData.preferences?.preferredContactMethod || 'email'}
                onChange={(e) =>
                  handleChange('preferences.preferredContactMethod', e.target.value)
                }
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="text">Text</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Timezone
              </label>
              <input
                type="text"
                value={formData.preferences?.timezone || ''}
                onChange={(e) => handleChange('preferences.timezone', e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="America/New_York"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Quiet Hours Start
                </label>
                <input
                  type="time"
                  value={formData.preferences?.quietHoursStart || ''}
                  onChange={(e) =>
                    handleChange('preferences.quietHoursStart', e.target.value)
                  }
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Quiet Hours End
                </label>
                <input
                  type="time"
                  value={formData.preferences?.quietHoursEnd || ''}
                  onChange={(e) => handleChange('preferences.quietHoursEnd', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Privacy Settings</h3>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Profile Visibility
                </label>
                <select
                  value={formData.profileVisibility}
                  onChange={(e) => handleChange('profileVisibility', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="all">Visible to all family members</option>
                  <option value="family_only">Family only</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="shareContactInfo"
                  checked={formData.shareContactInfo}
                  onChange={(e) => handleChange('shareContactInfo', e.target.checked)}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                />
                <label htmlFor="shareContactInfo" className="text-sm text-foreground">
                  Share contact information with other family members
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="shareAvailability"
                  checked={formData.shareAvailability}
                  onChange={(e) => handleChange('shareAvailability', e.target.checked)}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                />
                <label htmlFor="shareAvailability" className="text-sm text-foreground">
                  Share availability schedule
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons (Sticky Footer) */}
      <div className="sticky bottom-0 bg-card border-t-2 border-border pt-4 pb-2 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleCancel}
          className="px-6 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <div className="flex items-center gap-4">
          {hasChanges && (
            <span className="text-sm text-muted-foreground">You have unsaved changes</span>
          )}
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  )
}
