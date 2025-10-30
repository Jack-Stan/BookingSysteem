// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAJ9q5Sb12nLNIwaxhfG46IU8kinUWZucI",
    authDomain: "silkebeautyloveandcare-486ab.firebaseapp.com",
    projectId: "silkebeautyloveandcare-486ab",
    storageBucket: "silkebeautyloveandcare-486ab.firebasestorage.app",
    messagingSenderId: "508248710253",
    appId: "1:508248710253:web:baf0b796d519b7a3aab364",
    measurementId: "G-D5FHTD1JJ1"
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
