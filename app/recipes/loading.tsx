/**
 * Recipes Page Loading Skeleton
 * Shows structure while recipe data is loading
 */
export default function RecipesLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-100 dark:from-gray-900 dark:to-purple-900/20">
      {/* Marketing Banner Skeleton */}
      <div className="bg-gradient-to-r from-primary to-accent text-white py-3 px-4">
        <div className="h-4 w-96 mx-auto bg-background/20 rounded animate-pulse" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header Skeleton */}
        <div className="text-center mb-12">
          <div className="h-12 w-96 mx-auto bg-gray-200 rounded animate-pulse mb-4" />
          <div className="h-5 w-[600px] max-w-full mx-auto bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Filters Skeleton */}
        <div className="bg-card rounded-lg shadow-lg p-6 mb-8 animate-pulse">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="w-full h-12 bg-gray-200 rounded-lg" />
          </div>

          {/* Meal Type Filter */}
          <div className="mb-4">
            <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 w-24 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>

          {/* Dietary Tags Filter */}
          <div>
            <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-8 w-28 bg-gray-200 rounded-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Results Count Skeleton */}
        <div className="h-5 w-32 bg-gray-200 rounded mb-6 animate-pulse" />

        {/* Recipe Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card rounded-lg shadow-lg overflow-hidden animate-pulse">
              {/* Recipe Image Skeleton */}
              <div className="h-48 w-full bg-gray-200" />

              {/* Recipe Content Skeleton */}
              <div className="p-6 space-y-4">
                <div className="h-6 w-3/4 bg-gray-200 rounded" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-2/3 bg-gray-200 rounded" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-20 bg-gray-200 rounded" />
                  <div className="h-6 w-24 bg-gray-200 rounded" />
                  <div className="h-6 w-16 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
