import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc, doc,
  getDocs,
  limit, onSnapshot,
  orderBy,
  query,
  updateDoc,
  where
} from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { auth, db } from '../firebase/config';
import { analyzeConsumption } from '../services/inventoryPredictor';
import { logError } from '../services/logger';
import { checkAccess, recordUsage, showQuotaAlert } from '../services/subscription';
import { generateStrategicShoppingPlan } from '../services/priceAdvisor';
import { listenToPurchases } from '../services/purchases';
import { PriceData, ShoppingItem } from '../types';
import { getRootName } from '../utils/normalizer';
import { useRouter } from 'expo-router';

export interface SmartSuggestion {
  name: string;
  type: 'smart' | 'search' | 'seasonal' | 'urgent';
  priority: number;
  confidence: number;
  reason: string;
  suggestedQty: number;
  predictedRunOut?: string;
  consumptionRate?: number;
  currentStock?: number;
}

interface UserFeedback {
  name: string;
  rejectedCount: number;
  lastRejectedAt: string;
  acceptedCount: number;
}

interface ShoppingLogicOutput {
  items: ShoppingItem[];
  suggestions: SmartSuggestion[];
  priceHistoryMap: Record<string, PriceData>;
  strategicPlan: any | null;
  loading: { initial: boolean; more: boolean; ai: boolean; plan: boolean; };
  handlers: {
    addItem: (name: string, quantity: string, unit: string, category: string, note?: string) => Promise<void>;
    toggleItem: (id: string, checked: boolean) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    acceptSuggestion: (name: string) => Promise<void>;
    rejectSuggestion: (name: string) => Promise<void>;
    generatePlan: () => Promise<void>;
  };
}

const ITEMS_PER_PAGE = 20;
const SMART_FEEDBACK_KEY = 'smart-user-feedback';

// 🛑 قائمة الكلمات المحظورة (الكماليات والخدمات التي لا يجب توقعها)
const NON_ESSENTIALS_BLACKLIST = [
  'بجام', 'ملابس', 'حذاء', 'كندرة', 'سروال', 'قميص', 'عطر', 'مكياج', 
  'تلفون', 'شاحن', 'رصيد', 'اشتراك', 'كارت', 'فاتورة', 'كهرباء', 'نت', 
  'بنزين', 'سيارة', 'صيانة', 'هدية', 'مطعم', 'كافيه', 'سينما', 'لعبة'
];

export const useShoppingLogic = (): ShoppingLogicOutput => {
  const router = useRouter();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [priceHistoryMap, setPriceHistoryMap] = useState<Record<string, PriceData>>({});
  const [userFeedback, setUserFeedback] = useState<Record<string, UserFeedback>>({});
  const [strategicPlan, setStrategicPlan] = useState<any | null>(null);
  const [notifiedItems, setNotifiedItems] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  
  const [loading, setLoading] = useState({ initial: true, more: false, ai: false, plan: false });

  // 1. Firebase Listeners
  useEffect(() => {
    let unsubscribeList: (() => void) | null = null;
    let unsubscribePurchases: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const uid = user.uid;
        const q = query(
          collection(db, 'shoppingLists'),
          where('userId', '==', uid)
        );

        unsubscribeList = onSnapshot(q, (snapshot) => {
          const listItems = snapshot.docs.map(snapshotDoc => ({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
          } as ShoppingItem));
          setItems(listItems);
          setLoading(prev => ({ ...prev, initial: false }));
        }, (err) => {
          console.warn("Shopping list listener permission issue:", err.message);
        });

        unsubscribePurchases = listenToPurchases(uid, setPurchases);

        AsyncStorage.getItem(SMART_FEEDBACK_KEY).then(data => {
          if (data) setUserFeedback(JSON.parse(data));
        });
      } else {
        if (unsubscribeList) unsubscribeList();
        if (unsubscribePurchases) unsubscribePurchases();
        setItems([]);
        setPurchases([]);
      }
    });

    return () => {
      unsubAuth();
      if (unsubscribeList) unsubscribeList();
      if (unsubscribePurchases) unsubscribePurchases();
    };
  }, []);

  // 2. الأسعار التلقائية
  useEffect(() => {
    const loadPrices = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid || items.length === 0) return;

      const prices: Record<string, PriceData> = {};
      const uniqueNames = Array.from(new Set(items.map(i => i.name)));

      try {
        await Promise.all(uniqueNames.map(async (name) => {
          const pQuery = query(
            collection(db, 'purchases'),
            where('userId', '==', uid),
            where('name', '==', name),
            orderBy('date', 'desc'),
            limit(1)
          );
          const snap = await getDocs(pQuery);
          if (!snap.empty) {
            const latest = snap.docs[0].data();
            prices[name] = {
              latestPrice: latest.price || 0,
              averagePrice: latest.price || 0,
              trend: 'same',
              store: latest.store || 'غير معروف',
            };
          }
        }));
        setPriceHistoryMap(prices);
      } catch (err) {
        logError('shopping_prices_load', err);
      }
    };
    loadPrices();
  }, [items.map(i => i.id).join(',')]);

  // 3. 🧠 الدماغ المحمي بالكامل - محرك توقع النواقص الاحترافي
  useEffect(() => {
    const generateSuggestions = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid || purchases.length === 0) {
        setSuggestions([]);
        return;
      }

      try {
        // 1. جلب كافة بيانات التتبع من قاعدة البيانات (الحقيقة الوحيدة)
        const trackQuery = query(collection(db, 'consumptionTrack'), where('userId', '==', uid));
        const trackSnap = await getDocs(trackQuery);
        const tracks = trackSnap.docs.map(d => d.data());

        const result: SmartSuggestion[] = [];
        const shoppingListRoots = new Set(items.map(i => getRootName(i.name)));
        const now = new Date().getTime();

        for (const track of tracks) {
          const rootName = track.normalizedName;
          if (shoppingListRoots.has(rootName)) continue;

          // 🛑 تصفية الكماليات الصارمة (زي فرشة الشعر اللي حكى عليها المدير)
          if (NON_ESSENTIALS_BLACKLIST.some(word => rootName.includes(word))) continue;

          const daysSinceLast = track.lastPurchaseDate ? (now - new Date(track.lastPurchaseDate).getTime()) / 86400000 : 99;
          const consumptionRate = track.dailyConsumptionRate || 0.1;
          const daysUntilRunOut = track.daysUntilRunOut || 0;

          // 💡 منطق "الأساسيات" (Staple Logic)
          const analysis = await analyzeConsumption(purchases, track.productName);
          const isStaple = (analysis as any).isStaple;
          const stapleRank = (analysis as any).stapleRank || 0;

          let priority = 0;
          let reason = '';
          let type: 'smart' | 'urgent' = 'smart';

          // أ. النواقص الحرجة (باقي 3 أيام أو أقل)
          if (daysUntilRunOut <= 3) {
            priority = 3 + stapleRank * 0.5;
            type = 'urgent';
            reason = '⚠️ المخزون انتهى تقريباً';
          } 
          // ب. التذكير بالأساسيات (حتى لو لسه ما كملتش، بس قربت)
          else if (isStaple && daysUntilRunOut <= 7) {
            priority = 2 + stapleRank * 0.3;
            reason = '🏠 من أساسيات الحوش';
          }
          // ج. الأنماط الاستهلاكية العادية
          else if (daysSinceLast > 10 && consumptionRate > 0.05) {
            priority = 1;
            reason = `💡 آخر شراء منذ ${Math.floor(daysSinceLast)} يوم`;
          }

          // 📉 حساب "عجز الاستهلاك" (Deficit Calculation)
          // لو واحد متعود يشري 4 حليب في الأسبوع وغاب أسبوعين، نقترح عليه كمية أكبر
          let suggestedQty = Math.ceil(consumptionRate * 7) || 1; // الافتراضي هو استهلاك أسبوع
          if (daysSinceLast > 14 && isStaple) {
            suggestedQty = Math.ceil(consumptionRate * 10); // زدنا الكمية لتعويض الغياب
          }

          const feedback = userFeedback[rootName];
          if (feedback) {
            priority -= (feedback.rejectedCount * 1.0);
            priority += (feedback.acceptedCount * 0.5);
          }

          if (priority > 1.5 || (isStaple && priority > 0.8)) {
            result.push({
              name: track.productName,
              type,
              priority,
              confidence: isStaple ? 1.0 : 0.7,
              reason,
              suggestedQty,
              predictedRunOut: `${daysUntilRunOut} يوم`,
              currentStock: track.currentStock,
            });
          }
        }

        setSuggestions(result.sort((a, b) => b.priority - a.priority).slice(0, 10));
      } catch (err) {
        console.warn("Failed to generate smart suggestions", err);
      }
    };

    generateSuggestions();
  }, [purchases, items, userFeedback]);

  // 4. خطة التسوق
  const handleGeneratePlan = async () => {
    const activeItems = items.filter(i => !i.checked);
    if (activeItems.length === 0) return;

    // Smart Cart Gate
    const uid = auth.currentUser?.uid;
    if (uid) {
      const access = await checkAccess(uid, 'question');
      if (!access.allowed) {
        showQuotaAlert(router);
        return;
      }
    }

    setLoading(prev => ({ ...prev, plan: true }));
    try {
      const plan = await generateStrategicShoppingPlan(activeItems.map(i => ({ name: i.name, quantity: i.quantity })));
      setStrategicPlan(plan);
      
      // Deduct usage after successful AI plan generation
      if (uid) {
        await recordUsage(uid, 'question');
      }
    } catch (err) {
      logError('shopping_plan_generate', err);
    } finally {
      setLoading(prev => ({ ...prev, plan: false }));
    }
  };

  // 5. التغذية الراجعة
  const rejectSuggestion = useCallback(async (name: string) => {
    const updated = { ...userFeedback };
    if (!updated[name]) updated[name] = { name, rejectedCount: 0, lastRejectedAt: new Date().toISOString(), acceptedCount: 0 };
    updated[name].rejectedCount++;
    updated[name].lastRejectedAt = new Date().toISOString();
    setUserFeedback(updated);
    await AsyncStorage.setItem(SMART_FEEDBACK_KEY, JSON.stringify(updated));
  }, [userFeedback]);

  const acceptSuggestion = useCallback(async (name: string) => {
    const updated = { ...userFeedback };
    if (!updated[name]) updated[name] = { name, rejectedCount: 0, lastRejectedAt: new Date().toISOString(), acceptedCount: 0 };
    updated[name].acceptedCount++;
    setUserFeedback(updated);
    await AsyncStorage.setItem(SMART_FEEDBACK_KEY, JSON.stringify(updated));
  }, [userFeedback]);

  const addItem = useCallback(async (name: string, quantity: string, unit: string, category: string, note: string = '') => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await addDoc(collection(db, 'shoppingLists'), {
        userId: uid, name, quantity: parseFloat(quantity) || 1, unit, category, note, checked: false, createdAt: new Date().toISOString(),
      });
    } catch (error) { logError('shopping_list_add', error); throw error; }
  }, []);

  const toggleItem = useCallback(async (id: string, checked: boolean) => {
    try { await updateDoc(doc(db, 'shoppingLists', id), { checked }); } 
    catch (error) { logError('shopping_list_toggle', error); }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    try { await deleteDoc(doc(db, 'shoppingLists', id)); } 
    catch (error) { logError('shopping_list_delete', error); }
  }, []);

  return {
    items, suggestions, priceHistoryMap, strategicPlan, loading,
    handlers: { addItem, toggleItem, deleteItem, acceptSuggestion, rejectSuggestion, generatePlan: handleGeneratePlan }
  };
};