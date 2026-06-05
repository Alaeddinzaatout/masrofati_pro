import {
  addDoc, collection,
  deleteDoc,
  doc,
  DocumentData,
  DocumentSnapshot,
  getDoc, getDocs, limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch, // 🛡️ تم النقل للأعلى
  WriteBatch // 🛡️ استيراد نوع الباتش لتعزيز الأمان
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Purchase, StorePrice } from '../types';
import { logError } from './logger';

const PRICE_HISTORY_COLLECTION = 'priceHistory';
const PRODUCT_INDEX_COLLECTION = 'productIndex';
const WASTE_LOG_COLLECTION = 'wasteLog';
const CONSUMPTION_TRACK_COLLECTION = 'consumptionTrack';
const PRICE_ALERTS_COLLECTION = 'priceAlerts';

// ====== Internal Document Interfaces ======

export interface ProductIndexDoc {
  userId: string;
  productName: string;
  normalizedName: string;
  stores: string[];
  categories: string[];
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  priceTrend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

export interface ConsumptionTrackDoc {
  userId: string;
  productName: string;
  normalizedName: string;
  dailyConsumptionRate: number;
  currentStock: number;
  lastPurchaseDate: string;
  predictedRunOutDate: string;
  daysUntilRunOut: number;
  wastedSinceLast?: number;
  updatedAt: string;
}

export interface WasteLogDoc {
  userId: string;
  productName: string;
  normalizedName: string;
  purchasedAmount: number;
  wastedAmount: number;
  wastePercent: number;
  expiryDate?: string;
  wastedReason?: string;
  date?: string;
  createdAt: string;
}

export interface PriceAlertDoc {
  userId: string;
  productName: string;
  normalizedName: string;
  targetPrice: number;
  condition: 'below' | 'above';
  isActive: boolean;
  createdAt: string;
}

// ====== Assistant Types ======

export interface PriceRadarReport {
  productName: string;
  currentPrice: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  priceTrend: 'up' | 'down' | 'stable';
  trendPercent: number;
  bestStore: string;
  worstStore: string;
  priceHistory: Array<{ date: string; price: number; store: string }>;
  recommendation: string;
  confidence: number;
}

export interface StockAlert {
  productName: string;
  normalizedName: string;
  currentStock: number;
  daysUntilRunOut: number;
  urgency: 'info' | 'warning' | 'critical';
  suggestedQuantity: number;
  reason: string;
}

// ====== قاموس التصحيح الإملائي ======
const COMMON_MISPELLINGS: Record<string, string> = {
  'قهوه': 'قهوة', 'حليب': 'حليب', 'خبز': 'خبز', 'رز': 'أرز', 'زيت': 'زيت',
  'سكر': 'سكر', 'دجاج': 'دجاج', 'لحمه': 'لحم', 'بيض': 'بيض', 'جبن': 'جبن',
  'عصير': 'عصير', 'ماء': 'ماء', 'شاي': 'شاي', 'صابون': 'صابون', 'معجون': 'معجون',
  'شامبو': 'شامبو', 'مناديل': 'مناديل', 'حفاضات': 'حفاضات', 'زيت زيتون': 'زيت زيتون',
  'طماطم': 'طماطم', 'بصل': 'بصل', 'ثوم': 'ثوم', 'بطاطس': 'بطاطس', 'ليمون': 'ليمون',
  'برتقال': 'برتقال', 'موز': 'موز', 'تفاح': 'تفاح',
};

// ====== دوال المساعدة ======

export const normalizeProductName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/[ؤو]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[^\w\s\u0600-\u06FF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const correctSpelling = (name: string): string => {
  const normalized = normalizeProductName(name);
  return COMMON_MISPELLINGS[normalized] || name;
};

const detectOutliers = (prices: number[]): number[] => {
  if (prices.length < 4) return prices;

  const sorted = [...prices].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  const lowerBound = q1 - (iqr * 1.5);
  const upperBound = q3 + (iqr * 1.5);

  return prices.filter(p => p >= lowerBound && p <= upperBound);
};

const calculateTrend = (prices: { date: string; price: number }[]): 'up' | 'down' | 'stable' => {
  if (prices.length < 3) return 'stable';
  const sorted = [...prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
  const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
  const firstAvg = firstHalf.reduce((s, p) => s + p.price, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, p) => s + p.price, 0) / secondHalf.length;

  if (firstAvg <= 0) return 'stable';

  const change = ((secondAvg - firstAvg) / firstAvg) * 100;
  if (change > 5) return 'up';
  if (change < -5) return 'down';
  return 'stable';
};

// ====== 1. حفظ السجل الذكي ======
export const savePriceRecord = async (record: Partial<Purchase> & { userId: string; name: string; price: number; store: string }): Promise<string | null> => {
  try {
    if (!record.userId || !record.name || !record.price || record.price <= 0 || !record.store) {
      logError('priceHistory', new Error('Missing required fields or invalid price'), { context: 'savePriceRecord' });
      return null;
    }

    const correctedName = correctSpelling(record.name);
    const normalized = normalizeProductName(correctedName);
    if (!normalized) return null;
    
    const today = new Date().toISOString().split('T')[0];

    const duplicateCheck = query(
      collection(db, PRICE_HISTORY_COLLECTION),
      where('userId', '==', record.userId),
      where('normalizedName', '==', normalized),
      where('store', '==', record.store.trim()),
      where('date', '==', record.date || today),
      where('unitPrice', '==', record.price),
      limit(1)
    );
    const duplicateSnap = await getDocs(duplicateCheck);
    if (!duplicateSnap.empty) return duplicateSnap.docs[0].id;

    const recentPricesQuery = query(
      collection(db, PRICE_HISTORY_COLLECTION),
      where('userId', '==', record.userId),
      where('normalizedName', '==', normalized),
      where('store', '==', record.store.trim()),
      orderBy('date', 'desc'),
      limit(5)
    );
    const recentSnap = await getDocs(recentPricesQuery);
    const recentPrices = recentSnap.docs.map(d => typeof d.data().unitPrice === 'number' ? d.data().unitPrice : 0).filter(p => p > 0);

    if (recentPrices.length > 0) {
      const avgRecent = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
      const change = ((record.price - avgRecent) / avgRecent) * 100;
      if (Math.abs(change) > 30) {
        logError('priceHistory', new Error(`Price anomaly detected: ${change.toFixed(1)}% change`), { 
          context: 'savePriceRecord', productName: correctedName, change, userId: record.userId 
        });
      }
    }

    const batch = writeBatch(db);
    const newDocRef = doc(collection(db, PRICE_HISTORY_COLLECTION));
    batch.set(newDocRef, {
      ...record,
      userId: record.userId, // 🛡️ التعديل الأول: تأكيد كتابة الهوية صراحة
      productName: correctedName,
      normalizedName: normalized,
      unitPrice: record.price, 
      totalPrice: record.price * (record.quantity || 1),
      currency: 'LYD',
      isOnSale: record.isOnSale || false,
      createdAt: new Date().toISOString(),
    });

    await updateProductIndexBatch(batch, record.userId, normalized, correctedName, record.store.trim(), record.category || 'أخرى', record.price);
    await updateConsumptionTrackBatch(batch, record.userId, normalized, correctedName, record.quantity || 1, record.date || today);

    await batch.commit();
    return newDocRef.id;
  } catch (error) {
    logError('priceHistory', error, { context: 'savePriceRecord', userId: record?.userId });
    return null;
  }
};

// ====== 2. تحديث فهرس المنتج ======
const updateProductIndexBatch = async (batch: WriteBatch, userId: string, normalizedName: string, productName: string, store: string, category: string, newPrice: number): Promise<void> => {
  const indexRef = doc(db, PRODUCT_INDEX_COLLECTION, `${userId}_${normalizedName}`);
  const indexSnap = await getDoc(indexRef);

  if (indexSnap.exists()) {
    const data = indexSnap.data() as ProductIndexDoc;
    const stores = data.stores || [];
    const categories = data.categories || [];
    if (!stores.includes(store)) stores.push(store);
    if (!categories.includes(category)) categories.push(category);

    const allPricesQuery = query(
      collection(db, PRICE_HISTORY_COLLECTION),
      where('userId', '==', userId),
      where('normalizedName', '==', normalizedName),
      orderBy('date', 'desc')
    );
    const pricesSnap = await getDocs(allPricesQuery);
    const prices = pricesSnap.docs.map(d => typeof d.data().unitPrice === 'number' ? d.data().unitPrice : 0).filter(p => p > 0);

    const validPrices = detectOutliers(prices.length > 0 ? prices : [newPrice]);
    const avgPrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);
    const priceTrend = calculateTrend(pricesSnap.docs.map(d => ({ date: String(d.data().date || ''), price: typeof d.data().unitPrice === 'number' ? d.data().unitPrice : 0 })).filter(p => p.price > 0));

    batch.set(indexRef, {
      userId, // 🛡️ التأكيد الصريح
      productName,
      normalizedName,
      stores,
      categories,
      avgPrice: Math.round(avgPrice * 100) / 100,
      minPrice,
      maxPrice,
      priceTrend,
      lastUpdated: new Date().toISOString(),
    }, { merge: true }); // 🛡️ التعديل الثاني: الدمج الآمن بدل المسح
  } else {
    batch.set(indexRef, {
      userId,
      productName,
      normalizedName,
      stores: [store],
      categories: [category],
      avgPrice: newPrice,
      minPrice: newPrice,
      maxPrice: newPrice,
      priceTrend: 'stable',
      lastUpdated: new Date().toISOString(),
    }, { merge: true });
  }
};

// ====== 3. تتبع الاستهلاك ======
const updateConsumptionTrackBatch = async (batch: WriteBatch, userId: string, normalizedName: string, productName: string, purchasedQuantity: number, purchaseDate: string): Promise<void> => {
  const trackRef = doc(db, CONSUMPTION_TRACK_COLLECTION, `${userId}_${normalizedName}`);
  const trackSnap = await getDoc(trackRef);

  if (trackSnap.exists()) {
    const data = trackSnap.data() as ConsumptionTrackDoc;
    if (!data.lastPurchaseDate) return;

    const daysSinceLastPurchase = Math.max(1, (new Date(purchaseDate).getTime() - new Date(data.lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24));
    const consumedSinceLast = Math.max(0, data.currentStock - (data.wastedSinceLast || 0));
    const actualConsumption = consumedSinceLast > 0 ? consumedSinceLast : data.dailyConsumptionRate * daysSinceLastPurchase;
    const newConsumptionRate = (data.dailyConsumptionRate * 0.7) + ((actualConsumption / daysSinceLastPurchase) * 0.3);

    const newStock = purchasedQuantity;
    const daysUntilRunOut = newConsumptionRate > 0 ? newStock / newConsumptionRate : 30;
    const predictedRunOut = new Date();
    predictedRunOut.setDate(predictedRunOut.getDate() + daysUntilRunOut);

    batch.set(trackRef, {
      userId, // 🛡️ التأكيد الصريح
      productName,
      normalizedName,
      currentStock: newStock,
      dailyConsumptionRate: Math.round(newConsumptionRate * 100) / 100,
      lastPurchaseDate: purchaseDate,
      predictedRunOutDate: predictedRunOut.toISOString().split('T')[0],
      daysUntilRunOut: Math.round(daysUntilRunOut),
      wastedSinceLast: 0,
      updatedAt: new Date().toISOString(),
    }, { merge: true }); // 🛡️ التعديل الثالث: الدمج الآمن
  } else {
    batch.set(trackRef, {
      userId,
      productName,
      normalizedName,
      dailyConsumptionRate: Math.max(purchasedQuantity / 7, 0.1),
      currentStock: purchasedQuantity,
      lastPurchaseDate: purchaseDate,
      predictedRunOutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      daysUntilRunOut: 7,
      wastedSinceLast: 0,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }
};

// ====== 4. الحصول على سجل الأسعار ======

export const getPriceHistory = async (userId: string, productName: string, limitCount = 50): Promise<Purchase[]> => {
  try {
    if (!userId) return [];
    const normalized = normalizeProductName(correctSpelling(productName));
    if (!normalized) return [];

    // 🚀 تم إزالة المقص: جلب كل المشتريات بدون حدود
    const q = query(
      collection(db, PRICE_HISTORY_COLLECTION),
      where('userId', '==', userId),
      where('normalizedName', '==', normalized),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return { 
        id: docSnapshot.id, 
        userId: data.userId,
        name: data.productName || data.name,
        normalizedName: data.normalizedName,
        price: data.unitPrice || data.price,
        quantity: data.quantity,
        totalPrice: data.totalPrice,
        unit: data.unit,
        store: data.store,
        category: data.category,
        date: data.date,
        createdAt: data.createdAt
      } as Purchase;
    });
  } catch (error) {
    logError('priceHistory', error, { context: 'getPriceHistory', userId });
    return [];
  }
};

// ====== 5. الحصول على آخر سعر ======

export const getLatestPrice = async (userId: string, productName: string, store: string): Promise<Purchase | null> => {
  try {
    if (!userId) return null;
    const normalized = normalizeProductName(correctSpelling(productName));
    if (!normalized) return null;

    const q = query(
      collection(db, PRICE_HISTORY_COLLECTION),
      where('userId', '==', userId),
      where('normalizedName', '==', normalized),
      where('store', '==', store.trim()),
      orderBy('date', 'desc'),
      limit(1) // 🛡️ هذا لازم يقعد باش يجيب آخر سعر واحد فقط
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docSnapshot = snapshot.docs[0];
    const data = docSnapshot.data();
    return { 
      id: docSnapshot.id, 
      userId: data.userId,
      name: data.productName || data.name,
      normalizedName: data.normalizedName,
      price: data.unitPrice || data.price,
      quantity: data.quantity,
      totalPrice: data.totalPrice,
      unit: data.unit,
      store: data.store,
      category: data.category,
      date: data.date,
      createdAt: data.createdAt
    } as Purchase;
  } catch (error) {
    logError('priceHistory', error, { context: 'getLatestPrice', userId });
    return null;
  }
};

// ====== 6. البحث عن المتاجر ======

export const getStoresForProduct = async (userId: string, productName: string, limitCount = 100): Promise<StorePrice[]> => {
  try {
    if (!userId) return [];
    const normalized = normalizeProductName(correctSpelling(productName));
    if (!normalized) return [];

    // 🚀 تم إزالة المقص: جلب كل المتاجر المتاحة
    const q = query(
      collection(db, PRICE_HISTORY_COLLECTION),
      where('userId', '==', userId),
      where('normalizedName', '==', normalized),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];

    const storeMap = new Map<string, any>();
    snapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();
      const existing = storeMap.get(data.store);
      if (!existing || new Date(data.date || 0) > new Date(existing.date || 0)) {
        storeMap.set(data.store, data);
      }
    });

    const prices = Array.from(storeMap.values()).map(r => r.unitPrice || r.price).filter(p => p > 0);
    if (prices.length === 0) return [];

    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    const storeEntries = Array.from(storeMap.entries());
    const results = await Promise.all(storeEntries.map(async ([store, record]) => {
      const unitPrice = record.unitPrice || record.price;
      return {
        store,
        unitPrice,
        unit: record.unit,
        date: record.date,
        savingsPercent: avgPrice > 0 ? Math.round(((avgPrice - unitPrice) / avgPrice) * 100) : 0,
      } as StorePrice;
    }));
    return results.sort((a, b) => a.unitPrice - b.unitPrice);
  } catch (error) {
    logError('priceHistory', error, { context: 'getStoresForProduct', userId });
    return [];
  }
};

// ====== 7. تقرير رادار الأسعار ======

export const generatePriceRadarReport = async (userId: string, productName: string): Promise<PriceRadarReport | null> => {
  try {
    if (!userId) return null;
    const normalized = normalizeProductName(correctSpelling(productName));
    if (!normalized) return null;

    const history = await getPriceHistory(userId, productName, 100);
    if (history.length === 0) return null;

    const prices = history.map(h => h.price).filter(p => p > 0);
    if (prices.length === 0) return null;

    const validPrices = detectOutliers(prices);
    const currentPrice = history[0].price;
    const averagePrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);

    const priceHistory = history
      .map(h => ({ date: h.date, price: h.price, store: h.store }))
      .filter(h => h.price > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const priceTrend = calculateTrend(priceHistory);

    const trendPercent = (priceHistory.length > 1 && priceHistory[0].price > 0)
      ? ((priceHistory[priceHistory.length - 1].price - priceHistory[0].price) / priceHistory[0].price) * 100
      : 0;

    const storePrices = new Map<string, number[]>();
    history.forEach(h => {
      if (!storePrices.has(h.store)) storePrices.set(h.store, []);
      storePrices.get(h.store)!.push(h.price);
    });

    let bestStore = '', worstStore = '', bestAvg = Infinity, worstAvg = 0;
    storePrices.forEach((storePricesArray, store) => {
      const avg = storePricesArray.reduce((a, b) => a + b, 0) / storePricesArray.length;
      if (avg < bestAvg) { bestAvg = avg; bestStore = store; }
      if (avg > worstAvg) { worstAvg = avg; worstStore = store; }
    });

    let recommendation = '';
    const savingsVsAvg = averagePrice > 0 ? ((averagePrice - currentPrice) / averagePrice) * 100 : 0;

    if (priceTrend === 'down' && savingsVsAvg > 10) {
      recommendation = `السعر في انخفاض! وفّر ${savingsVsAvg.toFixed(1)}% مقارنة بالمتوسط. أنصح بالشراء الآن.`;
    } else if (priceTrend === 'up') {
      recommendation = `السعر في ارتفاع. آخر سعر ${currentPrice} د.ل. انتظر انخفاضاً أو اشتري من ${bestStore} (${bestAvg.toFixed(2)} د.ل)`;
    } else if (currentPrice <= minPrice * 1.05) {
      recommendation = `سعر ممتاز! قريب من أقل سعر مسجّل (${minPrice.toFixed(2)} د.ل)`;
    } else {
      recommendation = `السعر مستقر. المتوسط ${averagePrice.toFixed(2)} د.ل. أفضل متجر: ${bestStore}`;
    }

    return {
      productName: history[0].name,
      currentPrice,
      averagePrice: Math.round(averagePrice * 100) / 100,
      minPrice,
      maxPrice,
      priceTrend,
      trendPercent: Math.round(trendPercent * 100) / 100,
      bestStore,
      worstStore,
      priceHistory: priceHistory.slice(-30),
      recommendation,
      confidence: Math.min(history.length / 20, 1),
    };
  } catch (error) {
    logError('priceHistory', error, { context: 'generatePriceRadarReport', userId });
    return null;
  }
};

// ====== 8. تسجيل الهدر ======

export const logWaste = async (wasteRecord: Partial<WasteLogDoc> & { userId: string; productName: string; purchasedAmount: number; wastedAmount: number }): Promise<string | null> => {
  try {
    if (!wasteRecord.userId || !wasteRecord.productName || wasteRecord.purchasedAmount <= 0) {
      logError('priceHistory', new Error('Missing required fields for waste record'), { 
        context: 'logWaste',
        hasUserId: !!wasteRecord.userId,
        hasProductName: !!wasteRecord.productName 
      });
      return null;
    }

    const normalized = normalizeProductName(correctSpelling(wasteRecord.productName));
    const docRef = await addDoc(collection(db, WASTE_LOG_COLLECTION), {
      ...wasteRecord,
      normalizedName: normalized,
      wastePercent: (wasteRecord.wastedAmount / wasteRecord.purchasedAmount) * 100,
      createdAt: new Date().toISOString(),
    });

    const trackRef = doc(db, CONSUMPTION_TRACK_COLLECTION, `${wasteRecord.userId}_${normalized}`);
    const trackSnap = await getDoc(trackRef);

    if (trackSnap.exists()) {
      const data = trackSnap.data() as ConsumptionTrackDoc;
      const wastedAmount = Math.max(0, wasteRecord.wastedAmount);
      await setDoc(trackRef, {
        ...data,
        currentStock: Math.max(0, data.currentStock - wastedAmount),
        wastedSinceLast: (data.wastedSinceLast || 0) + wastedAmount,
        updatedAt: new Date().toISOString(),
      });
    }
    return docRef.id;
  } catch (error) {
    logError('priceHistory', error, { context: 'logWaste', userId: wasteRecord?.userId });
    return null;
  }
};

// ====== 9. تنبيهات المخزون ======

export const getStockAlerts = async (userId: string, limitCount = 50): Promise<StockAlert[]> => {
  try {
    if (!userId) return [];

    // 🚀 تم إزالة المقص: جلب كل تنبيهات المخزون بدون حدود
    const q = query(
      collection(db, CONSUMPTION_TRACK_COLLECTION),
      where('userId', '==', userId),
      orderBy('daysUntilRunOut', 'asc')
    );

    const snapshot = await getDocs(q);
    const tracks = snapshot.docs.map(d => d.data() as ConsumptionTrackDoc);

    const alerts: StockAlert[] = [];
    tracks.forEach(track => {
      let urgency: 'info' | 'warning' | 'critical' = 'info', reason = '';
      const days = track.daysUntilRunOut || 0;

      if (days <= 2) { urgency = 'critical'; reason = `نفاد خلال ${days} أيام!`; }
      else if (days <= 5) { urgency = 'warning'; reason = `المخزون ينفاد خلال ${days} أيام`; }
      else if (days <= 7) { urgency = 'info'; reason = `المخزون يكفي لـ ${days} أيام`; }
      else return;

      alerts.push({
        productName: track.productName, 
        normalizedName: track.normalizedName,
        currentStock: track.currentStock, 
        daysUntilRunOut: days,
        urgency, 
        suggestedQuantity: Math.ceil((track.dailyConsumptionRate || 0.1) * 7), 
        reason,
      });
    });

    return alerts.sort((a, b) => a.daysUntilRunOut - b.daysUntilRunOut);
  } catch (error) {
    logError('priceHistory', error, { context: 'getStockAlerts', userId });
    return [];
  }
};

// ====== 10. إعداد تنبيه سعر ======

export const setPriceAlert = async (userId: string, productName: string, targetPrice: number, condition: 'below' | 'above'): Promise<string | null> => {
  try {
    if (!userId || !productName || !targetPrice || targetPrice <= 0) {
      logError('priceHistory', new Error('Missing required fields for price alert'), { 
        context: 'setPriceAlert',
        hasUserId: !!userId, 
        hasProductName: !!productName,
        targetPrice 
      });
      return null;
    }

    const normalized = normalizeProductName(correctSpelling(productName));

    const duplicateCheck = query(
      collection(db, PRICE_ALERTS_COLLECTION),
      where('userId', '==', userId),
      where('normalizedName', '==', normalized),
      where('targetPrice', '==', targetPrice),
      where('condition', '==', condition),
      where('isActive', '==', true),
      limit(1)
    );
    const duplicateSnap = await getDocs(duplicateCheck);
    if (!duplicateSnap.empty) {
      return duplicateSnap.docs[0].id;
    }

    const docRef = await addDoc(collection(db, PRICE_ALERTS_COLLECTION), {
      userId, 
      productName: correctSpelling(productName), 
      normalizedName: normalized,
      targetPrice, 
      condition, 
      isActive: true, 
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    logError('priceHistory', error, { context: 'setPriceAlert', userId });
    return null;
  }
};

// ====== 11. الحصول على جميع المنتجات ======

export const getAllProducts = async (userId: string, limitCount = 100, startAfterDoc: DocumentSnapshot | null = null): Promise<{products: ProductIndexDoc[], lastDoc: DocumentSnapshot | null}> => {
  try {
    if (!userId) return { products: [], lastDoc: null };

    // 🚀 تم إزالة المقص: جلب جميع المنتجات دفعة واحدة بدون حدود
    let q = query(
      collection(db, PRODUCT_INDEX_COLLECTION),
      where('userId', '==', userId),
      orderBy('productName')
    );

    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }

    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(docSnapshot => ({ 
      id: docSnapshot.id, 
      ...docSnapshot.data() 
    } as any));
    return { products, lastDoc: snapshot.docs[snapshot.docs.length - 1] || null };
  } catch (error) {
    logError('priceHistory', error, { context: 'getAllProducts', userId });
    return { products: [], lastDoc: null };
  }
};

// ====== 12. البحث المتقدم ======

export const searchProducts = async (userId: string, searchTerm: string, limitCount = 20, startAfterDoc: DocumentSnapshot | null = null): Promise<{products: ProductIndexDoc[], lastDoc: DocumentSnapshot | null}> => {
  try {
    if (!userId) return { products: [], lastDoc: null };

    const normalized = normalizeProductName(searchTerm);
    if (!normalized) return { products: [], lastDoc: null };

    // 🚀 تم إزالة المقص: إظهار جميع نتائج البحث
    let q = query(
      collection(db, PRODUCT_INDEX_COLLECTION),
      where('userId', '==', userId),
      where('normalizedName', '>=', normalized),
      where('normalizedName', '<=', normalized + '\uf8ff'),
      orderBy('normalizedName')
    );

    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }

    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(docSnapshot => ({ 
      id: docSnapshot.id, 
      ...docSnapshot.data() 
    } as any));
    return { products, lastDoc: snapshot.docs[snapshot.docs.length - 1] || null };
  } catch (error) {
    logError('priceHistory', error, { context: 'searchProducts', userId });
    return { products: [], lastDoc: null };
  }
};

// ====== دوال إضافية ======

export const deletePriceRecord = async (userId: string, recordId: string): Promise<boolean> => {
  try {
    if (!userId || !recordId) return false;

    const recordRef = doc(db, PRICE_HISTORY_COLLECTION, recordId);
    const recordSnap = await getDoc(recordRef);

    if (!recordSnap.exists()) return false;

    const data = recordSnap.data() as DocumentData;
    if (data.userId !== userId) {
      logError('priceHistory', new Error('Unauthorized delete attempt'), { 
        context: 'deletePriceRecord', 
        userId, 
        recordOwner: data.userId 
      });
      return false;
    }

    await deleteDoc(recordRef);
    return true;
  } catch (error) {
    logError('priceHistory', error, { context: 'deletePriceRecord', userId });
    return false;
  }
};

export const updatePriceRecord = async (userId: string, recordId: string, updates: Partial<Purchase>): Promise<boolean> => {
  try {
    if (!userId || !recordId) return false;

    const recordRef = doc(db, PRICE_HISTORY_COLLECTION, recordId);
    const recordSnap = await getDoc(recordRef);

    if (!recordSnap.exists()) return false;

    const data = recordSnap.data() as DocumentData;
    if (data.userId !== userId) {
      logError('priceHistory', new Error('Unauthorized update attempt'), { 
        context: 'updatePriceRecord', 
        userId, 
        recordOwner: data.userId 
      });
      return false;
    }

    const firestoreUpdates: any = { ...updates };
    if (updates.name) {
      const corrected = correctSpelling(updates.name);
      firestoreUpdates.productName = corrected;
      firestoreUpdates.normalizedName = normalizeProductName(corrected);
    }
    if (updates.price !== undefined) {
      if (updates.price <= 0) delete firestoreUpdates.price;
      else firestoreUpdates.unitPrice = updates.price;
    }

    await updateDoc(recordRef, firestoreUpdates);
    return true;
  } catch (error) {
    logError('priceHistory', error, { context: 'updatePriceRecord', userId });
    return false;
  }
};

export const updateConsumptionStock = async (userId: string, productName: string, newStock: number): Promise<boolean> => {
  try {
    if (!userId || !productName || newStock < 0) return false;

    const normalized = normalizeProductName(correctSpelling(productName));
    const trackRef = doc(db, CONSUMPTION_TRACK_COLLECTION, `${userId}_${normalized}`);
    const trackSnap = await getDoc(trackRef);

    if (!trackSnap.exists()) return false;

    const data = trackSnap.data() as ConsumptionTrackDoc;
    const consumptionRate = data.dailyConsumptionRate || 0.1;
    const daysUntilRunOut = consumptionRate > 0 ? newStock / consumptionRate : 30;
    const predictedRunOut = new Date();
    predictedRunOut.setDate(predictedRunOut.getDate() + daysUntilRunOut);

    await setDoc(trackRef, {
      ...data,
      currentStock: newStock,
      daysUntilRunOut: Math.round(daysUntilRunOut),
      predictedRunOutDate: predictedRunOut.toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    logError('priceHistory', error, { context: 'updateConsumptionStock', userId });
    return false;
  }
};