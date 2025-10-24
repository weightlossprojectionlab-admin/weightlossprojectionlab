import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { getMessaging, type Messaging, isSupported } from 'firebase/messaging'

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
  console.log('Firebase app initialized successfully')
} catch (error) {
  console.error('Failed to initialize Firebase app:', error)
  throw new Error('Firebase initialization failed')
}

// Initialize Firebase services with error handling
let auth: Auth
let db: Firestore
let storage: FirebaseStorage
let messaging: Messaging | null = null

try {
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)

  console.log('Firebase services initialized successfully')
} catch (error) {
  console.error('Failed to initialize Firebase services:', error)
  throw new Error('Firebase services initialization failed')
}

// Initialize Firebase Cloud Messaging (client-side only)
export async function initializeMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') {
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
      console.warn('Firebase Messaging not supported in this browser')
      return null
    }

    messaging = getMessaging(app)
    console.log('Firebase Messaging initialized successfully')
    return messaging
  } catch (error) {
    console.error('Failed to initialize Firebase Messaging:', error)
    return null
  }
}

export { auth, db, storage, messaging }
export default app