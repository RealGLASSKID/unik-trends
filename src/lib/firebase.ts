"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "missing",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "missing",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp() {
  if (getApps().length) return getApp();
  return initializeApp(firebaseConfig);
}

const app = getFirebaseApp();
export const auth = getAuth(app);

// Keep Google / email sessions across browser restarts (not just this tab)
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    /* ignore — default is already local in most browsers */
  });
}

export const db = getFirestore(app);
