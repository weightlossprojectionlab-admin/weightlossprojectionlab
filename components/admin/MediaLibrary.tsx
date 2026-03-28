'use client'

import { useState, useEffect, useRef } from 'react'
import {
  uploadMediaImage,
  getMediaLibrary,
  removeFromMediaLibrary,
  updateMediaTags,
  MEDIA_TAGS,
  type MediaItem,
  type MediaTag,
} from '@/lib/media-library'
import { PhotoIcon, TrashIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface MediaLibraryProps {
  /** If true, show in selection mode (click to select image) */
  selectionMode?: boolean
  /** Called when an image is selected in selection mode */
  onSelect?: (item: MediaItem) => void
  /** Filter by tags */
  filterTags?: string[]
}

export default function MediaLibrary({ selectionMode = false, onSelect, filterTags }: MediaLibraryProps) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [filterTag, setFilterTag] = useState<string>('all')
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadLibrary()
  }, [])

  const loadLibrary = async () => {
    setLoading(true)
    const data = await getMediaLibrary()
    setItems(data)
    setLoading(false)
  }

  const processFiles = async (files: File[]) => {
    if (selectedTags.length === 0) {
      toast.error('Select at least one tag before uploading')
      return
    }

    const imageFiles = files.filter(f => {
      if (!f.type.startsWith('image/')) { toast.error(`${f.name} is not an image`); return false }
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} exceeds 10MB limit`); return false }
      return true
    })
    if (!imageFiles.length) return

    setUploading(true)
    try {
      for (const file of imageFiles) {
        const item = await uploadMediaImage(file, selectedTags)
        setItems(prev => [item, ...prev])
      }
      toast.success(`Uploaded ${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''}`)
      setSelectedTags([])
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    await processFiles(Array.from(e.target.files))
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) await processFiles(files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDelete = async (item: MediaItem) => {
    if (!confirm(`Delete "${item.filename}"?`)) return
    try {
      await removeFromMediaLibrary(item.id)
      setItems(prev => prev.filter(i => i.id !== item.id))
      toast.success('Image removed')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleUpdateTags = async (item: MediaItem, newTags: string[]) => {
    try {
      await updateMediaTags(item.id, newTags)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, tags: newTags } : i))
      setEditingItem(null)
      toast.success('Tags updated')
    } catch {
      toast.error('Failed to update tags')
    }
  }

  const filteredItems = filterTag === 'all'
    ? items
    : items.filter(i => i.tags.includes(filterTag))

  const displayItems = filterTags?.length
    ? items.filter(i => i.tags.some(t => filterTags.includes(t)))
    : filteredItems

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {!selectionMode && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Upload Images</h3>

          {/* Tag Selection */}
          <div className="mb-4">
            <label className="text-sm font-medium text-foreground mb-2 block">Select tags for upload:</label>
            <div className="flex flex-wrap gap-2">
              {MEDIA_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTags(prev =>
                    prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                  )}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Area — Click or Drag & Drop */}
          <div
            onClick={() => selectedTags.length > 0 && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : selectedTags.length > 0
                  ? 'border-primary/50 hover:border-primary cursor-pointer'
                  : 'border-border opacity-50 cursor-not-allowed'
            }`}
          >
            <PhotoIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Uploading...</span>
              </div>
            ) : isDragging ? (
              <p className="text-sm text-primary font-medium">Drop images here</p>
            ) : selectedTags.length > 0 ? (
              <>
                <p className="text-sm text-foreground font-medium">Click or drag & drop images here</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP up to 10MB. Multiple files supported.</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select at least one tag above before uploading</p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Filter */}
      {!filterTags && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">Filter:</span>
          <button
            onClick={() => setFilterTag('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterTag === 'all' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All ({items.length})
          </button>
          {MEDIA_TAGS.filter(tag => items.some(i => i.tags.includes(tag))).map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterTag === tag ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tag} ({items.filter(i => i.tags.includes(tag)).length})
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading media library...</div>
      ) : displayItems.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <PhotoIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">No images yet</p>
          <p className="text-sm text-muted-foreground mt-1">Upload images to build your media library</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayItems.map(item => (
            <div
              key={item.id}
              onClick={() => selectionMode && onSelect?.(item)}
              className={`group relative bg-card rounded-lg border border-border overflow-hidden ${
                selectionMode ? 'cursor-pointer hover:ring-2 hover:ring-primary' : ''
              }`}
            >
              <img
                src={item.url}
                alt={item.filename}
                className="w-full h-40 object-cover"
              />
              <div className="p-2">
                <div className="flex flex-wrap gap-1 mb-1">
                  {item.tags.map(tag => (
                    <span key={tag} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground truncate">{item.filename}</p>
              </div>

              {/* Actions overlay */}
              {!selectionMode && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingItem(item) }}
                    className="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow text-xs font-medium hover:bg-white"
                    title="Edit tags"
                  >
                    Tags
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item) }}
                    className="p-1.5 bg-red-500/90 text-white rounded-lg shadow hover:bg-red-600"
                    title="Delete"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tag Editor Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingItem(null)}>
          <div className="bg-card rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Edit Tags</h3>
              <button onClick={() => setEditingItem(null)} className="p-1 hover:bg-muted rounded">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <img src={editingItem.url} alt="" className="w-full h-32 object-cover rounded-lg mb-4" />
            <div className="flex flex-wrap gap-2">
              {MEDIA_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    const newTags = editingItem.tags.includes(tag)
                      ? editingItem.tags.filter(t => t !== tag)
                      : [...editingItem.tags, tag]
                    setEditingItem({ ...editingItem, tags: newTags })
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    editingItem.tags.includes(tag)
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleUpdateTags(editingItem, editingItem.tags)}
              className="w-full mt-4 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
            >
              Save Tags
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
