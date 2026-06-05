import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase/config';
import { listenToPurchases } from '../services/purchases';
import { getLowStockItems } from '../services/inventoryPredictor';
import { notificationService } from '../services/notificationService';
import { BudgetStats } from '../types';

const BUDGET_KEY = 'monthly-budget';

export const useBudgetLogic = () => {
  const [budget, setBudget] = useState<string>('');
  const [savedBudget, setSavedBudget] = useState<number>(0);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [currentSpending, setCurrentSpending] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // حماية من تكرار التنبيهات في نفس الجلسة
  const [hasNotifiedOverBudget, setHasNotifiedOverBudget] = useState(false);
  const [hasNotifiedBurnRate, setHasNotifiedBurnRate] = useState(false);

  // 1. جلب الميزانية والمشتريات والنواقص
  useEffect(() => {
    let unsubPurchases: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const uid = user.uid;
        
        const fetchInitial = async () => {
          const val = await AsyncStorage.getItem(BUDGET_KEY);
          if (val) {
            setSavedBudget(Number(val));
            setBudget(val);
          }
          
          try {
            const items = await getLowStockItems();
            setLowStockItems(items);
          } catch (e) {
            console.warn('Failed to load low stock items', e);
          }
        };
        fetchInitial();

        unsubPurchases = listenToPurchases(uid, (data) => {
          setPurchases(data);
          
          const now = new Date();
          const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const monthPurchases = data.filter(p => p.date && p.date.startsWith(currentMonth));
          const total = monthPurchases.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 1), 0);
          
          setCurrentSpending(total);
          setLoading(false);
          
          // التحديث عند تغير المشتريات
          getLowStockItems().then(setLowStockItems).catch(console.warn);
        });
      } else {
        if (unsubPurchases) {
          unsubPurchases();
          unsubPurchases = null;
        }
        setPurchases([]);
        setCurrentSpending(0);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubPurchases) unsubPurchases();
    };
  }, []);

  // 2. المحرك الحسابي الذكي + التنبيهات الاستباقية
  const stats = useMemo((): BudgetStats => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = Math.max(1, lastDayOfMonth - currentDay);
    
    const remaining = savedBudget - currentSpending;
    const progress = savedBudget > 0 ? Math.min(currentSpending / savedBudget, 1) : 0;
    
    const dailyBurnRate = currentSpending / Math.max(1, currentDay);
    const projectedMonthEnd = dailyBurnRate * lastDayOfMonth;
    const safeToSpendDaily = Math.max(0, remaining / daysRemaining);

    const upcomingEssentialCost = lowStockItems.reduce((sum, item) => {
      const productPurchase = purchases.find(p => p.name === item.productName);
      const unitPrice = productPurchase?.price || 0;
      return sum + ((item.lastQuantity || 1) * unitPrice);
    }, 0);

    // --- مشغلات التنبيهات الذكية ---
    if (savedBudget > 0) {
      // 1. تنبيه تجاوز الميزانية فعلياً
      if (remaining < 0 && !hasNotifiedOverBudget) {
        notificationService.sendImmediateNotification(
          '⚠️ تحذير: تجاوزت الميزانية!',
          `لقد صرفت ${currentSpending.toFixed(2)} د.ل وهو أكثر من ميزانيتك بـ ${Math.abs(remaining).toFixed(2)} د.ل.`
        );
        setHasNotifiedOverBudget(true);
      }

      // 2. تنبيه خطر التجاوز بناءً على معدل الحرق
      const isProjectedOver = projectedMonthEnd > savedBudget * 1.1; // تجاوز بنسبة 10%
      if (isProjectedOver && !hasNotifiedBurnRate && remaining > 0) {
        notificationService.sendImmediateNotification(
          '🚨 تنبيه استباقي: ميزانيتك في خطر',
          `بناءً على صرفك الحالي، ستتجاوز ميزانيتك بنهاية الشهر. المبلغ الآمن للصرف يومياً هو ${safeToSpendDaily.toFixed(2)} د.ل.`
        );
        setHasNotifiedBurnRate(true);
      }
    }

    return {
      budget: savedBudget,
      spent: currentSpending,
      remaining,
      progress,
      isOverBudget: remaining < 0,
      dailyBurnRate: parseFloat(dailyBurnRate.toFixed(2)),
      projectedMonthEnd: parseFloat(projectedMonthEnd.toFixed(2)),
      daysRemainingInMonth: daysRemaining,
      safeToSpendDaily: parseFloat(safeToSpendDaily.toFixed(2)),
      upcomingEssentialCost: parseFloat(upcomingEssentialCost.toFixed(2)),
    };
  }, [savedBudget, currentSpending, purchases, hasNotifiedOverBudget, hasNotifiedBurnRate]);

  // 3. الأفعال (Actions)
  const saveBudget = useCallback(async (newBudget: string) => {
    const amount = Number(newBudget);
    if (!amount || amount <= 0) return false;
    
    await AsyncStorage.setItem(BUDGET_KEY, newBudget);
    setSavedBudget(amount);
    setIsEditing(false);
    return true;
  }, []);

  const clearBudget = useCallback(async () => {
    await AsyncStorage.removeItem(BUDGET_KEY);
    setSavedBudget(0);
    setBudget('');
    setIsEditing(false);
  }, []);

  return {
    budget,
    setBudget,
    isEditing,
    setIsEditing,
    loading,
    stats,
    actions: {
      saveBudget,
      clearBudget,
    }
  };
};
