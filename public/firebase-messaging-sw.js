/**
 * Firebase Cloud Messaging Service Worker
 *
 * Required for background push notifications on all browsers/devices.
 * Must be at /firebase-messaging-sw.js (served from public/ in Next.js).
 *
 * This file uses importScripts (not ES modules) as required by service workers.
 */

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyDqtUxMstOLFJDPybDruU51bAIKdLfEyGs',
  authDomain: 'weightlossprojectionlab-8b284.firebaseapp.com',
  projectId: 'weightlossprojectionlab-8b284',
  storageBucket: 'weightlossprojectionlab-8b284.firebasestorage.app',
  messagingSenderId: '354555244971',
  appId: '1:354555244971:web:9296df372cb599bac1a2ee',
})

const messaging = firebase.messaging()

/**
 * Handle background messages (app not in foreground / browser tab not open)
 * Firebase automatically shows a notification for messages with a `notification` field.
 * This handler lets us customize the display or handle data-only messages.
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] Received background message:', payload)

  const notificationTitle = payload.notification?.title || 'Weight Loss Projection Lab'
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    data: payload.data || {},
    // Navigate to actionUrl when notification is clicked
    ...(payload.data?.actionUrl && {
      data: { ...payload.data, click_action: payload.data.actionUrl }
    })
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

/**
 * Handle notification click — navigate to actionUrl if provided
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const actionUrl = event.notification.data?.actionUrl || event.notification.data?.click_action || '/'
  const urlToOpen = new URL(actionUrl, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If app is already open, focus it
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
