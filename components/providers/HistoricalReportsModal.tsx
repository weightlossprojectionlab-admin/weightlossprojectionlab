'use client'

import { useState, useEffect, useCallback } from 'react'
import { HealthReport } from '@/types/providers'
import {
  XMarkIcon,
  DocumentTextIcon,
  CalendarIcon,
  PrinterIcon,
  ClipboardDocumentIcon,
  EnvelopeIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { auth } from '@/lib/firebase'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ImageLightbox from '@/components/ui/ImageLightbox'

interface HistoricalReportsModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  patientName: string
  initialReportDate?: string // Default to today
}

export default function HistoricalReportsModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  initialReportDate
}: HistoricalReportsModalProps) {
  const [reports, setReports] = useState<HealthReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<HealthReport | null>(null)
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  // Fetch available reports
  useEffect(() => {
    if (!isOpen || !patientId) return

    const fetchReports = async () => {
      try {
        setLoading(true)
        logger.info('[Historical Reports] Fetching reports', { patientId })

        const user = auth.currentUser
        if (!user) {
          throw new Error('Not authenticated')
        }
        const token = await user.getIdToken()

        const response = await fetch(`/api/patients/${patientId}/health-reports`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch health reports')
        }

        const data = await response.json()
        setReports(data.reports || [])

        // Select initial report (either passed in or most recent)
        if (data.reports && data.reports.length > 0) {
          if (initialReportDate) {
            const initial = data.reports.find((r: HealthReport) => r.reportDate === initialReportDate)
            setSelectedReport(initial || data.reports[0])
          } else {
            setSelectedReport(data.reports[0])
          }
        }

      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        logger.error('[Historical Reports] Error fetching reports', err)
        toast.error('Failed to load health reports')
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [isOpen, patientId, initialReportDate])

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

  const handlePrint = useCallback(() => {
    if (!selectedReport) return

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
          <title>Health Summary Report - ${patientName} - ${selectedReport.reportDate}</title>
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
          ${convertMarkdownToHtml(selectedReport.report)}
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()

    printWindow.onload = () => {
      printWindow.print()
    }
  }, [selectedReport, patientName])

  const handleCopy = useCallback(() => {
    if (!selectedReport) return
    navigator.clipboard.writeText(selectedReport.report).then(() => {
      toast.success('Report copied to clipboard!')
    }).catch((err) => {
      logger.error('[Historical Reports] Error copying to clipboard', err)
      toast.error('Failed to copy report')
    })
  }, [selectedReport])

  const handleEmailReport = useCallback(() => {
    // TODO: Open SendReportModal when implemented
    toast.success('Email feature coming soon!')
  }, [])

  const handleExportPDF = useCallback(() => {
    toast('PDF export coming soon!', { icon: '📄' })
  }, [])

  // Track view count when report is selected
  useEffect(() => {
    if (!selectedReport) return

    const trackView = async () => {
      try {
        const user = auth.currentUser
        if (!user) return
        const token = await user.getIdToken()

        await fetch(`/api/patients/${patientId}/health-reports/${selectedReport.id}/view`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      } catch (error) {
        // Silent fail for analytics
        logger.warn('[Historical Reports] Failed to track view', { error })
      }
    }

    trackView()
  }, [selectedReport, patientId])

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const reportDate = new Date(date)
    reportDate.setHours(0, 0, 0, 0)

    if (reportDate.getTime() === today.getTime()) {
      return 'Today'
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isToday = (dateString: string): boolean => {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const reportDate = new Date(date)
    reportDate.setHours(0, 0, 0, 0)
    return reportDate.getTime() === today.getTime()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-lg shadow-xl w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="w-6 h-6 text-purple-600" />
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Historical Health Reports
                </h2>
                <p className="text-sm text-muted-foreground">
                  {patientName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex">
            {/* Left Sidebar - Report List */}
            <div className="w-64 border-r border-border overflow-y-auto bg-gray-50 dark:bg-gray-900/20">
              <div className="p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Available Reports
                </h3>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No reports found
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reports.map((report) => (
                      <button
                        key={report.id}
                        onClick={() => {
                          setSelectedReport(report)
                          setCheckedItems(new Set()) // Reset checkboxes when switching reports
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedReport?.id === report.id
                            ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500'
                            : 'bg-white dark:bg-gray-800 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            <span className="font-medium text-sm text-foreground">
                              {formatDate(report.reportDate)}
                            </span>
                          </div>
                          {isToday(report.reportDate) && (
                            <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full font-medium">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                          <div className="flex items-center gap-1">
                            <EyeIcon className="w-3 h-3" />
                            <span>{report.viewCount || 0}</span>
                          </div>
                          {report.emailedCount && report.emailedCount > 0 && (
                            <div className="flex items-center gap-1">
                              <EnvelopeIcon className="w-3 h-3" />
                              <span>{report.emailedCount}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Main Area - Report Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 space-y-4">
                  <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full animate-pulse" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6 animate-pulse" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full animate-pulse" />
                </div>
              ) : !selectedReport ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-muted-foreground">
                      Select a report to view
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-8">
                  {/* Report Metadata */}
                  <div className="mb-6 pb-6 border-b border-border">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-foreground mb-2">
                          Health Summary - {formatDate(selectedReport.reportDate)}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            <span>
                              Generated {new Date(selectedReport.generatedAt.toString()).toLocaleString()}
                            </span>
                          </div>
                          {selectedReport.generatedByName && (
                            <span>by {selectedReport.generatedByName}</span>
                          )}
                          <div className="flex items-center gap-1">
                            <EyeIcon className="w-4 h-4" />
                            <span>{selectedReport.viewCount || 0} views</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
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
                          onClick={handleEmailReport}
                          className="flex items-center gap-1.5 px-3 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg transition-colors text-sm font-medium"
                          title="Email to provider"
                        >
                          <EnvelopeIcon className="w-4 h-4" />
                          <span>Email</span>
                        </button>
                        <button
                          onClick={handleExportPDF}
                          disabled
                          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-muted-foreground rounded-lg transition-colors text-sm font-medium opacity-50 cursor-not-allowed"
                          title="Export PDF (coming soon)"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>

                    {/* Included Data Summary */}
                    {selectedReport.includedData && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4">
                        <span>Report includes:</span>
                        {selectedReport.includedData.vitalsCount > 0 && (
                          <span>{selectedReport.includedData.vitalsCount} vitals</span>
                        )}
                        {selectedReport.includedData.mealsCount > 0 && (
                          <span>{selectedReport.includedData.mealsCount} meals</span>
                        )}
                        {selectedReport.includedData.weightLogsCount > 0 && (
                          <span>{selectedReport.includedData.weightLogsCount} weight logs</span>
                        )}
                        {selectedReport.includedData.stepsLogsCount > 0 && (
                          <span>{selectedReport.includedData.stepsLogsCount} step logs</span>
                        )}
                        {selectedReport.includedData.medicationsCount > 0 && (
                          <span>{selectedReport.includedData.medicationsCount} medications</span>
                        )}
                        {selectedReport.includedData.documentsCount > 0 && (
                          <span>{selectedReport.includedData.documentsCount} documents</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Report Content */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 prose prose-sm dark:prose-invert max-w-none">
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
                          const hasBlockChild = Array.isArray(children) && children.some(
                            (child: any) => child?.type === 'div' || (child?.props?.node?.tagName === 'img')
                          )

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
                          const childrenArray = Array.isArray(children) ? children : [children]
                          const firstChild = childrenArray[0]

                          if (typeof firstChild === 'string') {
                            const checkboxMatch = firstChild.match(/^\[([ x])\]\s*(.*)/)
                            if (checkboxMatch) {
                              const isChecked = checkboxMatch[1] === 'x'
                              const text = checkboxMatch[2]
                              const itemKey = text.substring(0, 50)

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
                      {selectedReport.report}
                    </ReactMarkdown>
                  </div>

                  {/* Disclaimer */}
                  <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      <strong>Important:</strong> This automated summary is for informational purposes only and should not replace professional medical advice.
                      Always consult with qualified healthcare providers for medical decisions.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage.url}
          alt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </>
  )
}
