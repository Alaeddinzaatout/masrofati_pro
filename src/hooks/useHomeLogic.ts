import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PurchaseFormData } from '../components/home/PurchaseFormModal';
import { auth, db } from '../firebase/config';
import { aiManager } from '../services/aiServiceManager';
import { addSavings, checkAndAwardBadges, updateStat } from '../services/gamification';
import { getStockAlerts } from '../services/priceHistory'; // ⚡ استيراد الاستعلام الخفيف
import { addPurchase, listenToPurchases, removePurchase } from '../services/purchases';
import { Purchase } from '../types';
import { getQuickStats, initSearchEngine, searchPurchases } from '../utils/searchEngine';

export const useHomeLogic = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [intelligenceSummary, setIntelligenceSummary] = useState<{
    safeToSpend: number;
    criticalItem: string | null;
    message: string;
    status: 'ok' | 'warning' | 'danger';
  } | null>(null);

  const [form, setForm] = useState<PurchaseFormData>({
    name: '',
    price: '',
    quantity: '1',
    unit: '',
    category: '',
    store: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<Purchase | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().split('-').slice(0, 2).join('-'));
  const [snackVisible, setSnackVisible] = useState(false);

  // 🛡️ المحرك الذكي (يحفظ كل تاريخك، ويمنع المستقبل، ويطرد أخطاء الماضي)
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth();
    
    // 1. دائماً نضيف الشهر الحالي باش القائمة ديما فيها خيار
    months.add(`${currentYear}-${String(currentMonthNum + 1).padStart(2, '0')}`);
    
    // 2. تجميع الشهور من الفواتير الحقيقية
    purchases.forEach(p => {
      const dateStr = p.date || p.createdAt;
      if (dateStr) {
        try {
          let year, month;
          if (dateStr.includes('-')) {
            const parts = dateStr.split('T')[0].split('-');
            if (parts.length >= 2) {
              year = parseInt(parts[0], 10);
              month = parseInt(parts[1], 10) - 1; // 0-indexed month
            }
          }
          
          if (year === undefined || month === undefined || isNaN(year) || isNaN(month)) {
            const dateObj = new Date(dateStr);
            if (!isNaN(dateObj.getTime())) {
               year = dateObj.getFullYear();
               month = dateObj.getMonth();
            }
          }

          if (year !== undefined && month !== undefined && !isNaN(year) && !isNaN(month)) {
            // 🛑 الفلتر الذكي:
            // - يقبل أي فاتورة من 2024 وطالع (يحفظ تاريخك لسنين قدام).
            // - يرفض أي فاتورة في المستقبل (لو شريت حاجة اليوم، مستحيل تسجلها في 2027).
            const isNotTooOld = year >= 2024;
            const isNotFuture = year < currentYear || (year === currentYear && month <= currentMonthNum);
            
            if (isNotTooOld && isNotFuture) {
              months.add(`${year}-${String(month + 1).padStart(2, '0')}`);
            }
          }
        } catch (e) {
          // ignore invalid dates
        }
      }
    });

    // 3. ترتيب أنيق (الأحدث فوق، والأقدم لوطا)
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [purchases]);

  const [snackMessage, setSnackMessage] = useState('');

  // Price Advisor alert state
  const [advisorAlert, setAdvisorAlert] = useState<any>(null);
  const [advisorVisible, setAdvisorVisible] = useState(false);

  // 1. Firebase Listener
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe = listenToPurchases(user.uid, setPurchases);
      } else {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        setPurchases([]);
      }
    });

    return () => {
      unsubAuth();
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 2. Search Engine Initialization
  useEffect(() => {
    if (purchases.length > 0) {
      initSearchEngine(purchases);
    }
  }, [purchases]);

  // 3. Intelligence Summary Calculation (Debounced/Optimized)
  useEffect(() => {
    let isMounted = true;
    const computeIntelligence = async () => {
      if (purchases.length === 0) return;

      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        // استخدام كاش للميزانية بدلاً من القراءة المتكررة من AsyncStorage في كل رندر
        const budgetVal = await AsyncStorage.getItem('monthly-budget');
        const savedBudget = budgetVal ? Number(budgetVal) : 0;

        if (!isMounted) return;

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // تحسين الفلترة والحساب في خطوة واحدة
        let currentSpending = 0;
        for (const p of purchases) {
            if (p.date && p.date.startsWith(currentMonth)) {
                currentSpending += (Number(p.price) || 0);
            }
        }

        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();
        const daysRemaining = Math.max(1, lastDayOfMonth - currentDay);
        
        const remaining = savedBudget - currentSpending;
        const safeToSpend = savedBudget > 0 ? Math.max(0, remaining / daysRemaining) : 0;

        // ⚡ البحث عن النواقص (النسخة الخفيفة والصاروخية)
        let criticalItem: string | null = null;
        try {
          // استدعاء خفيف جداً يقرأ من جدول النواقص المحدث مسبقاً بدلاً من حسابها من الصفر
          const alerts = await getStockAlerts(uid);
          if (alerts && alerts.length > 0) {
             const criticalAlert = alerts.find(a => a.urgency === 'critical' || a.urgency === 'warning');
             if (criticalAlert) criticalItem = criticalAlert.productName;
          }
        } catch(e) {
          console.warn("Failed fetching light stock alerts", e);
        }

        let status: 'ok' | 'warning' | 'danger' = 'ok';
        let message = 'ميزانيتك في وضع مستقر يابطل! استمر ✅';

        if (savedBudget > 0) {
          const burnRate = currentSpending / Math.max(1, currentDay);
          const projected = burnRate * lastDayOfMonth;
          if (currentSpending > savedBudget) {
            status = 'danger';
            message = 'تنبيه! لقد تجاوزت الميزانية المحددة 🚨';
          } else if (projected > savedBudget) {
            status = 'warning';
            message = `وتيرة صرفك عالية، قد تتجاوز الميزانية بـ ${(projected - savedBudget).toFixed(0)} د.ل ⚠️`;
          }
        }

        if (isMounted) {
          setIntelligenceSummary({
            safeToSpend: parseFloat(safeToSpend.toFixed(2)),
            criticalItem,
            message,
            status
          });
        }
      } catch (e) {
        console.error("Intelligence calc error:", e);
      }
    };

    // تأخير الحساب قليلاً للسماح للواجهة بالاستقرار
    const timer = setTimeout(computeIntelligence, 500);
    return () => {
        isMounted = false;
        clearTimeout(timer);
    };
  }, [purchases]);

  // 4. Logic Handlers
  const handleAddPurchase = useCallback(async () => {
    if (!form.name || !form.price || !form.store) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
     if (editItem) {
        // Update existing
        const inputPrice = parseFloat(form.price) || 0;
        const inputQty = parseInt(form.quantity) || 1;
        
        await updateDoc(doc(db, 'purchases', editItem.id), {
          name: form.name,
          price: inputPrice,           // 👈 الإجمالي
          unitPrice: inputPrice / inputQty, // 👈 سعر القطعة (حسبناه)
          quantity: inputQty,
          store: form.store,
          unit: form.unit,
          category: form.category,
          date: form.date,
        });
        setSnackMessage('تم تعديل الصنف بنجاح ✅');
      } else {
        // Add new
        const inputPrice = parseFloat(form.price) || 0;
        const inputQty = parseInt(form.quantity) || 1;

        const purchaseData = {
          name: form.name,
          price: inputPrice,           // 👈 الإجمالي
          unitPrice: inputPrice / inputQty, // 👈 سعر القطعة (حسبناه)
          quantity: inputQty,
          store: form.store,
          unit: form.unit,
          category: form.category,
          date: form.date || new Date().toISOString().split('T')[0],
        };
        await addPurchase(uid, purchaseData);
        setSnackMessage('تمت إضافة الصنف بنجاح ✅');

        // ====== Price Advisor ======
        try {
          const alert = await aiManager.priceAdvisor(purchaseData);
          if (alert.alert) {
            setAdvisorAlert(alert);
            setAdvisorVisible(true);
            if (alert.bestDeal) {
              const savings = parseFloat(form.price) - (alert.bestDeal as any).unitPrice;
              await addSavings(savings);
              await checkAndAwardBadges();
            }
          }
        } catch {}
      }

      await updateStat('purchases');
      setForm({
        name: '',
        price: '',
        quantity: '1',
        unit: '',
        category: '',
        store: '',
        date: new Date().toISOString().split('T')[0],
      });
      setModalVisible(false);
      setEditItem(null);
      setSnackVisible(true);
    } catch (error) {
      setSnackMessage('فشل العملية. حاول مرة أخرى.');
      setSnackVisible(true);
    }
  }, [form, editItem]);

  const handleEditItem = useCallback((item: Purchase) => {
    setEditItem(item);
    setForm({
      name: item.name,
      price: item.price.toString(),
      quantity: item.quantity.toString(),
      unit: item.unit || '',
      category: item.category || '',
      store: item.store || '',
      date: item.date || new Date().toISOString().split('T')[0],
    });
    setModalVisible(true);
  }, []);

  const handleDeleteItem = useCallback(async (purchaseId: string) => {
    if (!purchaseId) {
      setSnackMessage('معرف العنصر غير صالح');
      setSnackVisible(true);
      return;
    }
    try {
      await removePurchase(purchaseId);
      setSnackMessage('تم حذف الصنف ✅');
      setSnackVisible(true);
    } catch (error) {
      setSnackMessage('فشل حذف العنصر. حاول مرة أخرى.');
      setSnackVisible(true);
    }
  }, []);

  // 4. Data Derivation (Memoized)
  // 4. Data Derivation (Memoized)
  const filteredPurchases = useMemo(() => {
    let filteredData = purchases.filter(p => {
      const dateStr = p.date || p.createdAt;
      if (!dateStr) return false;
      
      // 🛡️ درع التواريخ: تحويل أي تاريخ ملخبط (2026-5-1) إلى (2026-05)
      try {
        let itemMonth = '';
        if (dateStr.includes('-')) {
          const parts = dateStr.split('T')[0].split('-');
          if (parts.length >= 2) {
            itemMonth = `${parts[0]}-${parts[1].padStart(2, '0')}`;
          }
        }
        
        if (!itemMonth) {
          const dateObj = new Date(dateStr);
          if (isNaN(dateObj.getTime())) return false; // تجاهل التواريخ المضروبة بالكامل
          itemMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        }
        
        return itemMonth === selectedMonth;
      } catch (e) {
        return false;
      }
    });
    
    if (searchQuery.trim()) {
      filteredData = searchPurchases(filteredData, searchQuery.trim());
    }

    // ترتيب من الأحدث إلى الأقدم
    return [...filteredData].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }, [purchases, searchQuery, selectedMonth]);

  // 🪤 فخ لكشف العدد الحقيقي
  console.log("Total in Database:", purchases.length);
  console.log("Total for Selected Month:", filteredPurchases.length);

  const stats = useMemo(() => 
    getQuickStats(filteredPurchases) as { count: number; total: number; avgPrice: number }, 
    [filteredPurchases]
  );

  return {
    // States
    form,
    setForm,
    modalVisible,
    setModalVisible,
    editItem,
    setEditItem,
    searchQuery,
    setSearchQuery,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    snackVisible,
    setSnackVisible,
    snackMessage,
    advisorAlert,
    advisorVisible,
    setAdvisorVisible,
    intelligenceSummary,
    // Derived Data
    filteredPurchases,
    stats,
    // Handlers
    handleAddPurchase,
    handleEditItem,
    handleDeleteItem,
  };
};