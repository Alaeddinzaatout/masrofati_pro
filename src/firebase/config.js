// @ts-nocheck
// Credentials for Masrofati Pro (Business/Lab Environment)
import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, _InMemoryCache } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

// 1. التهيئة الأساسية لـ Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. تهيئة Auth مع دعم الاستمرارية (Persistence) في الموبايل
export const auth = Platform.OS !== 'web' 
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    })
  : getAuth(app);

// 3. تهيئة Firestore مع كاش محلي مستقر
// تم تعطيل TabManager لأنه قد يسبب مشاكل في APK الموبايل
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
  // 💡 السطر القادم يحل مشكلة الانهيار في بعض شبكات الـ 4G/5G الضعيفة
  experimentalForceLongPolling: Platform.OS !== 'web'
});