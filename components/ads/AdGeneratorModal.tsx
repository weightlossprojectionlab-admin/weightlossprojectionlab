/**
 * Ad Generator Modal
 *
 * Allows users to generate marketing ads by selecting:
 * - Target persona
 * - Ad template
 * - Platform(s)
 * - Optional customizations (pricing, background image)
 */

'use client'

import { useState } from 'react'
import { ResponsiveModal, ModalFooter, ModalButton } from '@/components/ui/ResponsiveModal'
import {
  AdPersona,
  AdTemplate,
  getTemplatesByPersona,
  PERSONA_INFO,
  getAllTemplates
} from '@/lib/ad-templates'
import {
  AdPlatform,
  AD_PLATFORM_SPECS,
  generateAdvertisement,
  getAdFilename,
  downloadAd
} from '@/lib/ad-generator'
import {
  getBackgroundImage,
  BACKGROUND_PRESETS
} from '@/lib/ad-background-generator'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'

interface AdGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 'persona' | 'template' | 'platform' | 'customize' | 'preview'

export function AdGeneratorModal({ isOpen, onClose }: AdGeneratorModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('persona')
  const [selectedPersona, setSelectedPersona] = useState<AdPersona | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<AdTemplate | null>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<AdPlatform[]>([])
  const [showPricing, setShowPricing] = useState(false)
  const [pricingText, setPricingText] = useState('$9.99/mo')
  const [backgroundImage, setBackgroundImage] = useState('')
  const [backgroundMethod, setBackgroundMethod] = useState<'gradient' | 'abstract' | 'stock' | 'ai' | 'custom'>('gradient')
  const [generatingBackground, setGeneratingBackground] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleClose = () => {
    // Reset state
    setCurrentStep('persona')
    setSelectedPersona(null)
    setSelectedTemplate(null)
    setSelectedPlatforms([])
    setShowPricing(false)
    setPricingText('$9.99/mo')
    setBackgroundImage('')
    setPreviewBlob(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    onClose()
  }

  const handlePersonaSelect = (persona: AdPersona) => {
    setSelectedPersona(persona)
    setCurrentStep('template')
  }

  const handleTemplateSelect = (template: AdTemplate) => {
    setSelectedTemplate(template)
    setCurrentStep('platform')
  }

  const handlePlatformToggle = (platform: AdPlatform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const handleNext = () => {
    if (currentStep === 'platform' && selectedPlatforms.length > 0) {
      setCurrentStep('customize')
    } else if (currentStep === 'customize') {
      generatePreview()
    }
  }

  const handleBack = () => {
    if (currentStep === 'template') setCurrentStep('persona')
    else if (currentStep === 'platform') setCurrentStep('template')
    else if (currentStep === 'customize') setCurrentStep('platform')
    else if (currentStep === 'preview') setCurrentStep('customize')
  }

  const handleGenerateBackground = async () => {
    if (!selectedTemplate || !selectedPersona) return

    setGeneratingBackground(true)
    try {
      const platform = selectedPlatforms[0]
      const spec = AD_PLATFORM_SPECS[platform]

      const bgUrl = await getBackgroundImage(
        {
          persona: selectedPersona,
          template: selectedTemplate
        },
        backgroundMethod === 'custom' ? 'gradient' : backgroundMethod,
        { width: spec.width, height: spec.height }
      )

      setBackgroundImage(bgUrl)
      toast.success('Background generated!')
    } catch (error) {
      logger.error('Failed to generate background', error as Error)
      toast.error('Failed to generate background. Using gradient fallback.')
    } finally {
      setGeneratingBackground(false)
    }
  }

  const generatePreview = async () => {
    if (!selectedTemplate) return

    setGenerating(true)
    try {
      // Generate preview for first selected platform
      const platform = selectedPlatforms[0]
      const blob = await generateAdvertisement({
        template: selectedTemplate,
        platform,
        backgroundImage: backgroundImage || undefined,
        showPricing,
        pricingText: showPricing ? pricingText : undefined
      })

      setPreviewBlob(blob)
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      setCurrentStep('preview')
    } catch (error) {
      logger.error('Failed to generate ad preview', error as Error)
      toast.error('Failed to generate preview. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadAll = async () => {
    if (!selectedTemplate || selectedPlatforms.length === 0) return

    setGenerating(true)
    let successCount = 0

    try {
      for (const platform of selectedPlatforms) {
        try {
          const blob = await generateAdvertisement({
            template: selectedTemplate,
            platform,
            backgroundImage: backgroundImage || undefined,
            showPricing,
            pricingText: showPricing ? pricingText : undefined
          })

          const filename = getAdFilename(selectedTemplate, platform)
          downloadAd(blob, filename)
          successCount++

          // Small delay between downloads to prevent browser blocking
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          logger.error('Failed to generate ad for platform', error as Error, { platform })
        }
      }

      toast.success(`Downloaded ${successCount} of ${selectedPlatforms.length} ads!`)
      handleClose()
    } catch (error) {
      logger.error('Failed to download ads', error as Error)
      toast.error('Failed to download ads. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'persona':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Who are you targeting?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose the audience persona for your ad campaign
              </p>
            </div>

            <div className="grid gap-4">
              {(Object.keys(PERSONA_INFO) as AdPersona[]).map((persona) => {
                const info = PERSONA_INFO[persona]
                return (
                  <button
                    key={persona}
                    onClick={() => handlePersonaSelect(persona)}
                    className="text-left p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-muted transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-4xl">{info.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1">{info.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{info.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Target: {info.targetAudience}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )

      case 'template':
        if (!selectedPersona) return null
        const templates = getTemplatesByPersona(selectedPersona)

        return (
          <div className="space-y-4">
            <div>
              <button
                onClick={handleBack}
                className="text-sm text-primary hover:underline mb-2 flex items-center gap-1"
              >
                ← Back to personas
              </button>
              <h3 className="text-lg font-semibold mb-2">Choose your message</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select the template that resonates with your audience
              </p>
            </div>

            <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="text-left p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-muted transition-all"
                >
                  <div className="mb-2">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {template.type}
                    </span>
                  </div>
                  <h4 className="font-bold text-foreground mb-1">{template.headline}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{template.subheadline}</p>
                  <p className="text-xs text-muted-foreground italic">
                    "{template.emotionalHook}"
                  </p>
                </button>
              ))}
            </div>
          </div>
        )

      case 'platform':
        return (
          <div className="space-y-4">
            <div>
              <button
                onClick={handleBack}
                className="text-sm text-primary hover:underline mb-2 flex items-center gap-1"
              >
                ← Back to templates
              </button>
              <h3 className="text-lg font-semibold mb-2">Select platforms</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose where you want to run your ads (select multiple)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(AD_PLATFORM_SPECS) as AdPlatform[]).map((platform) => {
                const spec = AD_PLATFORM_SPECS[platform]
                const isSelected = selectedPlatforms.includes(platform)

                return (
                  <button
                    key={platform}
                    onClick={() => handlePlatformToggle(platform)}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {isSelected && <span className="text-primary">✓</span>}
                      <h4 className="font-semibold text-sm">{spec.name}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {spec.aspectRatio} • {spec.width}×{spec.height}
                    </p>
                  </button>
                )
              })}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        )

      case 'customize':
        return (
          <div className="space-y-4">
            <div>
              <button
                onClick={handleBack}
                className="text-sm text-primary hover:underline mb-2 flex items-center gap-1"
              >
                ← Back to platforms
              </button>
              <h3 className="text-lg font-semibold mb-2">Customize your ad</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Optional: Add pricing or background image
              </p>
            </div>

            <div className="space-y-4">
              {/* Show Pricing Toggle */}
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <label className="font-medium text-sm">Show Pricing</label>
                  <p className="text-xs text-muted-foreground">Display price on ad</p>
                </div>
                <button
                  onClick={() => setShowPricing(!showPricing)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showPricing ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showPricing ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Pricing Text Input */}
              {showPricing && (
                <div className="p-4 border border-border rounded-lg">
                  <label className="block text-sm font-medium mb-2">Pricing Text</label>
                  <input
                    type="text"
                    value={pricingText}
                    onChange={(e) => setPricingText(e.target.value)}
                    placeholder="$9.99/mo"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              )}

              {/* Background Type Selector */}
              <div className="p-4 border border-border rounded-lg">
                <label className="block text-sm font-medium mb-3">Background Type</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { value: 'gradient', label: '🌈 Gradient', desc: 'Fast, template colors' },
                    { value: 'abstract', label: '🎨 Abstract', desc: 'Artistic patterns' },
                    { value: 'stock', label: '📸 Stock Photo', desc: 'Free from Unsplash' },
                    { value: 'ai', label: '🤖 AI Generated', desc: 'DALL-E (requires API key)' },
                    { value: 'custom', label: '🔗 Custom URL', desc: 'Your own image' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setBackgroundMethod(option.value as any)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        backgroundMethod === option.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary hover:bg-muted'
                      }`}
                    >
                      <div className="font-semibold text-sm mb-1">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Custom URL Input */}
                {backgroundMethod === 'custom' && (
                  <input
                    type="text"
                    value={backgroundImage}
                    onChange={(e) => setBackgroundImage(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground mb-2"
                  />
                )}

                {/* Generate Button for AI/Stock/Abstract */}
                {backgroundMethod !== 'gradient' && backgroundMethod !== 'custom' && (
                  <button
                    onClick={handleGenerateBackground}
                    disabled={generatingBackground}
                    className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {generatingBackground ? 'Generating...' : `Generate ${backgroundMethod === 'ai' ? 'AI' : backgroundMethod === 'stock' ? 'Stock' : 'Abstract'} Background`}
                  </button>
                )}

                {backgroundImage && (
                  <div className="mt-2 p-2 bg-success/10 border border-success/20 rounded text-xs text-success">
                    ✓ Background ready
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 'preview':
        return (
          <div className="space-y-4">
            <div>
              <button
                onClick={handleBack}
                className="text-sm text-primary hover:underline mb-2 flex items-center gap-1"
              >
                ← Back to customize
              </button>
              <h3 className="text-lg font-semibold mb-2">Preview & Download</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Preview for {AD_PLATFORM_SPECS[selectedPlatforms[0]].name}
              </p>
            </div>

            {previewUrl && (
              <div className="border border-border rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Ad preview"
                  className="w-full h-auto"
                />
              </div>
            )}

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Ready to download:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {selectedPlatforms.map((platform) => (
                  <li key={platform}>• {AD_PLATFORM_SPECS[platform].name}</li>
                ))}
              </ul>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const renderFooter = () => {
    if (currentStep === 'persona' || currentStep === 'template') {
      return null // Navigation handled by clicking cards
    }

    if (currentStep === 'platform') {
      return (
        <ModalFooter align="right">
          <ModalButton onClick={handleBack} variant="secondary">
            Back
          </ModalButton>
          <ModalButton
            onClick={handleNext}
            variant="primary"
            disabled={selectedPlatforms.length === 0}
          >
            Next
          </ModalButton>
        </ModalFooter>
      )
    }

    if (currentStep === 'customize') {
      return (
        <ModalFooter align="right">
          <ModalButton onClick={handleBack} variant="secondary">
            Back
          </ModalButton>
          <ModalButton onClick={handleNext} variant="primary" disabled={generating}>
            {generating ? 'Generating...' : 'Generate Preview'}
          </ModalButton>
        </ModalFooter>
      )
    }

    if (currentStep === 'preview') {
      return (
        <ModalFooter align="right">
          <ModalButton onClick={handleBack} variant="secondary" disabled={generating}>
            Back
          </ModalButton>
          <ModalButton onClick={handleDownloadAll} variant="primary" disabled={generating}>
            {generating ? 'Downloading...' : `Download All (${selectedPlatforms.length})`}
          </ModalButton>
        </ModalFooter>
      )
    }

    return null
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generate Marketing Ad"
      size="lg"
      footer={renderFooter()}
    >
      {renderStepContent()}
    </ResponsiveModal>
  )
}
