'use client'

import { auth } from './firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  fetchSignInMethodsForEmail,
  User
} from 'firebase/auth'
import { logger } from '@/lib/logger'

export const signIn = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  } catch (error) {
    logger.error('Sign in error', error as Error)
    throw error
  }
}

export const signUp = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    return result.user
  } catch (error) {
    logger.error('Sign up error', error as Error)
    throw error
  }
}

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider()
    provider.addScope('email')
    provider.addScope('profile')

    // Use redirect for better compatibility with custom auth domains
    const result = await signInWithPopup(auth, provider)
    return result.user
  } catch (error) {
    logger.error('Google sign in error', error as Error)
    throw error
  }
}

export const signInWithGoogleRedirect = async () => {
  try {
    const provider = new GoogleAuthProvider()
    provider.addScope('email')
    provider.addScope('profile')

    // Use redirect method for custom auth domains
    await signInWithRedirect(auth, provider)
  } catch (error) {
    logger.error('Google sign in redirect error', error as Error)
    throw error
  }
}

export const signOut = async () => {
  try {
    await firebaseSignOut(auth)
  } catch (error) {
    logger.error('Sign out error', error as Error)
    throw error
  }
}

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback)
}

export const checkSignInMethods = async (email: string) => {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email)
    return methods
  } catch (error) {
    logger.error('Error checking sign-in methods', error as Error)
    throw error
  }
}

// Re-export auth instance for components that need direct access
export { auth }