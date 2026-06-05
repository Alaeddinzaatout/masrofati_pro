// @ts-nocheck
// Credentials for Masrofati Pro (Business/Lab Environment)
// Restrict the API key in Google Cloud Console + lock down Firestore rules.
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

// Your web app's Firebase configuration (Masrofati Pro)
const firebaseConfig = {
  apiKey: "AIzaSyBnwhUwsvCag4IGfwLn-4XzeIp4AG_ErNs",
  authDomain: "masrofati-pro.firebaseapp.com",
  projectId: "masrofati-pro",
  storageBucket: "masrofati-pro.firebasestorage.app",
  messagingSenderId: "927741835178",
  appId: "1:927741835178:web:d2d5404d16f617414d5dd3",
  measurementId: "G-0CRTZF9DYX"
};

// Guard against re-initialization on Fast Refresh.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});