import * as Location from 'expo-location';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Purchase } from '../types';
import { normalizeName } from '../utils/normalizer';
import { savePriceRecord } from './priceHistory';

/**
 * بيانات الشراء الجديدة (بدون المعرفات التي يولدها النظام)
 */
export type NewPurchase = Omit<Purchase, 'id' | 'userId' | 'createdAt'>;

/**
 * دالة مساعدة لنسخ الفاتورة للسوق العام (مجهولة الهوية)
 */
const prepareGlobalMarketDoc = (item: any, coords?: { latitude: number, longitude: number }) => {
  const quantity = Number(item.quantity) || 1;
  const totalPrice = Number(item.price || item.totalPrice) || 0;
  const unitPrice = Number(item.unitPrice) || (totalPrice / quantity);

  const name = item.name || item.productName || item.originalName || 'منتج غير معروف';
  const normName = normalizeName(name);
  
  // 💡 السطر السحري: تقطيع الاسم إلى كلمات مفتاحية لتسهيل البحث
  const keywords = normName.split(' ').filter((word: string) => word.trim().length > 0);
  keywords.push(normName); // إضافة الاسم كامل احتياطاً

  return {
    productName: normName, 
    originalName: name,
    searchKeywords: keywords, // 🛡️ مصفوفة البحث الذكي
    category: item.category || 'أخرى',
    price: totalPrice,
    unitPrice: unitPrice,
    store: item.store && item.store.trim() !== '' ? item.store : 'محل غير معروف',
    date: item.date || new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
    isVerified: item.isVerified || false, // 🛡️ هل السعر موثق من فاتورة
    location: coords ? {
      lat: coords.latitude,
      lon: coords.longitude
    } : null
  };
};

/**
 * إضافة شراء (Online/Offline)
 * مع حماية البيانات وإرسال نسخة للسوق العام (Hive Mind) - فقط للفواتير الموثقة
 */
export const addPurchase = async (userId: string, purchase: NewPurchase): Promise<string> => {
  if (!userId) throw new Error('يجب توفر معرف المستخدم (userId)');

  const purchaseData = {
    ...purchase,
    userId,
    price: Number(purchase.price) || 0,
    quantity: Number(purchase.quantity) || 1,
    createdAt: purchase.date || new Date().toISOString(),
    isVerified: purchase.isVerified || false, // اليدوي دائماً false إلا لو جاء من Scanner
  };

  const docRef = await addDoc(collection(db, 'purchases'), purchaseData);
  
  // ⚡ تشغيل "محرك الفيراري": حفظ السعر وتحديث الفهرس والمخزون
  // 🛡️ نمنع الإدخال اليدوي من لمس الرسوم البيانية العالمية لضمان النزاهة
  if (purchaseData.isVerified === true) {
    try {
       const unitPriceToSave = purchaseData.price / purchaseData.quantity;
       await savePriceRecord({
         ...purchaseData,
         price: unitPriceToSave // إرسال سعر القطعة الواحدة للمحرك
       } as any);
    } catch (e) {
       console.warn("Failed to save to smart engine", e);
    }
  }

  // 🌐 بث الفاتورة للسوق العام (الخطة الصفرية - الرادار المجتمعي)
  // 🛑 نمنع بث الإدخال اليدوي لحماية نزاهة البيانات
  if (purchaseData.price > 0 && purchaseData.isVerified === true) {
    try {
      let coords;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          coords = loc.coords;
        }
      } catch (locErr) {
        console.warn("Location fetch failed for global broadcast", locErr);
      }

      await addDoc(collection(db, 'global_prices'), prepareGlobalMarketDoc(purchaseData, coords));
    } catch (e) {
      console.warn("Failed to broadcast to global market", e);
    }
  }

  return docRef.id;
};

/**
 * إضافة مجموعة مشتريات كصفقة واحدة (Atomic Batch)
 * مع بث جميع الأصناف للرادار المجتمعي كبيانات موثقة
 */
export const addPurchasesBatch = async (userId: string, purchases: NewPurchase[]): Promise<void> => {
  if (!userId || !purchases || purchases.length === 0) return;

  const colRef = collection(db, 'purchases');
  const globalRef = collection(db, 'global_prices');
  const CHUNK_SIZE = 100; // تم التقليل أكثر لأن العمليات زادت (الفيراري يخدم)

  // محاولة جلب الموقع مرة واحدة للدفعة كاملة لتوفير الوقت والبطارية
  let coords;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      coords = loc.coords;
    }
  } catch (e) {
    console.warn("Batch location fetch failed", e);
  }

  // تقطيع المصفوفة إلى دفعات (Chunks)
  for (let i = 0; i < purchases.length; i += CHUNK_SIZE) {
    const chunk = purchases.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    // ⚡ مصفوفة لتخزين الوعود الخاصة بمحرك الأسعار
    const enginePromises: Promise<any>[] = [];

    chunk.forEach(purchase => {
      const docRef = doc(colRef);
      const purchaseData = {
        ...purchase,
        userId,
        price: Number(purchase.price) || 0,
        quantity: Number(purchase.quantity) || 1,
        createdAt: purchase.date || new Date().toISOString(),
        isVerified: true, // 🛡️ الإضافة من Scanner دائماً موثقة
      };
      batch.set(docRef, purchaseData);

      // ⚡ تشغيل المحرك الذكي لكل صنف في الفاتورة بالتوازي
      const unitPriceToSave = purchaseData.price / purchaseData.quantity;
      enginePromises.push(
        savePriceRecord({
          ...purchaseData,
          price: unitPriceToSave
        } as any).catch(e => console.warn("Failed saving item to engine", e))
      );

      // 🌐 بث الأصناف للرادار المجتمعي (بيانات موثقة 100%)
      if (purchaseData.price > 0) {
         const globalDocRef = doc(globalRef);
         batch.set(globalDocRef, prepareGlobalMarketDoc(purchaseData, coords));
      }
    });

    await batch.commit();
    
    // الانتظار حتى يكمل المحرك تخزين بيانات هذه الدفعة
    if (enginePromises.length > 0) {
       await Promise.all(enginePromises);
    }
  }
};

/**
 * الاستماع للمشتريات مع دعم Offline
 * Uses Firestore's native local cache.
 */
export const listenToPurchases = (userId: string, callback: (data: Purchase[]) => void) => {
  if (!userId) {
    callback([]);
    return () => {}; // إرجاع دالة فارغة لتجنب الأخطاء
  }

  const q = query(collection(db, 'purchases'), where('userId', '==', userId));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(docSnapshot => ({ 
      id: docSnapshot.id, 
      ...docSnapshot.data() 
    } as Purchase));
    
    callback(data);
  }, (error) => {
    console.error('Firestore listen error:', error.message);
  });

  return unsubscribe;
};

/**
 * حذف شراء
 */
export const removePurchase = async (purchaseId: string): Promise<void> => {
  if (!purchaseId) return;
  await deleteDoc(doc(db, 'purchases', purchaseId));
};