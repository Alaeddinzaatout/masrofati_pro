// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';

const PURCHASES_KEY = 'offline-purchases';
const PENDING_SYNC_KEY = 'pending-sync';

// حفظ المشتريات محلياً
export const saveLocally = async (purchases) => {
  try {
    await AsyncStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
  } catch (e) {
    console.warn('فشل الحفظ المحلي:', e);
  }
};

// تحميل المشتريات المحلية
export const loadLocally = async () => {
  try {
    const data = await AsyncStorage.getItem(PURCHASES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn('فشل التحميل المحلي:', e);
    return [];
  }
};

// إضافة عملية للمزامنة لاحقاً
export const addPendingSync = async (purchase) => {
  try {
    const pending = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    const list = pending ? JSON.parse(pending) : [];
    list.push({ ...purchase, pendingSince: new Date().toISOString() });
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('فشل إضافة عملية مزامنة:', e);
  }
};

// جلب العمليات المعلقة للمزامنة
export const getPendingSync = async () => {
  try {
    const pending = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    return pending ? JSON.parse(pending) : [];
  } catch (e) {
    return [];
  }
};

// مسح العمليات المعلقة بعد المزامنة الناجحة
export const clearPendingSync = async () => {
  await AsyncStorage.removeItem(PENDING_SYNC_KEY);
};