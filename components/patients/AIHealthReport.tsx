'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  PatientProfile,
  PatientMedication,
  VitalSign,
  PatientDocument,
  Immunization,
  MedicalEquipment,
  FamilyHistoryEntry,
  Appointment,
} from '@/types/medical'
import { SparklesIcon, ArrowPathIcon, PrinterIcon, ClipboardDocumentIcon, PlusIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { auth } from '@/lib/firebase'
import { getCSRFToken } from '@/lib/csrf'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ImageLightbox from '@/components/ui/ImageLightbox'
import { useAuth } from '@/hooks/useAuth'
import { canAccessFeature } from '@/lib/feature-gates'
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt'
import { addManualShoppingItem, removeFromShoppingList } from '@/lib/shopping-operations'
import { useShopping } from '@/hooks/useShopping'

// Normalize a shopping-item string for set membership / matching.
const normalizeItem = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

// Best-effort inventory match. Exact normalized match first, then a CONSERVATIVE
// whole-word match (inventory name ≥4 chars appearing as a word in the report item).
// Deliberately strict — a missed match (no chip) is fine; a false "in stock" is not.
const matchStock = (
  norm: string,
  invMap: Map<string, 'in_stock' | 'low'>
): 'in_stock' | 'low' | undefined => {
  const exact = invMap.get(norm)
  if (exact) return exact
  for (const [name, status] of invMap) {
    if (name.length < 4) continue
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    if (re.test(norm)) return status
  }
  return undefined
}

interface AIHealthReportProps {
  patient: PatientProfile
  medications: PatientMedication[]
  vitals: VitalSign[]
  documents: PatientDocument[]
  todayMeals: any[]
  weightData: any[]
  stepsData: any[]
  // Phase B–E entities — wired in 2026-05-10 to close the gap
  // where the report ignored everything from the medical-binder
  // gap close (immunizations, equipment, family history, visits).
  immunizations?: Immunization[]
  equipment?: MedicalEquipment[]
  familyHistory?: FamilyHistoryEntry[]
  appointments?: Appointment[]
}

export function AIHealthReport({
  patient,
  medications,
  vitals,
  documents,
  todayMeals,
  weightData,
  stepsData,
  immunizations = [],
  equipment = [],
  familyHistory = [],
  appointments = [],
}: AIHealthReportProps) {
  const { user } = useAuth()
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  // --- Actionable Shopping & Supply items (scoped strictly to that section) ---
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set())
  const [addingItem, setAddingItem] = useState<string | null>(null)

  // Live shopping list via Firestore onSnapshot — add/remove now reflect across devices.
  // (The prior one-time getDocs read served a stale local cache on the other device even
  // after refresh.) On-list + inventory are DERIVED from this single live source.
  const { items: shoppingItems } = useShopping()

  const onListItems = useMemo(() => {
    const set = new Set<string>()
    for (const it of shoppingItems) {
      if (!it.needed) continue
      const name = normalizeItem(it.manualIngredientName || it.productName || '')
      if (name) set.add(name)
    }
    return set
  }, [shoppingItems])

  const inventory = useMemo(() => {
    const map = new Map<string, 'in_stock' | 'low'>()
    for (const it of shoppingItems) {
      if (it.needed) continue // needed==false = on-hand inventory
      const name = normalizeItem(it.manualIngredientName || it.productName || '')
      if (!name) continue
      const low = typeof it.lowStockThreshold === 'number' && it.quantity <= it.lowStockThreshold
      map.set(name, low ? 'low' : 'in_stock')
    }
    return map
  }, [shoppingItems])

  // Deterministic parse of the report string → the set of item texts that live under
  // the "Shopping & Supply Lists" heading (until the next heading). No reliance on
  // ReactMarkdown traversal order; the bold sub-labels aren't headings so both the
  // grocery + medical groups are included.
  const shoppingItemTexts = useMemo(() => {
    const set = new Set<string>()
    if (!report) return set
    let inSection = false
    for (const raw of report.split('\n')) {
      const heading = raw.match(/^#{1,6}\s+(.*)$/)
      if (heading) {
        inSection = /shopping\s*&?\s*supply/i.test(heading[1])
        continue
      }
      if (inSection) {
        const item = raw.match(/^\s*[-*]\s*\[[ xX]\]\s*(.+?)\s*$/)
        if (item) set.add(normalizeItem(item[1]))
      }
    }
    return set
  }, [report])

  const handleAddShoppingItem = async (text: string) => {
    const clean = text.trim()
    const norm = normalizeItem(text)
    if (!user?.uid) {
      toast.error('Sign in to add items to your shopping list')
      return
    }
    setAddingItem(norm)
    try {
      // Verbatim free-text add — no canonical match needed, so no misclassification.
      await addManualShoppingItem(user.uid, clean, { quantity: 1 })
      setAddedItems(prev => new Set(prev).add(norm))
      toast.success(`Added "${clean}" to shopping list`)
    } catch {
      toast.error('Failed to add item to shopping list')
    } finally {
      setAddingItem(null)
    }
  }

  // Symmetric undo: if you can add it, you can take it back off the list. Finds the
  // list row by name and removes it (removeFromShoppingList → needed:false, audited).
  const handleRemoveShoppingItem = async (text: string) => {
    const clean = text.trim()
    const norm = normalizeItem(text)
    if (!user?.uid) return
    setAddingItem(norm)
    try {
      // Locate the row in the LIVE list (no extra query); the onSnapshot then drops it
      // from onListItems across devices.
      const target = shoppingItems.find(
        (it) => it.needed && normalizeItem(it.manualIngredientName || it.productName || '') === norm
      )
      if (target?.id) {
        await removeFromShoppingList(target.id, user.uid, 'changed_mind')
      }
      setAddedItems(prev => {
        const next = new Set(prev)
        next.delete(norm)
        return next
      })
      toast.success(`Removed "${clean}" from shopping list`)
    } catch {
      toast.error('Failed to remove item')
    } finally {
      setAddingItem(null)
    }
  }

  const generateReport = async () => {
    try {
      setGenerating(true)
      logger.info('[AI Health Report] Generating report', { patientId: patient.id })

      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')
      const token = await user.getIdToken()

      const response = await fetch(`/api/patients/${patient.id}/ai-health-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': getCSRFToken()
        },
        body: JSON.stringify({
          patient,
          medications,
          vitals: vitals.slice(0, 20),
          documents: documents.slice(0, 10),
          todayMeals,
          weightData: weightData.slice(0, 30),
          stepsData: stepsData.slice(0, 30),
          // Phase B–E — full lists; small enough that slicing isn't needed.
          immunizations,
          equipment,
          familyHistory,
          appointments,
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API Error: ${response.status}`)
      }

      const data = await response.json()
      setReport(data.report)
      setLastGenerated(new Date())
      setCheckedItems(new Set()) // Reset checkboxes when new report is generated
      toast.success('Health report generated!')

    } catch (error: any) {
      console.error('[AI Health Report] Full Error:', error)
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error('[AI Health Report] Error generating report', err)
      toast.error(error.message || 'Failed to generate health report')
    } finally {
      setGenerating(false)
    }
  }

  const handlePrint = useCallback(() => {
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
          <title>Health Summary Report - ${patient.name}</title>
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
          ${report ? convertMarkdownToHtml(report) : ''}
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()

    // Wait for images to load before printing
    printWindow.onload = () => {
      printWindow.print()
    }
  }, [report, patient.name])

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
    if (!report) return
    navigator.clipboard.writeText(report).then(() => {
      toast.success('Report copied to clipboard!')
    }).catch((err) => {
      logger.error('[AI Health Report] Error copying to clipboard', err)
      toast.error('Failed to copy report')
    })
  }, [report])

  // Feature gate check
  const hasAccess = canAccessFeature(user as any, 'health-reports')

  // Show upgrade prompt if no access
  if (!hasAccess) {
    return (
      <UpgradePrompt
        feature="health-reports"
        featureName="Unlock AI Health Reports"
        icon="🏥"
        message="Get comprehensive health analysis and insights. Available on Single Plus or higher plans."
        suggestedPlan="single_plus"
        size="lg"
        variant="card"
      />
    )
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg">Health Summary</h3>
            <p className="text-xs text-muted-foreground">
              {lastGenerated ? `Generated ${lastGenerated.toLocaleString()}` : 'Comprehensive health analysis'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {report && (
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
            </>
          )}
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
      </div>

      {!report && !generating && (
        <div className="text-center py-8">
          <SparklesIcon className="w-16 h-16 mx-auto text-purple-300 dark:text-purple-600 mb-3" />
          <p className="text-muted-foreground mb-4">
            Click the button above to generate a comprehensive health summary analyzing:
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
            Analyzing health data...
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
              li: ({ node, children, ...props }) => {
                // Check if this is a checkbox list item (task list)
                const childrenArray = Array.isArray(children) ? children : [children]
                const firstChild = childrenArray[0]

                // remark-gfm renders `- [ ]` as a task-list item whose first child is a
                // checkbox <input> ELEMENT (not the string "[ ] text"). Derive the label
                // for BOTH shapes so Shopping & Supply items can become actionable.
                const isCheckboxEl = (c: any) =>
                  !!c && typeof c === 'object' && (c.props?.type === 'checkbox' || c.type === 'input')
                const taskLabel = childrenArray.some(isCheckboxEl)
                  ? childrenArray.filter((c: any) => !isCheckboxEl(c)).map((c: any) => (typeof c === 'string' ? c : '')).join('').trim()
                  : typeof firstChild === 'string' && /^\[[ xX]\]/.test(firstChild)
                    ? (firstChild.replace(/^\[[ xX]\]\s*/, '') + childrenArray.slice(1).map((c: any) => (typeof c === 'string' ? c : '')).join('')).trim()
                    : ''

                // Actionable Shopping & Supply row: [stock chip] item text [+ Add].
                // Scoped by shoppingItemTexts so ONLY that section becomes interactive.
                if (taskLabel && shoppingItemTexts.has(normalizeItem(taskLabel))) {
                  const label = taskLabel
                  const norm = normalizeItem(label)
                  const added = addedItems.has(norm)
                  const onList = !added && onListItems.has(norm)
                  const stock = matchStock(norm, inventory)
                  return (
                    // Mobile-first, fat-thumb: {...props} FIRST so react-markdown's task-list
                    // className can't clobber our flex layout. Name left (wraps, never
                    // truncates — caregivers must read the full item); chip + a solid ≥44px
                    // Add button aligned right so every row's action lines up in a column.
                    // Extra vertical spacing (my-2) reduces mis-taps between rows.
                    <li {...props} className="flex items-center gap-2 my-2 list-none -ml-6 text-foreground">
                      <span className="flex-1 min-w-0 leading-snug">{label}</span>
                      {stock && (
                        <span className={`flex-shrink-0 px-2 py-1 rounded-md text-xs font-semibold ${stock === 'low' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                          {stock === 'low' ? 'Low' : 'In stock'}
                        </span>
                      )}
                      {added || onList ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveShoppingItem(label)}
                          disabled={addingItem === norm}
                          className="flex-shrink-0 inline-flex items-center justify-center gap-1 min-h-[44px] px-3 rounded-lg text-sm font-semibold text-green-700 bg-green-50 hover:bg-red-50 hover:text-red-700 active:bg-red-100 disabled:opacity-60 transition-colors"
                          aria-label={`Remove ${label} from shopping list`}
                          title="Tap to remove from shopping list"
                        >
                          <CheckCircleIcon className="w-5 h-5" />
                          <span>{added ? 'Added' : 'On list'}</span>
                          <XMarkIcon className="w-4 h-4 opacity-70" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddShoppingItem(label)}
                          disabled={addingItem === norm}
                          className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-60 transition-colors"
                          aria-label={`Add ${label} to shopping list`}
                        >
                          <PlusIcon className="w-5 h-5" /> {addingItem === norm ? 'Adding…' : 'Add'}
                        </button>
                      )}
                    </li>
                  )
                }

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
            <strong>⚠️ Important:</strong> This automated summary is for informational purposes only and should not replace professional medical advice.
            Always consult with qualified healthcare providers for medical decisions.
          </p>
        </div>
      )}
    </div>
  )
}
