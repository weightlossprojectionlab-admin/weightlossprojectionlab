/**
 * Progress Page Loading Skeleton
 * Shows structure while progress data and charts are loading
 */
export default function ProgressLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header Skeleton */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="flex items-center gap-4">
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Stats Summary Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 animate-pulse">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded mb-1" />
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>

        {/* Time Range Filter Skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 mb-6 animate-pulse">
          <div className="flex gap-2 overflow-x-auto">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg flex-shrink-0" />
            ))}
          </div>
        </div>

        {/* Weight Chart Skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-6 animate-pulse">
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        </div>

        {/* Nutrition Chart Skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-6 animate-pulse">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        </div>

        {/* Activity Chart Skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-6 animate-pulse">
          <div className="h-6 w-36 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        </div>

        {/* Achievements/Milestones Skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 animate-pulse">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="h-12 w-12 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-3" />
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mx-auto mb-2" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
