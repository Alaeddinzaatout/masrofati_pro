import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase/config';
import { aiManager } from '../services/aiServiceManager';
import { 
  checkAndAwardBadges, 
  getAllBadgesWithStatus, 
  getTotalSavings, 
  updateStat 
} from '../services/gamification';
import { listenToPurchases } from '../services/purchases';
import { 
  getMonthlySummary, 
  getPeriodSummary, 
  predictNextMonth 
} from '../services/reportEngine';
import { analyzeWasteWithAI } from '../services/wasteAnalyzer';
import { useRouter } from 'expo-router';
import { 
  checkAndIncrementDailyQuota, 
  showQuotaAlert 
} from '../services/subscription';
import { Purchase, Badge, WasteAnalysis, StorePrice } from '../types';

const CHART_COLORS = ['#007acc', '#27ae60', '#e74c3c', '#f39c12', '#8e44ad', '#2ecc71', '#e67e22', '#1abc9c'];

export const useReportsLogic = () => {
  const router = useRouter();
  // --- الأساسيات ---
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [totalSavings, setTotalSavings] = useState(0);

  // --- الحالات التحليلية ---
  const [wasteAnalysis, setWasteAnalysis] = useState<WasteAnalysis | null>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<any | null>(null);
  const [priceRadar, setPriceRadar] = useState<{ results: StorePrice[], trend: any | null }>({
    results: [],
    trend: null
  });
  const [shortages, setShortages] = useState<any[]>([]);
  const [prediction, setPrediction] = useState<any | null>(null);
  const [filteredSummary, setFilteredSummary] = useState<any | null>(null);

  // --- حالات التحميل ---
  const [loading, setLoading] = useState({
    prediction: false,
    radar: false,
    shortages: false,
    waste: false,
    trend: false,
  });

  // --- التنبيهات ---
  const [snack, setSnack] = useState({ visible: false, message: '' });

  // --- الكاش المحلي للرادار ---
  const [radarCache, setRadarCache] = useState<{ product: string; result: StorePrice[]; trend: any } | null>(null);

  // 1. المستمعات والبيانات الأولية
  useEffect(() => {
    let unsubPurchases: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubPurchases = listenToPurchases(user.uid, (data) => {
          setPurchases(data);
        });
        loadInitialData();
      } else {
        if (unsubPurchases) {
          unsubPurchases();
          unsubPurchases = null;
        }
        setPurchases([]);
      }
    });

    return () => {
      unsubAuth();
      if (unsubPurchases) unsubPurchases();
    };
  }, []);

  const loadInitialData = async () => {
    try {
      const b = await getAllBadgesWithStatus();
      setBadges(b);
      const s = await getTotalSavings();
      setTotalSavings(s);
    } catch (error) {
      console.error('Failed to load badges/savings:', error);
    }
  };

  const showSnack = (message: string) => setSnack({ visible: true, message });
  const hideSnack = () => setSnack({ ...snack, visible: false });

  // 2. معالجات الأحداث (Handlers)

  const handleAnalyzeTrend = async (data: Purchase[]) => {
    // لمنع التكرار المفرط
    if (trendAnalysis || loading.trend) return;

    const uid = auth.currentUser?.uid;
    if (uid) {
      const quota = await checkAndIncrementDailyQuota(uid, 'cop');
      if (!quota.allowed) {
        showQuotaAlert(router, 'daily_cop');
        return;
      }
    }

    setLoading(prev => ({ ...prev, trend: true }));
    try {
      const result = await aiManager.analyzeFinancialTrend(data);
      if (result) setTrendAnalysis(result);
    } catch (e) {
      console.warn('Trend Analysis failed:', e);
    } finally {
      setLoading(prev => ({ ...prev, trend: false }));
    }
  };

  const handlePriceSearch = async (productName: string) => {
    const trimmed = productName.trim();
    if (!trimmed || loading.radar) return;

    if (radarCache && radarCache.product.toLowerCase() === trimmed.toLowerCase()) {
      setPriceRadar({ results: radarCache.result, trend: radarCache.trend });
      showSnack('✨ تم تحديث البيانات من الذاكرة المحلية');
      return;
    }

    const uid = auth.currentUser?.uid;
    if (uid) {
      const quota = await checkAndIncrementDailyQuota(uid, 'cop');
      if (!quota.allowed) {
        showQuotaAlert(router, 'daily_cop');
        return;
      }
    }

    setLoading(prev => ({ ...prev, radar: true }));
    setPriceRadar({ results: [], trend: null });

    try {
      const searchTerm = trimmed.toLowerCase();
      const localMatches = purchases.filter(p => p.name && p.name.toLowerCase().includes(searchTerm));
      
      let stores: StorePrice[] = [];

      if (localMatches.length > 0) {
        const storeMap: Record<string, { unitPrice: number, date: string }> = {};
        localMatches.forEach(p => {
          const storeName = p.store || 'محل غير معروف';
          const qty = Number(p.quantity) || 1;
          const unitPrice = (Number(p.price) || 0) / qty;
          const pDate = p.date || p.createdAt || new Date().toISOString().split('T')[0];
          
          if (unitPrice > 0 && (!storeMap[storeName] || unitPrice < storeMap[storeName].unitPrice)) {
            storeMap[storeName] = { unitPrice, date: pDate };
          } else if (unitPrice > 0 && storeMap[storeName] && unitPrice === storeMap[storeName].unitPrice) {
            // Update to newer date if same price
            if (new Date(pDate).getTime() > new Date(storeMap[storeName].date).getTime()) {
              storeMap[storeName].date = pDate;
            }
          }
        });
        stores = Object.keys(storeMap).map(store => ({ 
          store, 
          unitPrice: storeMap[store].unitPrice,
          unit: 'حبة', // افتراضي
          date: storeMap[store].date
        }))
          .sort((a, b) => a.unitPrice - b.unitPrice);
      }

      if (stores.length === 0) {
        stores = await aiManager.getStoresForProduct(trimmed);
      }

      let currentTrend = null;
      try {
        const history = await aiManager.getPriceHistory(trimmed);
        if (history.length >= 2) {
          currentTrend = await aiManager.analyzePriceTrend(trimmed, history);
        }
      } catch {}

      setPriceRadar({ results: stores, trend: currentTrend });
      setRadarCache({ product: trimmed, result: stores, trend: currentTrend });
      await updateStat('comparisons');
    } catch (e: any) {
      showSnack('فشل البحث: ' + e.message);
    } finally {
      setLoading(prev => ({ ...prev, radar: false }));
    }
  };

  const handleAnalyzeWaste = async () => {
    if (loading.waste) return; // 🛡️ منع الاستدعاء المتكرر أثناء التحميل
    
    setLoading(prev => ({ ...prev, waste: true }));
    try {
      const result = await analyzeWasteWithAI(purchases) as WasteAnalysis;
      setWasteAnalysis(result);

      // تحديث الإحصائيات في AsyncStorage
      const statsData = await AsyncStorage.getItem('user-stats');
      const stats = statsData ? JSON.parse(statsData) : {};
      stats.wastePercent = result.overallWastePercent;
      await AsyncStorage.setItem('user-stats', JSON.stringify(stats));

      const newB = await checkAndAwardBadges();
      if (newB.length > 0) {
        showSnack(`🎉 ربحت وسام جديد: ${newB[0].title}`);
        loadInitialData();
      }
    } catch (e: any) {
      if (e.message?.includes('429')) {
        showSnack('⚠️ تجاوزت حد الطلبات، يرجى الانتظار دقيقة والمحاولة مرة أخرى.');
      } else {
        showSnack('فشل تحليل الهدر: ' + e.message);
      }
    } finally {
      setLoading(prev => ({ ...prev, waste: false }));
    }
  };

  const handlePredictShortages = async () => {
    if (loading.shortages) return;

    const uid = auth.currentUser?.uid;
    if (uid) {
      const quota = await checkAndIncrementDailyQuota(uid, 'cop');
      if (!quota.allowed) {
        showQuotaAlert(router, 'daily_cop');
        return;
      }
    }

    setLoading(prev => ({ ...prev, shortages: true }));
    try {
      const result = await aiManager.predictShortages(purchases);
      setShortages(result);
      if (result.length === 0) showSnack('🎉 لا توجد أصناف مهددة بالنقص حالياً');
    } catch (e: any) {
      showSnack('فشل توقع النقص: ' + e.message);
    } finally {
      setLoading(prev => ({ ...prev, shortages: false }));
    }
  };

  const handlePredictNextMonth = async () => {
    if (loading.prediction) return;

    const uid = auth.currentUser?.uid;
    if (uid) {
      const quota = await checkAndIncrementDailyQuota(uid, 'cop');
      if (!quota.allowed) {
        showQuotaAlert(router, 'daily_cop');
        return;
      }
    }

    setLoading(prev => ({ ...prev, prediction: true }));
    try {
      const pred = await predictNextMonth(purchases);
      setPrediction(pred);
      await updateStat('predictions');
      const newB = await checkAndAwardBadges();
      if (newB.length > 0) {
        showSnack(`🎉 ربحت وسام جديد: ${newB[0].title}`);
        loadInitialData();
      }
    } catch (e: any) {
      console.warn('Prediction failed:', e.message);
    } finally {
      setLoading(prev => ({ ...prev, prediction: false }));
    }
  };

  const handleGetMonthlySummary = (yearMonth: string) => {
    const [y, m] = yearMonth.split('-');
    if (!y || !m || isNaN(Number(y)) || isNaN(Number(m))) {
      showSnack('صيغة الشهر غير صالحة. استخدم YYYY-MM');
      return;
    }
    const startDate = `${y}-${m}-01`;
    const lastDay = new Date(Number(y), Number(m), 0).getDate();
    const endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
    const summary = getPeriodSummary(purchases, startDate, endDate);
    setFilteredSummary(summary);
  };

  // 3. البيانات المشتقة (Derived Data)

  const monthlyChartData = useMemo(() => {
    const summary = getMonthlySummary(purchases, 6);
    if (summary.length === 0) return { labels: [], datasets: [{ data: [] }] };
    return {
      labels: summary.map(s => s.month.substring(5)),
      datasets: [{ data: summary.map(s => s.total) }],
    };
  }, [purchases]);

  const categoryPieData = useMemo(() => {
    if (!filteredSummary || !filteredSummary.byCategory) return [];
    return Object.entries(filteredSummary.byCategory as Record<string, number>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, value], i) => ({
        name,
        value,
        color: CHART_COLORS[i % CHART_COLORS.length],
        legendFontColor: '#8E94A5',
        legendFontSize: 12,
      }));
  }, [filteredSummary]);

  return {
    purchases,
    badges,
    totalSavings,
    loading,
    wasteAnalysis,
    trendAnalysis,
    priceRadar,
    shortages,
    prediction,
    filteredSummary,
    monthlyChartData,
    categoryPieData,
    handlers: {
      onPriceSearch: handlePriceSearch,
      onAnalyzeWaste: handleAnalyzeWaste,
      onPredictShortages: handlePredictShortages,
      onPredictNextMonth: handlePredictNextMonth,
      onGetMonthlySummary: handleGetMonthlySummary,
    },
    snackbar: {
      visible: snack.visible,
      message: snack.message,
      show: showSnack,
      hide: hideSnack,
    }
  };
};
