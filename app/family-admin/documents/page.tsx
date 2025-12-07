/**
 * Family Admin Documents Page
 *
 * Centralized document management for all family members
 * View, filter, search, and manage medical documents in one place
 */

'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { useDocuments } from '@/hooks/useDocuments'
import { usePatients } from '@/hooks/usePatients'
import AuthGuard from '@/components/auth/AuthGuard'
import {
  DocumentTextIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import type { PatientDocument } from '@/types/medical'
import DocumentUploadModal from './components/DocumentUploadModal'
import DocumentPreviewModal from './components/DocumentPreviewModal'
import { medicalOperations } from '@/lib/medical-operations'
import { toast } from 'react-hot-toast'

type ViewMode = 'grid' | 'list'

export default function DocumentsPage() {
  return (
    <AuthGuard>
      <DocumentsPageContent />
    </AuthGuard>
  )
}

function DocumentsPageContent() {
  const {
    documents,
    stats,
    loading: docsLoading,
    error,
    refetch,
    filters,
    setFilters,
    totalCount
  } = useDocuments()

  // Get patients from usePatients hook (same as /patients page)
  const { patients, loading: patientsLoading } = usePatients()

  const loading = docsLoading || patientsLoading

  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<any>(null)

  // Calculate document counts per patient from actual documents
  const patientDocCounts = patients.reduce((acc, patient) => {
    const count = documents.filter(doc => doc.patientId === patient.id).length
    acc[patient.id] = count
    return acc
  }, {} as Record<string, number>)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters({ ...filters, search: searchQuery })
  }

  const clearFilters = () => {
    setFilters({})
    setSearchQuery('')
  }

  const handleViewDocument = (doc: any) => {
    if (doc.originalUrl) {
      setPreviewDocument(doc)
    } else {
      toast.error('Document URL not available')
    }
  }

  const handleDownloadDocument = async (doc: any) => {
    try {
      if (doc.originalUrl) {
        const link = document.createElement('a')
        link.href = doc.originalUrl
        link.download = doc.fileName || doc.name || 'document'
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Download started')
      } else {
        toast.error('Document URL not available')
      }
    } catch (error) {
      toast.error('Failed to download document')
    }
  }

  const handleDeleteDocument = async (doc: any) => {
    if (!confirm(`Are you sure you want to delete "${doc.name}"?`)) {
      return
    }

    try {
      await medicalOperations.documents.deleteDocument(doc.patientId, doc.id)
      toast.success('Document deleted successfully')
      refetch()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete document')
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      insurance_card: 'Insurance Card',
      lab_result: 'Lab Result',
      prescription: 'Prescription',
      imaging: 'Imaging',
      immunization: 'Immunization',
      other: 'Other'
    }
    return labels[category] || category
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Documents"
        subtitle="Centralized document management for all family members"
        actions={
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium flex items-center gap-2"
          >
            <ArrowUpTrayIcon className="w-5 h-5" />
            Upload Document
          </button>
        }
      />

      <main className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-4 space-y-6">
              {/* Stats Summary */}
              {stats && (
                <div className="bg-card rounded-lg border-2 border-border p-4">
                  <h3 className="font-semibold text-foreground mb-3">Overview</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Documents</span>
                      <span className="font-medium text-foreground">{stats.totalDocuments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Members</span>
                      <span className="font-medium text-foreground">{patients.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Storage</span>
                      <span className="font-medium text-foreground">
                        {(stats.totalStorageUsed / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Category Filter */}
              <div className="bg-card rounded-lg border-2 border-border p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center justify-between">
                  <span>Category</span>
                  {filters.category && (
                    <button
                      onClick={() => setFilters({ ...filters, category: undefined })}
                      className="text-xs text-primary hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </h3>
                <div className="space-y-2">
                  {[
                    { value: '', label: 'All Documents', icon: '📄', count: stats?.totalDocuments || 0 },
                    { value: 'insurance_card', label: 'Insurance Cards', icon: '💳', count: stats?.byCategory.insurance_card || 0 },
                    { value: 'lab_result', label: 'Lab Results', icon: '🧪', count: stats?.byCategory.lab_result || 0 },
                    { value: 'prescription', label: 'Prescriptions', icon: '💊', count: stats?.byCategory.prescription || 0 },
                    { value: 'imaging', label: 'Imaging', icon: '🏥', count: stats?.byCategory.imaging || 0 },
                    { value: 'immunization', label: 'Immunizations', icon: '💉', count: stats?.byCategory.immunization || 0 },
                    { value: 'other', label: 'Other', icon: '📋', count: stats?.byCategory.other || 0 }
                  ].map(category => (
                    <button
                      key={category.value}
                      onClick={() => setFilters({ ...filters, category: category.value || undefined })}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        (filters.category === category.value) || (!filters.category && category.value === '')
                          ? 'bg-primary text-white'
                          : 'hover:bg-secondary text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span>{category.label}</span>
                      </span>
                      <span className={`text-xs font-medium ${
                        (filters.category === category.value) || (!filters.category && category.value === '')
                          ? 'text-white'
                          : 'text-muted-foreground'
                      }`}>
                        {category.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Patient Filter */}
              <div className="bg-card rounded-lg border-2 border-border p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center justify-between">
                  <span>Family Member</span>
                  {filters.patientId && (
                    <button
                      onClick={() => setFilters({ ...filters, patientId: undefined })}
                      className="text-xs text-primary hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setFilters({ ...filters, patientId: undefined })}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      !filters.patientId
                        ? 'bg-primary text-white'
                        : 'hover:bg-secondary text-foreground'
                    }`}
                  >
                    <span>All Members</span>
                    <span className={`text-xs font-medium ${
                      !filters.patientId ? 'text-white' : 'text-muted-foreground'
                    }`}>
                      {patients.length}
                    </span>
                  </button>
                  {patients.map(patient => {
                    const patientDocCount = patientDocCounts[patient.id] || 0
                    return (
                      <button
                        key={patient.id}
                        onClick={() => setFilters({ ...filters, patientId: patient.id })}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          filters.patientId === patient.id
                            ? 'bg-primary text-white'
                            : 'hover:bg-secondary text-foreground'
                        }`}
                      >
                        {patient.photo ? (
                          <img
                            src={patient.photo}
                            alt={patient.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary-light flex items-center justify-center">
                            <span className="text-primary font-semibold text-xs">
                              {patient.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="flex-1 text-left truncate">{patient.name}</span>
                        <span className={`text-xs font-medium ${
                          filters.patientId === patient.id ? 'text-white' : 'text-muted-foreground'
                        }`}>
                          {patientDocCount}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
        {/* Stats Bar - Mobile Only */}
        {stats && (
          <div className="lg:hidden bg-card rounded-lg border-2 border-border p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-3xl font-bold text-foreground">{stats.totalDocuments}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{patients.length}</p>
                <p className="text-sm text-muted-foreground">Family Members</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {(stats.totalStorageUsed / (1024 * 1024)).toFixed(1)} MB
                </p>
                <p className="text-sm text-muted-foreground">Storage Used</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {Object.keys(stats.byCategory).length}
                </p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-card rounded-lg border-2 border-border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents by name, notes, or patient..."
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                />
              </div>
            </form>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border-2 transition-colors flex items-center gap-2 ${
                showFilters
                  ? 'border-primary bg-primary-light text-primary'
                  : 'border-border bg-background text-foreground hover:bg-secondary'
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
              Filters
            </button>

            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary text-white'
                    : 'bg-secondary text-foreground hover:bg-secondary-dark'
                }`}
                title="Grid view"
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary text-white'
                    : 'bg-secondary text-foreground hover:bg-secondary-dark'
                }`}
                title="List view"
              >
                <TableCellsIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Patient Filter */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Family Member
                  </label>
                  <select
                    value={filters.patientId || ''}
                    onChange={(e) => setFilters({ ...filters, patientId: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                  >
                    <option value="">All Members</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name} ({patient.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Category
                  </label>
                  <select
                    value={filters.category || ''}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                  >
                    <option value="">All Categories</option>
                    <option value="insurance_card">Insurance Card</option>
                    <option value="lab_result">Lab Result</option>
                    <option value="prescription">Prescription</option>
                    <option value="imaging">Imaging</option>
                    <option value="immunization">Immunization</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary-dark transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading documents...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-error-light dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-8 text-center">
            <DocumentTextIcon className="w-12 h-12 text-error mx-auto mb-3" />
            <p className="text-error font-medium">{error}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-error text-white rounded-lg hover:bg-error-dark transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && documents.length === 0 && (
          <div className="bg-card rounded-lg border-2 border-border p-12 text-center">
            <DocumentTextIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">No documents found</h3>
            <p className="text-muted-foreground mb-6">
              {Object.keys(filters).some(key => filters[key as keyof typeof filters])
                ? 'Try adjusting your filters or search query'
                : 'Upload your first document to get started'}
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              Upload Document
            </button>
          </div>
        )}

        {/* Document List - Grid View */}
        {!loading && !error && documents.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="bg-card rounded-lg border-2 border-border p-6 hover:border-primary-light hover:shadow-lg transition-all"
              >
                {/* Patient Info */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                  {doc.patientPhoto ? (
                    <img
                      src={doc.patientPhoto}
                      alt={doc.patientName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {doc.patientName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{doc.patientName}</p>
                    <p className="text-xs text-muted-foreground">{doc.patientType}</p>
                  </div>
                </div>

                {/* Document Info */}
                <div className="mb-3">
                  <h3 className="font-semibold text-foreground mb-1 line-clamp-2 min-h-[2.5rem]">{doc.name}</h3>
                  <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-primary-light text-primary">
                    {getCategoryLabel(doc.category)}
                  </span>
                </div>

                {/* Metadata */}
                <div className="space-y-1 text-sm text-muted-foreground mb-4 min-h-[4rem]">
                  <p className="truncate">📅 {formatDate(doc.uploadedAt)}</p>
                  <p className="truncate">📄 {formatFileSize(doc.fileSize || 0)}</p>
                  {doc.ocrStatus === 'completed' && (
                    <p className="text-success truncate">✓ OCR Processed</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewDocument(doc)}
                    className="flex-1 p-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center"
                    title="View"
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDownloadDocument(doc)}
                    className="flex-1 p-2 bg-secondary text-foreground rounded-lg hover:bg-secondary-dark transition-colors flex items-center justify-center"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(doc)}
                    className="flex-1 p-2 bg-error text-white rounded-lg hover:bg-error-dark transition-colors flex items-center justify-center"
                    title="Delete"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Document List - List View */}
        {!loading && !error && documents.length > 0 && viewMode === 'list' && (
          <div className="bg-card rounded-lg border-2 border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Document</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Patient</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Category</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Date</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Size</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr
                    key={doc.id}
                    className="border-b border-border hover:bg-secondary transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <DocumentTextIcon className="w-8 h-8 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{doc.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{doc.fileName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {doc.patientPhoto ? (
                          <img
                            src={doc.patientPhoto}
                            alt={doc.patientName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center">
                            <span className="text-primary font-semibold text-sm">
                              {doc.patientName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="text-sm text-foreground">{doc.patientName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-primary-light text-primary">
                        {getCategoryLabel(doc.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(doc.uploadedAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatFileSize(doc.fileSize || 0)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="p-2 text-primary hover:bg-primary-light rounded-lg transition-colors"
                          title="View"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="p-2 text-foreground hover:bg-secondary rounded-lg transition-colors"
                          title="Download"
                        >
                          <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          className="p-2 text-error hover:bg-error-light rounded-lg transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          </div>
        </div>
      </main>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        patients={patients}
      />

      {/* Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
        document={previewDocument}
        onDownload={() => {
          if (previewDocument) {
            handleDownloadDocument(previewDocument)
          }
        }}
        onOcrComplete={() => {
          // Refetch documents to get updated OCR status
          refetch()
          // Wait a few seconds then refetch again to get OCR results
          setTimeout(() => refetch(), 5000)
        }}
      />
    </div>
  )
}
