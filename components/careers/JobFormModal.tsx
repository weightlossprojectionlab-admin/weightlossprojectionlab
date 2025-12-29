/**
 * JobFormModal - Create/Edit Job Posting Modal
 *
 * Multi-step form for creating or editing job postings
 * Uses ResponsiveModal base component for consistency
 */

'use client'

import { useState, useEffect } from 'react'
import { ResponsiveModal, ModalFooter, ModalButton } from '@/components/ui/ResponsiveModal'
import { toast } from 'react-hot-toast'
import { auth } from '@/lib/firebase'
import type {
  JobPostingForm,
  JobDepartment,
  JobLocationType,
  JobStatus,
  JobPosting,
  JobSuccessMetrics
} from '@/types/jobs'

interface JobFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editJob?: JobPosting | null
}

const DEPARTMENTS: JobDepartment[] = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Customer Success',
  'Security',
  'Data'
]

const LOCATION_TYPES: JobLocationType[] = ['remote', 'hybrid', 'onsite']

export function JobFormModal({ isOpen, onClose, onSuccess, editJob }: JobFormModalProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<JobPostingForm>({
    title: '',
    department: 'Engineering',
    location: 'Remote (US, Canada, EU)',
    locationType: 'remote',
    salaryMin: 80000,
    salaryMax: 150000,
    equity: '0.25%-0.75%',
    reportsTo: '',
    about: '',
    whyCritical: '',
    responsibilities: [''],
    requiredQualifications: [''],
    niceToHave: [''],
    successMetrics: {
      month1: [''],
      month2: [''],
      month3: ['']
    },
    whyJoin: [''],
    status: 'draft',
    metaDescription: '',
    keywords: []
  })

  // Initialize form with edit data if provided
  useEffect(() => {
    if (editJob) {
      setFormData({
        title: editJob.title,
        department: editJob.department,
        location: editJob.location,
        locationType: editJob.locationType,
        salaryMin: editJob.salaryMin,
        salaryMax: editJob.salaryMax,
        equity: editJob.equity,
        reportsTo: editJob.reportsTo,
        about: editJob.about,
        whyCritical: editJob.whyCritical,
        responsibilities: editJob.responsibilities,
        requiredQualifications: editJob.requiredQualifications,
        niceToHave: editJob.niceToHave,
        successMetrics: editJob.successMetrics,
        whyJoin: editJob.whyJoin,
        status: editJob.status,
        metaDescription: editJob.metaDescription,
        keywords: editJob.keywords
      })
    }
  }, [editJob])

  const handleInputChange = (field: keyof JobPostingForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleArrayChange = (
    field: keyof JobPostingForm,
    index: number,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).map((item, i) => (i === index ? value : item))
    }))
  }

  const addArrayItem = (field: keyof JobPostingForm) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), '']
    }))
  }

  const removeArrayItem = (field: keyof JobPostingForm, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }))
  }

  const handleSuccessMetricChange = (
    month: keyof JobSuccessMetrics,
    index: number,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      successMetrics: {
        ...prev.successMetrics,
        [month]: prev.successMetrics[month].map((item, i) => (i === index ? value : item))
      }
    }))
  }

  const addSuccessMetric = (month: keyof JobSuccessMetrics) => {
    setFormData(prev => ({
      ...prev,
      successMetrics: {
        ...prev.successMetrics,
        [month]: [...prev.successMetrics[month], '']
      }
    }))
  }

  const removeSuccessMetric = (month: keyof JobSuccessMetrics, index: number) => {
    setFormData(prev => ({
      ...prev,
      successMetrics: {
        ...prev.successMetrics,
        [month]: prev.successMetrics[month].filter((_, i) => i !== index)
      }
    }))
  }

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.title || !formData.department || !formData.location) {
          toast.error('Please fill in all required fields')
          return false
        }
        if (formData.salaryMin >= formData.salaryMax) {
          toast.error('Maximum salary must be greater than minimum')
          return false
        }
        return true
      case 2:
        if (!formData.about || !formData.whyCritical) {
          toast.error('Please fill in all required fields')
          return false
        }
        const validResponsibilities = formData.responsibilities.filter(r => r.trim())
        if (validResponsibilities.length === 0) {
          toast.error('Add at least one responsibility')
          return false
        }
        return true
      case 3:
        const validQualifications = formData.requiredQualifications.filter(q => q.trim())
        if (validQualifications.length === 0) {
          toast.error('Add at least one required qualification')
          return false
        }
        return true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handleSubmit = async () => {
    // Clean up arrays (remove empty strings)
    const cleanedData: JobPostingForm = {
      ...formData,
      responsibilities: formData.responsibilities.filter(r => r.trim()),
      requiredQualifications: formData.requiredQualifications.filter(q => q.trim()),
      niceToHave: formData.niceToHave.filter(n => n.trim()),
      whyJoin: formData.whyJoin.filter(w => w.trim()),
      successMetrics: {
        month1: formData.successMetrics.month1.filter(m => m.trim()),
        month2: formData.successMetrics.month2.filter(m => m.trim()),
        month3: formData.successMetrics.month3.filter(m => m.trim())
      },
      keywords: formData.keywords?.filter(k => k.trim()) || []
    }

    setLoading(true)

    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error('Not authenticated')
      }

      const token = await user.getIdToken()
      const url = editJob ? `/api/admin/jobs/${editJob.id}` : '/api/admin/jobs'
      const method = editJob ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanedData)
      })

      const data = await response.json()

      if (data.success) {
        toast.success(editJob ? 'Job updated successfully!' : 'Job created successfully!')
        onSuccess()
        resetAndClose()
      } else {
        throw new Error(data.error || 'Failed to save job')
      }
    } catch (error) {
      console.error('Error saving job:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save job')
    } finally {
      setLoading(false)
    }
  }

  const resetAndClose = () => {
    setStep(1)
    setFormData({
      title: '',
      department: 'Engineering',
      location: 'Remote (US, Canada, EU)',
      locationType: 'remote',
      salaryMin: 80000,
      salaryMax: 150000,
      equity: '0.25%-0.75%',
      reportsTo: '',
      about: '',
      whyCritical: '',
      responsibilities: [''],
      requiredQualifications: [''],
      niceToHave: [''],
      successMetrics: {
        month1: [''],
        month2: [''],
        month3: ['']
      },
      whyJoin: [''],
      status: 'draft',
      metaDescription: '',
      keywords: []
    })
    onClose()
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={resetAndClose}
      size="2xl"
      title={editJob ? 'Edit Job Posting' : 'Create Job Posting'}
      closeOnBackdrop={false}
    >
      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Step {step} of 4</span>
          <span className="text-xs text-muted-foreground">{Math.round((step / 4) * 100)}% Complete</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
              placeholder="Senior Full-Stack Engineer"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value as JobDepartment)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Location Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.locationType}
                onChange={(e) => handleInputChange('locationType', e.target.value as JobLocationType)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
              >
                {LOCATION_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
              placeholder="Remote (US, Canada, EU)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Min Salary <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.salaryMin}
                onChange={(e) => handleInputChange('salaryMin', parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                placeholder="80000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Max Salary <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.salaryMax}
                onChange={(e) => handleInputChange('salaryMax', parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                placeholder="150000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Equity Range
            </label>
            <input
              type="text"
              value={formData.equity}
              onChange={(e) => handleInputChange('equity', e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
              placeholder="0.25%-0.75%"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Reports To <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.reportsTo}
              onChange={(e) => handleInputChange('reportsTo', e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
              placeholder="Head of Engineering"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as JobStatus)}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      )}

      {/* Step 2: Job Description */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              About the Role <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.about}
              onChange={(e) => handleInputChange('about', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
              placeholder="Brief overview of the role and what they'll be doing..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Why This Role is Critical <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.whyCritical}
              onChange={(e) => handleInputChange('whyCritical', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
              placeholder="Explain why this position is critical to the company..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Responsibilities <span className="text-red-500">*</span>
            </label>
            {formData.responsibilities.map((resp, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={resp}
                  onChange={(e) => handleArrayChange('responsibilities', index, e.target.value)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                  placeholder="Build scalable backend services..."
                />
                {formData.responsibilities.length > 1 && (
                  <button
                    onClick={() => removeArrayItem('responsibilities', index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addArrayItem('responsibilities')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + Add Responsibility
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Qualifications */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Required Qualifications <span className="text-red-500">*</span>
            </label>
            {formData.requiredQualifications.map((qual, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={qual}
                  onChange={(e) => handleArrayChange('requiredQualifications', index, e.target.value)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                  placeholder="5+ years of software engineering experience..."
                />
                {formData.requiredQualifications.length > 1 && (
                  <button
                    onClick={() => removeArrayItem('requiredQualifications', index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addArrayItem('requiredQualifications')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + Add Qualification
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nice to Have
            </label>
            {formData.niceToHave.map((nice, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={nice}
                  onChange={(e) => handleArrayChange('niceToHave', index, e.target.value)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                  placeholder="Experience with GraphQL..."
                />
                <button
                  onClick={() => removeArrayItem('niceToHave', index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem('niceToHave')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + Add Nice to Have
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Success Metrics & Why Join */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Success Metrics (First 90 Days)
            </label>
            <div className="grid grid-cols-3 gap-4">
              {(['month1', 'month2', 'month3'] as const).map((month, monthIndex) => (
                <div key={month}>
                  <h4 className="text-sm font-semibold mb-2">Month {monthIndex + 1}</h4>
                  {formData.successMetrics[month].map((metric, index) => (
                    <div key={index} className="mb-2">
                      <input
                        type="text"
                        value={metric}
                        onChange={(e) => handleSuccessMetricChange(month, index, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                        placeholder="Complete onboarding..."
                      />
                      {formData.successMetrics[month].length > 1 && (
                        <button
                          onClick={() => removeSuccessMetric(month, index)}
                          className="text-xs text-red-600 hover:text-red-700 mt-1"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addSuccessMetric(month)}
                    className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                  >
                    + Add Metric
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Why Join Us
            </label>
            {formData.whyJoin.map((reason, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <textarea
                  value={reason}
                  onChange={(e) => handleArrayChange('whyJoin', index, e.target.value)}
                  rows={2}
                  className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                  placeholder="Work with cutting-edge AI technology..."
                />
                <button
                  onClick={() => removeArrayItem('whyJoin', index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg self-start"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem('whyJoin')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + Add Reason
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Meta Description (SEO)
            </label>
            <textarea
              value={formData.metaDescription}
              onChange={(e) => handleInputChange('metaDescription', e.target.value)}
              rows={2}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
              placeholder="Brief description for search engines..."
            />
          </div>
        </div>
      )}

      {/* Footer Buttons */}
      <ModalFooter align="between" mobileStack={false}>
        {step > 1 ? (
          <ModalButton onClick={() => setStep(step - 1)} variant="secondary">
            Back
          </ModalButton>
        ) : (
          <ModalButton onClick={resetAndClose} variant="secondary">
            Cancel
          </ModalButton>
        )}

        {step < 4 ? (
          <ModalButton onClick={handleNext} variant="primary">
            Next
          </ModalButton>
        ) : (
          <ModalButton
            onClick={handleSubmit}
            variant="primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : editJob ? 'Update Job' : 'Create Job'}
          </ModalButton>
        )}
      </ModalFooter>
    </ResponsiveModal>
  )
}
