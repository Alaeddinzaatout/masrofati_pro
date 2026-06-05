// @ts-nocheck
import Fuse from 'fuse.js';

let fuseInstance = null;
let lastData = null;

/**
 * تهيئة محرك البحث مع كل المشتريات
 * @param {Array} purchases - قائمة المشتريات
 */
export const initSearchEngine = (purchases) => {
  // تجنب إعادة التهيئة إذا كانت البيانات نفسها
  if (lastData === purchases) return;
  lastData = purchases;

  fuseInstance = new Fuse(purchases, {
    keys: [
      { name: 'name', weight: 0.5 },
      { name: 'store', weight: 0.3 },
      { name: 'category', weight: 0.2 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 1,
    shouldSort: true,
  });
};

/**
 * بحث دقيق في الاسم والمحل فقط
 * @param {Array} purchases - قائمة المشتريات
 * @param {string} query - نص البحث
 * @returns {Array} النتائج المطابقة
 */
export const searchPurchases = (purchases, query) => {
  if (!query || !query.trim()) return purchases;
  const q = query.toLowerCase().trim();
  
  return purchases.filter(item => 
    (item.name && item.name.toLowerCase().includes(q)) || 
    (item.store && item.store.toLowerCase().includes(q))
  );
};

/**
 * تصفية حسب الفترة الزمنية (مع دعم الشهر التقويمي الحالي)
 */
export const filterByPeriod = (purchases, period, selectedMonth = null) => {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (period === 'all') return purchases;

  return purchases.filter(item => {
    if (!item.date) return false;
    
    if (period === 'month') {
      const targetMonth = selectedMonth || currentMonthStr;
      return item.date.startsWith(targetMonth);
    }

    const itemDate = new Date(item.date);
    if (isNaN(itemDate.getTime())) return false;
    const diffTime = now.getTime() - itemDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    switch (period) {
      case 'day': return diffDays < 1;
      case 'week': return diffDays < 7;
      default: return true;
    }
  });
};

/**
 * الحصول على إحصائيات سريعة
 * @param {Array} purchases - قائمة المشتريات
 * @returns {Object} إحصائيات
 */
export const getQuickStats = (purchases) => {
  // 👈 التعديل هنا: نجمع الإجمالي مباشرة (price) بدون ما نضربه في الكمية
  const total = purchases.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const count = purchases.length;
  const avgPrice = count > 0 ? total / count : 0;

  return { total, count, avgPrice };
};