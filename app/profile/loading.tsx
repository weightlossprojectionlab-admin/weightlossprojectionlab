/**
 * Profile Page Loading Skeleton
 * Shows structure while profile data is loading
 */
export default function ProfileLoading() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header Skeleton */}
      <header className="bg-white dark:bg-gray-900 shadow-sm">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-center space-x-4 animate-pulse">
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        {/* Dietary Information Card Skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm border-2 border-gray-200 dark:border-gray-700 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
            <div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
              <div className="h-5 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
            <div>
              <div className="h-4 w-36 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
              <div className="h-5 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
          </div>
        </div>

        {/* Account Information Skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm animate-pulse">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
          <div className="space-y-4">
            <div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
              <div className="h-5 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
            <div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
          </div>
        </div>

        {/* Biometric Authentication Skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm animate-pulse">
          <div className="h-6 w-56 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="space-y-2">
                <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>
            </div>
            <div className="h-3 w-3 bg-gray-200 dark:bg-gray-800 rounded-full" />
          </div>
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded mb-4" />
          <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        </div>

        {/* Privacy & Data Skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm animate-pulse">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-lg mb-3" />
            <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          </div>
        </div>

        {/* App Settings Skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm animate-pulse">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded" />
                  <div className="h-4 w-56 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
                <div className="h-6 w-11 bg-gray-200 dark:bg-gray-800 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Sign Out Button Skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm animate-pulse">
          <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        </div>

        {/* App Info Skeleton */}
        <div className="text-center space-y-2 animate-pulse">
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-800 rounded mx-auto" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded mx-auto" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded mx-auto" />
        </div>
      </div>
    </main>
  )
}
