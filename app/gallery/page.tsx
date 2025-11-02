'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { PhotoGalleryGrid, GroupedPhotoGallery } from '@/components/gallery/PhotoGalleryGrid'
import { PhotoModal } from '@/components/gallery/PhotoModal'
import { ShareButton } from '@/components/social/ShareButton'
import { ShareModal } from '@/components/social/ShareModal'
import { logger } from '@/lib/logger'
import {
  fetchRecentPhotos,
  groupPhotosByDate,
  searchPhotos,
  getGalleryStats,
  type PhotoGalleryItem
} from '@/lib/photo-gallery-utils'
import { PhotoGridSkeleton } from '@/components/ui/skeleton'
import toast from 'react-hot-toast'

export default function GalleryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [photos, setPhotos] = useState<PhotoGalleryItem[]>([])
  const [filteredPhotos, setFilteredPhotos] = useState<PhotoGalleryItem[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoGalleryItem | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [mealTypeFilter, setMealTypeFilter] = useState<'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'grouped'>('grouped')
  const [timeRange, setTimeRange] = useState(30) // days
  const [showShareModal, setShowShareModal] = useState(false)

  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth/signin')
      }
    })
    return () => unsubscribe()
  }, [router])

  // Load photos
  useEffect(() => {
    loadPhotos()
  }, [timeRange])

  const loadPhotos = async () => {
    setLoading(true)
    try {
      const fetchedPhotos = await fetchRecentPhotos(timeRange)
      setPhotos(fetchedPhotos)
      setFilteredPhotos(fetchedPhotos)
    } catch (error) {
      logger.error('Error loading photos:', error as Error)
      toast.error('Failed to load photos')
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  useEffect(() => {
    let filtered = photos

    // Apply meal type filter
    if (mealTypeFilter !== 'all') {
      filtered = filtered.filter(photo => photo.mealType === mealTypeFilter)
    }

    // Apply search filter
    if (searchTerm) {
      filtered = searchPhotos(filtered, searchTerm)
    }

    setFilteredPhotos(filtered)
  }, [photos, mealTypeFilter, searchTerm])

  // Modal handlers
  const handlePhotoClick = (photo: PhotoGalleryItem, index: number) => {
    setSelectedPhoto(photo)
    setSelectedIndex(index)
  }

  const handleNextPhoto = () => {
    if (selectedIndex < filteredPhotos.length - 1) {
      const newIndex = selectedIndex + 1
      setSelectedIndex(newIndex)
      setSelectedPhoto(filteredPhotos[newIndex])
    }
  }

  const handlePreviousPhoto = () => {
    if (selectedIndex > 0) {
      const newIndex = selectedIndex - 1
      setSelectedIndex(newIndex)
      setSelectedPhoto(filteredPhotos[newIndex])
    }
  }

  const handleCloseModal = () => {
    setSelectedPhoto(null)
  }

  // Calculate stats
  const stats = getGalleryStats(filteredPhotos)
  const photosByDate = groupPhotosByDate(filteredPhotos)

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">📸 Photo Gallery</h1>
              <p className="text-purple-100">Browse your meal history</p>
            </div>
            <div className="flex gap-2">
              <ShareButton
                shareOptions={{
                  type: 'gallery',
                  data: {
                    photoCount: stats.totalPhotos
                  }
                }}
                variant="default"
                size="md"
                className="bg-white/20 hover:bg-white/30"
                onShareModalOpen={() => setShowShareModal(true)}
              />
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          {!loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold">{stats.totalPhotos}</div>
                <div className="text-sm text-purple-100">Total Photos</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold">{stats.avgCalories}</div>
                <div className="text-sm text-purple-100">Avg Calories</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold">{stats.mealTypeCounts.breakfast || 0}</div>
                <div className="text-sm text-purple-100">🌅 Breakfasts</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold">{stats.mealTypeCounts.dinner || 0}</div>
                <div className="text-sm text-purple-100">🌙 Dinners</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search meals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Meal Type Filter */}
            <select
              value={mealTypeFilter}
              onChange={(e) => setMealTypeFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Meals</option>
              <option value="breakfast">🌅 Breakfast</option>
              <option value="lunch">☀️ Lunch</option>
              <option value="dinner">🌙 Dinner</option>
              <option value="snack">🍎 Snacks</option>
            </select>

            {/* Time Range */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 2 Weeks</option>
              <option value={30}>Last 30 Days</option>
              <option value={60}>Last 2 Months</option>
              <option value={90}>Last 3 Months</option>
              <option value={180}>Last 6 Months</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'grouped'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                By Date
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || mealTypeFilter !== 'all') && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-2 hover:text-primary-hover"
                  >
                    ×
                  </button>
                </span>
              )}
              {mealTypeFilter !== 'all' && (
                <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm capitalize">
                  {mealTypeFilter}
                  <button
                    onClick={() => setMealTypeFilter('all')}
                    className="ml-2 hover:text-primary-hover"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Gallery Content */}
        {loading ? (
          <PhotoGridSkeleton count={12} />
        ) : viewMode === 'grid' ? (
          <PhotoGalleryGrid
            photos={filteredPhotos}
            onPhotoClick={handlePhotoClick}
          />
        ) : (
          <GroupedPhotoGallery
            photosByDate={photosByDate}
            onPhotoClick={handlePhotoClick}
          />
        )}
      </div>

      {/* Photo Modal */}
      <PhotoModal
        photo={selectedPhoto}
        allPhotos={filteredPhotos}
        currentIndex={selectedIndex}
        onClose={handleCloseModal}
        onNext={handleNextPhoto}
        onPrevious={handlePreviousPhoto}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareOptions={{
          type: 'gallery',
          data: {
            photoCount: stats.totalPhotos
          }
        }}
      />
    </div>
  )
}
