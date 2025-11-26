/**
 * Shopping List Loading Skeleton
 * Shows structure while shopping list data is loading
 */
export default function ShoppingLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="flex-1">
            <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-200 rounded mt-2 animate-pulse" />
          </div>
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-card rounded-lg shadow p-4 animate-pulse">
            <div className="h-8 w-12 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
          <div className="bg-card rounded-lg shadow p-4 animate-pulse">
            <div className="h-8 w-12 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
        </div>

        {/* Action Buttons Skeleton */}
        <div className="mb-6 flex gap-3">
          <div className="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-12 w-32 bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* Shopping List Items Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card rounded-lg shadow p-4 animate-pulse">
              <div className="flex items-center gap-4">
                {/* Product Image Skeleton */}
                <div className="w-16 h-16 bg-gray-200 rounded-lg" />

                {/* Product Info Skeleton */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-5 w-3/4 bg-gray-200 rounded" />
                  <div className="h-4 w-1/2 bg-gray-200 rounded" />
                  <div className="flex gap-2">
                    <div className="h-6 w-20 bg-gray-200 rounded" />
                    <div className="h-6 w-16 bg-gray-200 rounded" />
                  </div>
                </div>

                {/* Actions Skeleton */}
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-gray-200 rounded" />
                  <div className="h-8 w-8 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
