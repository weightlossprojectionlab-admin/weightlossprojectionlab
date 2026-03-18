import type { Metadata } from 'next'
import { GuideTemplate } from '@/components/docs/GuideTemplate'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Offline Mode Guide | Wellness Projection Lab',
  description: 'Use WPL without internet connection and sync when back online.',
}

export default function OfflineModePage() {
  return (
    <GuideTemplate
      title="Offline Mode"
      description="Use WPL without internet connection and sync when back online"
    >
      <div className="bg-green-50 border-l-4 border-green-500 p-6 mb-8 rounded-r-lg">
        <p className="font-semibold text-green-900 mb-2">📡 Always Available</p>
        <p className="text-green-800 m-0">
          WPL is a Progressive Web App (PWA) that works seamlessly offline. Never lose data due to
          poor connectivity - everything syncs automatically when you're back online.
        </p>
      </div>

      <h2 id="overview">How Offline Mode Works</h2>
      <p>
        WPL automatically detects when you lose internet connection and switches to offline mode.
        All your actions are queued locally using IndexedDB and sync automatically when
        connectivity is restored.
      </p>

      <h3>Automatic Detection</h3>
      <ul>
        <li>WPL continuously monitors your internet connection</li>
        <li>When offline is detected, you'll see an indicator in the top-right corner</li>
        <li>All actions continue to work - they're just queued for later</li>
        <li>When online again, queued items sync automatically</li>
      </ul>

      <h2 id="what-works">What Works Offline</h2>

      <div className="grid md:grid-cols-2 gap-4 my-6">
        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">✓ Fully Functional</h4>
          <ul className="text-sm text-green-800 space-y-1 m-0">
            <li>• Meal logging with photos</li>
            <li>• Weight logging</li>
            <li>• Viewing cached meal history</li>
            <li>• Shopping list access</li>
            <li>• Barcode scanning (cached products)</li>
            <li>• Medical data viewing (cached)</li>
            <li>• Medication list access</li>
          </ul>
        </div>

        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Limited Function</h4>
          <ul className="text-sm text-yellow-800 space-y-1 m-0">
            <li>• AI meal analysis (requires connection)</li>
            <li>• New barcode lookups (uses cache only)</li>
            <li>• Recipe browsing (cached only)</li>
            <li>• Real-time family updates</li>
            <li>• Sharing features</li>
          </ul>
        </div>
      </div>

      <h2 id="offline-indicators">Offline Indicators</h2>
      <p>WPL provides multiple visual cues when you're offline:</p>

      <h3>Offline Banner</h3>
      <p>
        A banner appears at the top of the screen showing:
      </p>
      <ul>
        <li>Offline status with animated indicator</li>
        <li>Number of queued actions waiting to sync</li>
        <li>Reassurance that data will sync automatically</li>
      </ul>

      <h3>Sync Status Widget</h3>
      <p>Bottom-right corner widget shows:</p>
      <ul>
        <li>Current sync status</li>
        <li>Queue count</li>
        <li>Progress when syncing</li>
      </ul>

      <h2 id="using-offline">Using WPL Offline</h2>

      <h3>Logging Meals Offline</h3>
      <ol>
        <li>Take a photo of your meal as usual</li>
        <li>
          Select meal type and add notes
        </li>
        <li>
          Save - the meal is queued locally
        </li>
        <li>You'll see a notification: "Meal queued for sync"</li>
        <li>When online, AI analysis runs and data syncs</li>
      </ol>

      <div className="bg-blue-50 p-4 rounded-lg my-6">
        <p className="text-sm text-blue-900 font-medium mb-2">💡 Pro Tip</p>
        <p className="text-sm text-blue-800 m-0">
          Photos are compressed before storage, so you can log dozens of meals offline without
          running out of space. The typical meal photo uses only 200-500KB.
        </p>
      </div>

      <h3>Weight Logging Offline</h3>
      <p>Weight entries work identically online or offline:</p>
      <ul>
        <li>Enter your weight as normal</li>
        <li>Data is saved locally instantly</li>
        <li>Syncs to cloud when connection returns</li>
        <li>No data loss - everything is preserved</li>
      </ul>

      <h3>Shopping Lists Offline</h3>
      <p>Shopping lists are designed for offline use:</p>
      <ul>
        <li>View your complete shopping list</li>
        <li>Check off items as you shop</li>
        <li>Scan barcodes (using cached product database)</li>
        <li>Add new items manually</li>
        <li>All changes sync when online</li>
      </ul>

      <h2 id="sync-process">Automatic Sync Process</h2>

      <h3>When Connection Returns</h3>
      <p>The moment your device reconnects:</p>
      <ol>
        <li>
          <strong>Detection:</strong> WPL detects the connection
        </li>
        <li>
          <strong>Notification:</strong> You see "Back online! Syncing X items..."
        </li>
        <li>
          <strong>Processing:</strong> Queued items sync one by one
        </li>
        <li>
          <strong>Progress:</strong> Watch real-time progress in the sync widget
        </li>
        <li>
          <strong>Completion:</strong> Success notification when done
        </li>
      </ol>

      <h3>Sync Priority</h3>
      <p>Items sync in this order:</p>
      <ol>
        <li>Weight logs (fastest)</li>
        <li>Meal logs without photos</li>
        <li>Meal logs with photos (larger data)</li>
        <li>Shopping list updates</li>
        <li>Other queued actions</li>
      </ol>

      <h3>Handling Sync Failures</h3>
      <p>If a sync fails (rare, but possible):</p>
      <ul>
        <li>WPL retries automatically with exponential backoff</li>
        <li>Up to 3 attempts per item</li>
        <li>Failed items are flagged for your attention</li>
        <li>You can manually retry from the sync widget</li>
      </ul>

      <h2 id="data-storage">Local Data Storage</h2>

      <h3>What's Cached</h3>
      <p>WPL intelligently caches data for offline access:</p>
      <ul>
        <li>
          <strong>Recent meals:</strong> Last 30 days of meal history
        </li>
        <li>
          <strong>Weight logs:</strong> Last 90 days
        </li>
        <li>
          <strong>Medical data:</strong> Current medications, recent vitals
        </li>
        <li>
          <strong>Shopping:</strong> Active shopping lists
        </li>
        <li>
          <strong>Barcodes:</strong> Recently scanned products
        </li>
        <li>
          <strong>UI assets:</strong> App interface and icons
        </li>
      </ul>

      <h3>Storage Limits</h3>
      <div className="bg-gray-100 p-4 rounded-lg my-6">
        <p className="text-sm text-gray-700 font-medium mb-2">IndexedDB Storage:</p>
        <ul className="text-sm text-gray-600 space-y-1 m-0">
          <li>• Typical usage: 10-50 MB</li>
          <li>• Browser quota: Usually 50% of available disk space</li>
          <li>• Automatic cleanup: Old data removed when space needed</li>
          <li>• Manual clear: Available in settings if needed</li>
        </ul>
      </div>

      <h2 id="best-practices">Offline Mode Best Practices</h2>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📸</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Take Photos Immediately</p>
            <p className="text-sm text-gray-600 m-0">
              Capture meal photos right away before eating. If you go offline later, you already
              have the image.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🔄</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Let Sync Complete</p>
            <p className="text-sm text-gray-600 m-0">
              When reconnecting, wait for the sync to finish before closing the app. This ensures
              all data is uploaded.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Pre-cache Shopping Lists</p>
            <p className="text-sm text-gray-600 m-0">
              Open your shopping list while online before heading to the store. This ensures all
              items are cached.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Monitor Battery</p>
            <p className="text-sm text-gray-600 m-0">
              Background sync can use battery. If low on power, sync may be delayed until charging.
            </p>
          </div>
        </div>
      </div>

      <h2 id="scenarios">Common Offline Scenarios</h2>

      <h3>Traveling</h3>
      <ul>
        <li>Log meals on flights without WiFi</li>
        <li>Track weight in hotel rooms</li>
        <li>Access medical info during doctor visits</li>
        <li>Everything syncs when you get to WiFi</li>
      </ul>

      <h3>Shopping</h3>
      <ul>
        <li>Many stores have poor cell reception</li>
        <li>Access shopping list in airplane mode to save battery</li>
        <li>Scan barcodes using cached database</li>
        <li>Mark items as purchased offline</li>
      </ul>

      <h3>Medical Appointments</h3>
      <ul>
        <li>Doctor's offices often have spotty WiFi</li>
        <li>Access medication lists and health history</li>
        <li>Show meal logs and weight charts</li>
        <li>Take notes during appointment</li>
      </ul>

      <h2 id="pwa">Progressive Web App (PWA) Features</h2>
      <p>WPL is a full PWA, which means:</p>

      <h3>Install to Home Screen</h3>
      <ul>
        <li>Works like a native app</li>
        <li>No app store required</li>
        <li>Offline capability built-in</li>
        <li>Fast loading and responsive</li>
      </ul>

      <h3>Background Sync</h3>
      <ul>
        <li>Service workers handle sync in background</li>
        <li>Even if you close the app, data still syncs</li>
        <li>Notifications when sync completes</li>
      </ul>

      <h2 id="troubleshooting">Troubleshooting</h2>

      <h3>Sync stuck or not starting</h3>
      <ul>
        <li>Verify you're actually online (try loading another website)</li>
        <li>Check the sync widget for error messages</li>
        <li>Try manually triggering sync by pulling down to refresh</li>
        <li>Clear browser cache if issues persist</li>
      </ul>

      <h3>Offline indicator won't go away</h3>
      <ul>
        <li>Refresh the page</li>
        <li>Check browser network tab to verify connection</li>
        <li>Restart browser if needed</li>
      </ul>

      <h3>Data missing after sync</h3>
      <ul>
        <li>Check sync widget for failed items</li>
        <li>Look for error notifications</li>
        <li>Items may need manual retry</li>
        <li>Contact support if data is lost</li>
      </ul>

      <h2 id="next-steps">Next Steps</h2>
      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <Link
          href="/docs/user-guides/meal-tracking"
          className="block p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Meal Tracking →</h3>
          <p className="text-sm text-gray-600">Learn how to log meals online and offline</p>
        </Link>
        <Link
          href="/docs/user-guides/shopping"
          className="block p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Shopping Lists →</h3>
          <p className="text-sm text-gray-600">Use shopping lists offline in stores</p>
        </Link>
      </div>
    </GuideTemplate>
  )
}
