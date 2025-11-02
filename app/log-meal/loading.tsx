/**
 * Log Meal Loading Skeleton
 * Shows structure while meal logging interface is loading
 */
export default function LogMealLoading() {
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

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Camera/Upload Section Skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 mb-6 animate-pulse">
          <div className="aspect-video w-full bg-gray-200 dark:bg-gray-800 rounded-lg mb-4 flex items-center justify-center">
            <div className="text-center">
              <div className="h-16 w-16 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-3" />
              <div className="h-4 w-40 bg-gray-300 dark:bg-gray-700 rounded mx-auto" />
            </div>
          </div>

          {/* Action Buttons Skeleton */}
          <div className="grid grid-cols-2 gap-3">
            <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-lg" />
            <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          </div>
        </div>

        {/* Meal Details Form Skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 space-y-6 animate-pulse">
          {/* Meal Type Selector */}
          <div>
            <div className="h-5 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg" />
              ))}
            </div>
          </div>

          {/* Notes Input */}
          <div>
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
            <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          </div>

          {/* Nutrition Info */}
          <div>
            <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
                  <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        </div>
      </main>
    </div>
  )
}
