/**
 * Dashboard Loading Skeleton
 * Shows layout structure while data is loading
 * Provides instant visual feedback to users
 */
export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      <div className="container-narrow py-6 space-y-6">
        {/* Weight Progress Card Skeleton */}
        <div className="bg-card rounded-lg shadow p-6 animate-pulse">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            <div className="flex items-end space-x-2">
              <div className="h-10 w-20 bg-gray-200 rounded" />
              <div className="h-5 w-12 bg-gray-200 rounded" />
            </div>
            <div className="h-2 w-full bg-gray-200 rounded" />
            <div className="h-4 w-3/4 bg-gray-200 rounded" />
          </div>
        </div>

        {/* Nutrition Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Calories Card */}
          <div className="bg-card rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 w-24 bg-gray-200 rounded mb-4" />
            <div className="h-12 w-32 bg-gray-200 rounded mb-3" />
            <div className="h-2 w-full bg-gray-200 rounded mb-2" />
            <div className="h-4 w-1/2 bg-gray-200 rounded" />
          </div>

          {/* Steps Card */}
          <div className="bg-card rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 w-24 bg-gray-200 rounded mb-4" />
            <div className="h-12 w-32 bg-gray-200 rounded mb-3" />
            <div className="h-2 w-full bg-gray-200 rounded mb-2" />
            <div className="h-4 w-1/2 bg-gray-200 rounded" />
          </div>
        </div>

        {/* Meal Suggestions Skeleton */}
        <div className="bg-card rounded-lg shadow p-6 animate-pulse">
          <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="border border-border rounded-lg p-4">
                <div className="h-40 w-full bg-gray-200 rounded mb-3" />
                <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-full bg-gray-200 rounded mb-2" />
                <div className="h-4 w-2/3 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Missions Skeleton */}
        <div className="bg-card rounded-lg shadow p-6 animate-pulse">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-border rounded">
                <div className="flex-1">
                  <div className="h-5 w-48 bg-gray-200 rounded mb-2" />
                  <div className="h-2 w-full bg-gray-200 rounded" />
                </div>
                <div className="h-8 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
