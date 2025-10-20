'use client'

import { auth } from './firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  fetchSignInMethodsForEmail,
  User
} from 'firebase/auth'

export const signIn = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  } catch (error) {
    console.error('Sign in error:', error)
    throw error
  }
}

export const signUp = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    return result.user
  } catch (error) {
    console.error('Sign up error:', error)
    throw error
  }
}

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider()
    provider.addScope('email')
    provider.addScope('profile')

    const result = await signInWithPopup(auth, provider)
    return result.user
  } catch (error) {
    console.error('Google sign in error:', error)
    throw error
  }
}

export const signOut = async () => {
  try {
    await firebaseSignOut(auth)
  } catch (error) {
    console.error('Sign out error:', error)
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
    console.error('Error checking sign-in methods:', error)
    throw error
  }
}

// Re-export auth instance for components that need direct access
export { auth }