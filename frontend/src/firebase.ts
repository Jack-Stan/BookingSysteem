// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const env = import.meta.env
const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig)

// initialize analytics if available (may fail in non-browser envs)
export let analytics: ReturnType<typeof getAnalytics> | null = null
try {
    analytics = getAnalytics(firebaseApp)
} catch (e) {
    // analytics may fail on SSR or restricted environments — that's ok
    // console.debug('Firebase analytics not available', e)
}
