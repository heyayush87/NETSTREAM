import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_KEY,
  authDomain: "netflixgpt-6b978.firebaseapp.com",
  projectId: "netflixgpt-6b978",
  storageBucket: "netflixgpt-6b978.appspot.com", // ✅ Fixed URL
  messagingSenderId: "817372546520",
  appId: "1:817372546520:web:2f4976dc6f431d873b9ead",
  measurementId: "G-V5B7TNQP3W",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics is optional. Starting it without an API key (or in a browser that blocks it) used to
// crash the whole app at import time, so it only starts when it can, and never throws.
if (firebaseConfig.apiKey) {
  isSupported()
    .then((ok) => ok && getAnalytics(app))
    .catch(() => {});
}

export const auth = getAuth(app); // ✅ Pass `app` to `getAuth()`
export const db = getFirestore(app); // watch parties (see firestore.rules)
