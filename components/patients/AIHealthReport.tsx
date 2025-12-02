'use client'

import { useState, useCallback, useEffect } from 'react'
import { PatientProfile, PatientMedication, VitalSign, PatientDocument } from '@/types/medical'
import { HealthReport } from '@/types/providers'
import { SparklesIcon, ArrowPathIcon, PrinterIcon, ClipboardDocumentIcon, ClockIcon } from '@heroicons/react/24/outline'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { auth } from '@/lib/firebase'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ImageLightbox from '@/components/ui/ImageLightbox'
import HistoricalReportsModal from '@/components/providers/HistoricalReportsModal'

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
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null)
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [showHistoryModal, setShowHistoryModal] = useState(false)

  // Fetch today's report on component mount
  useEffect(() => {
    const fetchTodayReport = async () => {
      try {
        setLoading(true)
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        logger.info('[AI Health Report] Fetching today\'s report', { patientId: patient.id, date: today })

        const user = auth.currentUser
        if (!user) {
          throw new Error('Not authenticated')
        }
        const token = await user.getIdToken()

        // Try to fetch today's report
        const response = await fetch(`/api/patients/${patient.id}/health-reports?date=${today}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch health report')
        }

        const data = await response.json()

        if (data.report) {
          // Report exists - fetch it with view tracking
          logger.info('[AI Health Report] Today\'s report found, fetching with view tracking', {
            reportId: data.report.id
          })
          const viewResponse = await fetch(`/api/patients/${patient.id}/health-reports/${data.report.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (viewResponse.ok) {
            const viewData = await viewResponse.json()
            setHealthReport(viewData.report)
            logger.info('[AI Health Report] Report loaded and view tracked', {
              reportId: data.report.id,
              viewCount: viewData.report.viewCount
            })
          } else {
            // Fallback to the report from the first fetch
            setHealthReport(data.report)
          }
        } else {
          // No report exists for today - auto-generate it
          logger.info('[AI Health Report] No report found for today, auto-generating')
          await generateNewReport()
        }
      } catch (error: any) {
        const err = error instanceof Error ? error : new Error(String(error))
        logger.error('[AI Health Report] Error fetching today\'s report', err)
        toast.error('Failed to load health report')
      } finally {
        setLoading(false)
      }
    }

    if (patient.id) {
      fetchTodayReport()
    }
  }, [patient.id])

  // Generate or regenerate a report
  const generateNewReport = async (regenerate = false) => {
    try {
      setGenerating(true)
      const today = new Date().toISOString().split('T')[0]
      logger.info('[AI Health Report] Generating report', {
        patientId: patient.id,
        regenerate
      })

      const user = auth.currentUser
      if (!user) {
        throw new Error('Not authenticated')
      }
      const token = await user.getIdToken()

      const response = await fetch(`/api/patients/${patient.id}/health-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reportDate: today,
          regenerate
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[AI Health Report] API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        })
        const error = new Error(errorData.details || errorData.error || `API Error: ${response.status} ${response.statusText}`)
        logger.error('[AI Health Report] API Error', error)
        throw error
      }

      const data = await response.json()
      setHealthReport(data.report)
      setCheckedItems(new Set()) // Reset checkboxes when new report is generated
      toast.success(regenerate ? 'Report regenerated successfully!' : 'Report generated successfully!')
      logger.info('[AI Health Report] Report generated', {
        reportId: data.report.id,
        regenerate
      })

    } catch (error: any) {
      console.error('[AI Health Report] Full Error:', error)
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error('[AI Health Report] Error generating report', err)
      toast.error(error.message || 'Failed to generate health report')
    } finally {
      setGenerating(false)
    }
  }

  const handleRegenerateReport = () => {
    generateNewReport(true)
  }

  const handlePrint = useCallback(() => {
    if (!healthReport) return

    // Create a print-friendly window
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow pop-ups to print the report')
      return
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Health Summary Report - ${patient.name} - ${healthReport.reportDate}</title>
          <style>
            @page {
              margin: 0.75in;
              size: letter;
            }
            body {
              font-family: 'Georgia', 'Times New Roman', serif;
              font-size: 11pt;
              line-height: 1.6;
              color: #000;
              max-width: 100%;
            }
            h1 {
              font-size: 18pt;
              font-weight: bold;
              margin-top: 0;
              margin-bottom: 12pt;
              border-bottom: 2pt solid #333;
              padding-bottom: 8pt;
            }
            h2 {
              font-size: 14pt;
              font-weight: bold;
              margin-top: 16pt;
              margin-bottom: 8pt;
              border-bottom: 1pt solid #666;
              padding-bottom: 4pt;
            }
            h3 {
              font-size: 12pt;
              font-weight: bold;
              margin-top: 12pt;
              margin-bottom: 6pt;
            }
            p {
              margin: 8pt 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 12pt 0;
              font-size: 10pt;
            }
            th {
              background-color: #f0f0f0;
              font-weight: bold;
              text-align: left;
              padding: 6pt 8pt;
              border: 1pt solid #ccc;
            }
            td {
              padding: 6pt 8pt;
              border: 1pt solid #ccc;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            ul, ol {
              margin: 8pt 0;
              padding-left: 24pt;
            }
            li {
              margin: 4pt 0;
            }
            hr {
              border: none;
              border-top: 1pt solid #ccc;
              margin: 16pt 0;
            }
            strong {
              font-weight: bold;
            }
            .checkbox-item {
              margin: 4pt 0;
              display: flex;
              align-items: start;
            }
            .checkbox {
              width: 12pt;
              height: 12pt;
              border: 1pt solid #333;
              margin-right: 8pt;
              flex-shrink: 0;
              margin-top: 2pt;
            }
            img {
              max-width: 100%;
              height: auto;
              margin: 12pt 0;
              border: 1pt solid #ccc;
            }
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          ${healthReport.report ? convertMarkdownToHtml(healthReport.report) : ''}
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()

    // Wait for images to load before printing
    printWindow.onload = () => {
      printWindow.print()
    }
  }, [healthReport, patient.name])

  // Simple markdown to HTML converter for printing
  const convertMarkdownToHtml = (markdown: string): string => {
    let html = markdown

    // Convert headers
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')

    // Convert bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

    // Convert checkboxes
    html = html.replace(/- \[ \] (.+)/g, '<div class="checkbox-item"><div class="checkbox"></div><span>$1</span></div>')
    html = html.replace(/- \[x\] (.+)/g, '<div class="checkbox-item"><div class="checkbox">✓</div><span>$1</span></div>')

    // Convert unordered lists (but not checkboxes)
    html = html.replace(/^- (?!\[)(.+)$/gm, '<li>$1</li>')
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

    // Convert numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
      if (!match.includes('<ul>')) {
        return '<ol>' + match + '</ol>'
      }
      return match
    })

    // Convert horizontal rules
    html = html.replace(/^---$/gm, '<hr>')

    // Convert tables (basic)
    html = html.replace(/\|(.+)\|/g, (match, content) => {
      const cells = content.split('|').map((cell: string) => cell.trim())
      const isHeader = html.indexOf(match) === html.indexOf('|')
      const tag = isHeader ? 'th' : 'td'
      return '<tr>' + cells.map((cell: string) => `<${tag}>${cell}</${tag}>`).join('') + '</tr>'
    })
    html = html.replace(/(<tr>.*<\/tr>\n?)+/g, '<table>$&</table>')

    // Remove table separator rows
    html = html.replace(/<tr><td>-+<\/td>.*?<\/tr>/g, '')

    // Convert images
    html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1">')

    // Convert paragraphs
    html = html.replace(/^(?!<[h|u|o|t|d|hr|img])(.+)$/gm, '<p>$1</p>')

    return html
  }

  const handleCopy = useCallback(() => {
    if (!healthReport) return
    navigator.clipboard.writeText(healthReport.report).then(() => {
      toast.success('Report copied to clipboard!')
    }).catch((err) => {
      logger.error('[AI Health Report] Error copying to clipboard', err)
      toast.error('Failed to copy report')
    })
  }, [healthReport])

  return (
    <>
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-lg">Health Summary</h3>
              <p className="text-xs text-muted-foreground">
                {healthReport?.generatedAt
                  ? `Generated ${new Date(healthReport.generatedAt).toLocaleString()}`
                  : 'Daily auto-generated health analysis'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {healthReport && (
              <>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-foreground rounded-lg transition-colors text-sm font-medium"
                  title="Copy to clipboard"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  <span>Copy</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-foreground rounded-lg transition-colors text-sm font-medium"
                  title="Print report"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg transition-colors text-sm font-medium"
                  title="View historical reports"
                >
                  <ClockIcon className="w-4 h-4" />
                  <span>View History</span>
                </button>
              </>
            )}
            <button
              onClick={handleRegenerateReport}
              disabled={generating || loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  <span>Regenerating...</span>
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-5 h-5" />
                  <span>Regenerate</span>
                </>
              )}
            </button>
          </div>
        </div>

        {loading && !generating && (
          <div className="text-center py-12">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-purple-200 dark:bg-purple-800 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-purple-200 dark:bg-purple-800 rounded w-full"></div>
              <div className="h-4 bg-purple-200 dark:bg-purple-800 rounded w-5/6 mx-auto"></div>
              <div className="h-4 bg-purple-200 dark:bg-purple-800 rounded w-full"></div>
              <div className="h-4 bg-purple-200 dark:bg-purple-800 rounded w-2/3 mx-auto"></div>
            </div>
            <p className="text-purple-600 dark:text-purple-400 mt-4 text-sm">
              Loading today's health report...
            </p>
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
              Generating health report...
            </p>
          </div>
        )}

        {healthReport && !generating && !loading && (
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
                li: ({ node, children, ...props }) => {
                  // Check if this is a checkbox list item (task list)
                  const childrenArray = Array.isArray(children) ? children : [children]
                  const firstChild = childrenArray[0]

                  // Check for markdown task list syntax: "[ ]" or "[x]"
                  if (typeof firstChild === 'string') {
                    const checkboxMatch = firstChild.match(/^\[([ x])\]\s*(.*)/)
                    if (checkboxMatch) {
                      const isChecked = checkboxMatch[1] === 'x'
                      const text = checkboxMatch[2]
                      const itemKey = text.substring(0, 50) // Use first 50 chars as key

                      const localChecked = checkedItems.has(itemKey) || isChecked

                      return (
                        <li className="flex items-start gap-2 text-foreground" {...props}>
                          <input
                            type="checkbox"
                            checked={localChecked}
                            onChange={() => {
                              setCheckedItems(prev => {
                                const next = new Set(prev)
                                if (next.has(itemKey)) {
                                  next.delete(itemKey)
                                } else {
                                  next.add(itemKey)
                                }
                                return next
                              })
                            }}
                            className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                          />
                          <span className={localChecked ? 'line-through text-muted-foreground' : ''}>
                            {text}
                            {childrenArray.slice(1)}
                          </span>
                        </li>
                      )
                    }
                  }

                  return <li className="text-foreground" {...props}>{children}</li>
                },
                hr: ({ node, ...props }) => (
                  <hr className="my-6 border-gray-300 dark:border-gray-600" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-semibold text-foreground" {...props} />
                ),
                img: ({ node, src, alt, ...props }) => {
                  const imageUrl = typeof src === 'string' ? src : ''
                  return (
                    <span className="inline-block my-4 relative group">
                      <img
                        src={imageUrl}
                        alt={alt || 'Image'}
                        className="max-w-full h-auto rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setLightboxImage({ url: imageUrl, alt: alt || 'Image' })}
                        {...props}
                      />
                      <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-2 inline-block">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                        </svg>
                      </span>
                    </span>
                  )
                },
              }}
            >
              {healthReport.report}
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

        {healthReport && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Important:</strong> This automated summary is for informational purposes only and should not replace professional medical advice.
              Always consult with qualified healthcare providers for medical decisions.
            </p>
          </div>
        )}
      </div>

      {/* Historical Reports Modal */}
      {showHistoryModal && (
        <HistoricalReportsModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          patientId={patient.id}
          patientName={patient.name}
          initialReportDate={healthReport?.reportDate}
        />
      )}
    </>
  )
}
