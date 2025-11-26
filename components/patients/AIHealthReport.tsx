'use client'

import { useState } from 'react'
import { PatientProfile, PatientMedication, VitalSign, PatientDocument } from '@/types/medical'
import { SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { auth } from '@/lib/firebase'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ImageLightbox from '@/components/ui/ImageLightbox'

interface AIHealthReportProps {
  patient: PatientProfile
  medications: PatientMedication[]
  vitals: VitalSign[]
  documents: PatientDocument[]
  todayMeals: any[]
  weightData: any[]
  stepsData: any[]
}

export function AIHealthReport({
  patient,
  medications,
  vitals,
  documents,
  todayMeals,
  weightData,
  stepsData
}: AIHealthReportProps) {
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null)

  const generateReport = async () => {
    try {
      setGenerating(true)
      logger.info('[AI Health Report] Generating report', { patientId: patient.id })

      // Get auth token
      const user = auth.currentUser
      if (!user) {
        throw new Error('Not authenticated')
      }
      const token = await user.getIdToken()

      const response = await fetch(`/api/patients/${patient.id}/ai-health-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patient,
          medications,
          vitals: vitals.slice(0, 20), // Last 20 vitals
          documents: documents.slice(0, 10), // Last 10 documents
          todayMeals,
          weightData: weightData.slice(0, 30), // Last 30 days
          stepsData: stepsData.slice(0, 30) // Last 30 days
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[AI Health Report] API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        })
        logger.error('[AI Health Report] API Error', { status: response.status, errorData })
        throw new Error(errorData.details || errorData.error || `API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      setReport(data.report)
      setLastGenerated(new Date())
      toast.success('Health report generated!')

    } catch (error: any) {
      console.error('[AI Health Report] Full Error:', error)
      logger.error('[AI Health Report] Error generating report', { message: error.message, stack: error.stack })
      toast.error(error.message || 'Failed to generate health report')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg">AI Health Summary</h3>
            <p className="text-xs text-muted-foreground">
              {lastGenerated ? `Generated ${lastGenerated.toLocaleString()}` : 'Comprehensive health analysis'}
            </p>
          </div>
        </div>
        <button
          onClick={generateReport}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5" />
              <span>{report ? 'Regenerate' : 'Generate Report'}</span>
            </>
          )}
        </button>
      </div>

      {!report && !generating && (
        <div className="text-center py-8">
          <SparklesIcon className="w-16 h-16 mx-auto text-purple-300 dark:text-purple-600 mb-3" />
          <p className="text-muted-foreground mb-4">
            Click the button above to generate an AI-powered health summary analyzing:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 text-left max-w-md mx-auto">
            <li>✓ Vital signs and health metrics</li>
            <li>✓ Weight trends and progress</li>
            <li>✓ Nutrition and meal patterns</li>
            <li>✓ Activity and step tracking</li>
            <li>✓ Current medications</li>
            <li>✓ Medical documents and history</li>
          </ul>
        </div>
      )}

      {generating && (
        <div className="text-center py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-purple-200 dark:bg-purple-800 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-purple-200 dark:bg-purple-800 rounded w-full"></div>
            <div className="h-4 bg-purple-200 dark:bg-purple-800 rounded w-5/6 mx-auto"></div>
            <div className="h-4 bg-purple-200 dark:bg-purple-800 rounded w-full"></div>
            <div className="h-4 bg-purple-200 dark:bg-purple-800 rounded w-2/3 mx-auto"></div>
          </div>
          <p className="text-purple-600 dark:text-purple-400 mt-4 text-sm">
            Analyzing health data with AI...
          </p>
        </div>
      )}

      {report && !generating && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 prose prose-sm dark:prose-invert max-w-none max-h-[600px] overflow-y-auto">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ node, ...props }) => (
                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600 my-4" {...props} />
              ),
              thead: ({ node, ...props }) => (
                <thead className="bg-gray-50 dark:bg-gray-700" {...props} />
              ),
              th: ({ node, ...props }) => (
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider" {...props} />
              ),
              td: ({ node, ...props }) => (
                <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap" {...props} />
              ),
              tr: ({ node, ...props }) => (
                <tr className="border-b border-gray-200 dark:border-gray-700" {...props} />
              ),
              h1: ({ node, ...props }) => (
                <h1 className="text-3xl font-bold mt-6 mb-4 text-foreground" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-2xl font-bold mt-6 mb-3 text-foreground border-b border-gray-300 dark:border-gray-600 pb-2" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground" {...props} />
              ),
              p: ({ node, children, ...props }) => {
                // Check if children contain block elements (like divs from images)
                const hasBlockChild = Array.isArray(children) && children.some(
                  (child: any) => child?.type === 'div' || (child?.props?.node?.tagName === 'img')
                )

                // If contains block elements, render as div instead of p
                if (hasBlockChild) {
                  return <div className="my-3 text-foreground leading-relaxed" {...props}>{children}</div>
                }

                return <p className="my-3 text-foreground leading-relaxed" {...props}>{children}</p>
              },
              ul: ({ node, ...props }) => (
                <ul className="my-3 ml-6 list-disc text-foreground space-y-1" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="my-3 ml-6 list-decimal text-foreground space-y-1" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="text-foreground" {...props} />
              ),
              hr: ({ node, ...props }) => (
                <hr className="my-6 border-gray-300 dark:border-gray-600" {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong className="font-semibold text-foreground" {...props} />
              ),
              img: ({ node, src, alt, ...props }) => (
                <div className="my-4 relative group">
                  <img
                    src={src}
                    alt={alt || 'Image'}
                    className="max-w-full h-auto rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxImage({ url: src || '', alt: alt || 'Image' })}
                    {...props}
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-2">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </div>
                </div>
              ),
            }}
          >
            {report}
          </ReactMarkdown>
        </div>
      )}

      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage.url}
          alt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
        />
      )}

      {report && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <strong>⚠️ Important:</strong> This AI-generated summary is for informational purposes only and should not replace professional medical advice.
            Always consult with qualified healthcare providers for medical decisions.
          </p>
        </div>
      )}
    </div>
  )
}
