#!/bin/bash

# This script removes patient-specific health data sections from the dashboard
# It keeps only general app features

cd "$(dirname "$0")/.."

# Create backup
cp app/dashboard/page.tsx app/dashboard/page.tsx.backup

# Use sed to remove lines 295-993 (patient-specific content) and replace with new content
{
  # Print everything before line 295
  sed -n '1,294p' app/dashboard/page.tsx

  # Insert new content
  cat << 'EOF'
          <>
            {/* Quick Access to Family Health Tracking */}
            <div className="bg-card rounded-lg shadow-sm p-4 border-l-4 border-primary">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Family Health Tracking</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track weight, meals, steps, and vitals for family members
                  </p>
                </div>
                <button
                  onClick={() => router.push('/patients')}
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
                >
                  View Family →
                </button>
              </div>
            </div>

            {/* Urgent AI Recommendations Widget */}
            <UrgentRecommendationsWidget />

            {/* Progress Charts Link */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg shadow hover:shadow-lg transition-all p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-1">📊 Visualize Your Progress</h3>
                  <p className="text-sm text-purple-100">View interactive charts and detailed trends</p>
                </div>
                <a
                  href="/progress"
                  className="px-6 py-3 bg-white dark:bg-gray-900 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium flex items-center gap-2"
                >
                  <span>View Charts</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Photo Gallery Link */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg shadow hover:shadow-lg transition-all p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-1">📸 Browse Your Meal Photos</h3>
                  <p className="text-sm text-indigo-100">View your food journey in a beautiful gallery</p>
                </div>
                <a
                  href="/gallery"
                  className="px-6 py-3 bg-white dark:bg-gray-900 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium flex items-center gap-2"
                >
                  <span>View Gallery</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Medical Info Link */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg shadow hover:shadow-lg transition-all p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-1">🏥 Medical Info</h3>
                  <p className="text-sm text-green-100">Manage health information for you or your family</p>
                </div>
                <a
                  href="/medical"
                  className="px-6 py-3 bg-white dark:bg-gray-900 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium flex items-center gap-2"
                >
                  <span>View Info</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>

            {/* PATIENT-SPECIFIC HEALTH DATA REMOVED - Now on /patients/[patientId] pages */}
EOF

  # Print everything from line 994 onwards (Quick Actions and below)
  sed -n '994,$p' app/dashboard/page.tsx

} > app/dashboard/page.tsx.new

# Replace original with new file
mv app/dashboard/page.tsx.new app/dashboard/page.tsx

echo "Patient-specific sections removed successfully!"
