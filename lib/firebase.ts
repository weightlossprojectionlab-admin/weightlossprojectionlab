import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth'
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { getMessaging, type Messaging, isSupported } from 'firebase/messaging'
import { logger } from '@/lib/logger'
import { isServer } from '@/lib/adapters'

// Firebase configuration (requires environment variables)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase app (avoid duplicate initialization)
let app: FirebaseApp
try {
  app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig)
  logger.info('Firebase app initialized successfully')
} catch (error) {
  logger.error('Failed to initialize Firebase app', error as Error)
  throw new Error('Firebase initialization failed')
}

// Initialize Firebase services with error handling
let auth: Auth
let db: Firestore
let storage: FirebaseStorage
let messaging: Messaging | null = null

try {
  auth = getAuth(app)

  // Initialize Firestore with modern cache API (supports multi-tab)
  if (!isServer()) {
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      })
      logger.info('Firestore initialized with multi-tab persistent cache')
    } catch (error) {
      // Fallback to default if already initialized
      db = getFirestore(app)
      logger.warn('Using default Firestore instance (already initialized)')
    }
  } else {
    db = getFirestore(app)
  }

  storage = getStorage(app)

  // Enable auth persistence (keep user signed in across browser sessions)
  // Skip on server-side rendering to prevent crashes
  if (!isServer()) {
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        logger.info('Firebase Auth persistence enabled (browserLocalPersistence)')
      })
      .catch((err) => {
        logger.error('Failed to set auth persistence', err as Error)
      })
  }

  logger.info('Firebase services initialized successfully')
} catch (error) {
  logger.error('Failed to initialize Firebase services', error as Error)
  throw new Error('Firebase services initialization failed')
}

// Initialize Firebase Cloud Messaging (client-side only)
export async function initializeMessaging(): Promise<Messaging | null> {
  if (isServer()) {
    // Server-side, messaging not available
    return null
  }

  if (messaging) {
    // Already initialized
    return messaging
  }

  try {
    const supported = await isSupported()
    if (!supported) {
      logger.warn('Firebase Messaging not supported in this browser')
      return null
    }

    messaging = getMessaging(app)
    logger.info('Firebase Messaging initialized successfully')
    return messaging
  } catch (error) {
    logger.error('Failed to initialize Firebase Messaging', error as Error)
    return null
  }
}

export { auth, db, storage, messaging }
export default app