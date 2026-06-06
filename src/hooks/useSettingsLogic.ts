import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Updates from 'expo-updates';
import { deleteUser, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import { ThemeContext } from '../../app/_layout';
import { auth, db } from '../firebase/config';
import { aiManager } from '../services/aiServiceManager';
import { getDeepSeekKey, saveDeepSeekKey, testDeepSeekKey } from '../services/cerebras';
import { getUserApiKey, saveUserApiKey, testGeminiKey } from '../services/gemini';

const NOTIF_PREFS_KEY = 'notification-preferences';

export interface NotificationPrefs {
  budget: boolean;
  inventory: boolean;
  aiTips: boolean;
}

export const useSettingsLogic = () => {
  const { darkModePref, setDarkModePref } = useContext(ThemeContext);

  // API Keys States
  const [geminiKey, setGeminiKey] = useState('');
  const [deepseekKey, setDeepSeekKey] = useState('');
  const [testing, setTesting] = useState({ gemini: false, deepseek: false });
  
  // Notification States
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    budget: true,
    inventory: true,
    aiTips: true,
  });

  // UI States
  const [snack, setSnack] = useState({ visible: false, message: '', color: '' });

  // 1. Load Initial Data
  useEffect(() => {
    let isMounted = true;

    const loadAllSettings = async (uid: string) => {
      const isAdminUser = auth.currentUser?.email === 'alaadden.zatout@gmail.com';
      console.log("SETTINGS_HOOK: Loading settings. Admin:", isAdminUser, "UID:", uid);
      
      try {
        // Load API Keys (All users now load from global Firestore config)
        const gKey = await getUserApiKey(uid);
        if (isMounted && gKey) {
          console.log("SETTINGS_HOOK: Gemini key fetched.");
          setGeminiKey(gKey);
        }
        
        const cKey = await getDeepSeekKey(uid);
        if (isMounted && cKey) {
          console.log("SETTINGS_HOOK: DeepSeek key fetched.");
          setDeepSeekKey(cKey);
        }

        // Load Notif Prefs (Still local per device)
        const prefs = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
        if (isMounted && prefs) setNotifPrefs(JSON.parse(prefs));
      } catch (error) {
        console.log("SETTINGS_HOOK: Error fetching global settings:", error);
      }
    };

    // مراقبة حالة تسجيل الدخول
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadAllSettings(user.uid);
      } else {
        console.log("SETTINGS_HOOK: No user logged in.");
      }
    });

    // محاولة فورية إذا كان المستخدم موجوداً بالفعل
    if (auth.currentUser) {
      loadAllSettings(auth.currentUser.uid);
    }

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const showSnack = (message: string, color: string = '') => {
    setSnack({ visible: true, message, color });
  };

  const hideSnack = () => setSnack(prev => ({ ...prev, visible: false }));

  // 2. API Keys Logic
  const saveGeminiKey = async (key: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await saveUserApiKey(uid, key);
    setGeminiKey(key);
    aiManager.invalidateKeyCache();
    showSnack('تم حفظ مفتاح Gemini ✅', '#2ecc71');
  };

  const saveDeepSeekKeyVal = async (key: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await saveDeepSeekKey(uid, key);
    setDeepSeekKey(key);
    aiManager.invalidateKeyCache();
    showSnack('تم حفظ مفتاح DeepSeek ✅', '#2ecc71');
  };

  const testGemini = async (key: string) => {
    setTesting(prev => ({ ...prev, gemini: true }));
    try {
      const res = await testGeminiKey(key);
      showSnack(res.message, res.success ? '#2ecc71' : '#e74c3c');
    } catch (e: any) {
      showSnack('خطأ: ' + e.message, '#e74c3c');
    } finally {
      setTesting(prev => ({ ...prev, gemini: false }));
    }
  };

  const testDeepSeek = async (key: string) => {
    setTesting(prev => ({ ...prev, deepseek: true }));
    try {
      const res = await testDeepSeekKey(key);
      showSnack(res.message, res.success ? '#2ecc71' : '#e74c3c');
    } catch (e: any) {
      showSnack('خطأ: ' + e.message, '#e74c3c');
    } finally {
      setTesting(prev => ({ ...prev, deepseek: false }));
    }
  };

  // 3. Notification Logic
  const updateNotifPref = async (key: keyof NotificationPrefs, value: boolean) => {
    const newPrefs = { ...notifPrefs, [key]: value };
    setNotifPrefs(newPrefs);
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(newPrefs));
  };

  // 4. System & Data Logic
  const toggleDarkMode = () => {
    const next = darkModePref === 'dark' ? 'auto' : darkModePref === 'auto' ? 'light' : 'dark';
    setDarkModePref(next);
  };

  const checkForUpdates = async () => {
    showSnack('جاري التحقق من التحديثات...', '#007acc');
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        showSnack('تم تحميل التحديث، جاري إعادة التشغيل...', '#2ecc71');
        setTimeout(() => Updates.reloadAsync(), 1500);
      } else {
        showSnack('أنت تستخدم أحدث نسخة ✅', '#2ecc71');
      }
    } catch (e: any) {
      showSnack('فشل البحث عن تحديث: ' + e.message, '#e74c3c');
    }
  };

  const exportData = async () => {
    try {
      const q = query(collection(db, 'purchases'), where('userId', '==', auth.currentUser?.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => d.data());
      
      const headers = Object.keys(data[0] || {});
      const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
      ].join('\n');

      const path = FileSystem.documentDirectory + 'masrofati_export.csv';
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path);
    } catch (e: any) {
      showSnack('فشل تصدير البيانات: ' + e.message, '#e74c3c');
    }
  };

  const deleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const q = query(collection(db, 'purchases'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'purchases', d.id))));
      await deleteDoc(doc(db, 'settings', user.uid));
      await deleteUser(user);
      await signOut(auth);
    } catch (e: any) {
      showSnack('فشل حذف الحساب: ' + e.message, '#e74c3c');
    }
  };

  return {
    geminiKey, deepseekKey,
    testing, notifPrefs,
    darkModePref, toggleDarkMode,
    snack, hideSnack,
    actions: {
      saveGeminiKey,
      saveDeepSeekKey: saveDeepSeekKeyVal,
      testGemini,
      testDeepSeek,
      updateNotifPref,
      checkForUpdates,
      exportData,
      deleteAccount,
      signOut: () => signOut(auth)
    }
  };
};
