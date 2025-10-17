import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Firebase configuration with fallback values
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDqtUxMstOLFJDPybDruU51bAIKdLfEyGs',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'weightlossprojectionlab-8b284.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'weightlossprojectionlab-8b284',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'weightlossprojectionlab-8b284.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '354555244971',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:354555244971:web:9296df372cb599bac1a2ee',
}

// Initialize Firebase app (avoid duplicate initialization)
let app
try {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
  console.log('Firebase app initialized successfully')
} catch (error) {
  console.error('Failed to initialize Firebase app:', error)
  throw new Error('Firebase initialization failed')
}

// Initialize Firebase services with error handling
let auth, db, storage

try {
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)

  console.log('Firebase services initialized successfully')
} catch (error) {
  console.error('Failed to initialize Firebase services:', error)
  throw new Error('Firebase services initialization failed')
}

export { auth, db, storage }
export default app