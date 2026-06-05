import { auth } from '../firebase/config';
import { Purchase } from '../types';
import { analyzeExpenseText, getCerebrasKey } from './cerebras';

// ====== Type Definitions ======

export interface PeriodSummary {
  total: number;
  count: number;
  avgPerItem: number;
  byCategory: Record<string, number>;
  byStore: Record<string, { total: number; count: number }>;
  dailyTotals: Record<string, number>;
}

export interface MonthlySummary {
  month: string;
  label: string;
  total: number;
  count: number;
}

export interface BestPrice {
  name: string;
  store: string;
  price: number;
  lastDate?: string;
}

export interface PredictionResult {
  predictedNextMonth: number;
  advice: string;
  riskCategory: string;
}

// ====== دوال مساعدة ======

function getArabicMonth(monthIndex: number, year: number): string {
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ];
  return `${months[monthIndex]} ${year}`;
}

function calculateAmount(purchase: Partial<Purchase>): number {
  const price = Number(purchase?.price) || 0;
  const quantity = Number(purchase?.quantity) || 1;
  if (price <= 0 || quantity <= 0) return 0;
  return price * quantity;
}

// ====== العمليات الرئيسية ======

export const getPeriodSummary = (purchases: Purchase[], startDate: string, endDate: string): PeriodSummary => {
  const emptyResult: PeriodSummary = {
    total: 0, count: 0, avgPerItem: 0,
    byCategory: {}, byStore: {}, dailyTotals: {},
  };

  if (!purchases?.length || !startDate || !endDate) return emptyResult;

  const filtered = purchases.filter(p => p.date && p.date >= startDate && p.date <= endDate);

  const result = filtered.reduce((acc, p) => {
    const amount = calculateAmount(p);
    if (amount <= 0) return acc;

    acc.total += amount;
    acc.count += 1;

    const cat = p.category || 'أخرى';
    acc.byCategory[cat] = (acc.byCategory[cat] || 0) + amount;

    const store = p.store || 'غير معروف';
    if (!acc.byStore[store]) acc.byStore[store] = { total: 0, count: 0 };
    acc.byStore[store].total += amount;
    acc.byStore[store].count += 1;

    acc.dailyTotals[p.date] = (acc.dailyTotals[p.date] || 0) + amount;

    return acc;
  }, {
    total: 0,
    count: 0,
    byCategory: {} as Record<string, number>,
    byStore: {} as Record<string, { total: number; count: number }>,
    dailyTotals: {} as Record<string, number>,
  });

  return {
    ...result,
    avgPerItem: result.count > 0 ? result.total / result.count : 0,
  };
};

export const getMonthlySummary = (purchases: Purchase[], months = 6): MonthlySummary[] => {
  if (!purchases?.length) return [];

  const now = new Date();
  const summaries: MonthlySummary[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const monthPurchases = purchases.filter(p => p.date && p.date.startsWith(monthKey));
    const total = monthPurchases.reduce((sum, p) => sum + calculateAmount(p), 0);

    summaries.push({
      month: monthKey,
      label: getArabicMonth(d.getMonth(), d.getFullYear()),
      total: parseFloat(total.toFixed(2)),
      count: monthPurchases.length,
    });
  }

  return summaries;
};

export const getBestPrices = (purchases: Purchase[]): BestPrice[] => {
  if (!purchases?.length) return [];

  const productPrices: Record<string, BestPrice> = {};

  purchases.forEach(p => {
    // 🛡️ حماية من الأسماء الفارغة (Crash Prevention)
    const rawName = p.name || 'صنف غير معروف';
    const key = rawName.trim().toLowerCase();
    
    const price = Number(p.price);
    if (price <= 0) return;

    if (!productPrices[key] || price < productPrices[key].price) {
      productPrices[key] = {
        name: rawName,
        store: p.store || 'غير معروف',
        price,
        lastDate: p.date,
      };
    }
  });

  return Object.values(productPrices)
    .sort((a, b) => a.price - b.price)
    .slice(0, 10); // عرض أفضل 10 أسعار
};

export const predictNextMonth = async (purchases: Purchase[]): Promise<PredictionResult> => {
  const fallback = {
    predictedNextMonth: 0,
    advice: 'ابدأ بتسجيل مصروفاتك للحصول على توقعات دقيقة',
    riskCategory: 'أخرى',
  };

  if (!purchases?.length) return fallback;

  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return fallback;

    const apiKey = await getCerebrasKey(uid);
    if (!apiKey) return fallback;

    // حساب بعض الإحصائيات السريعة لتغذية الذكاء الاصطناعي
    const total = purchases.reduce((s, p) => s + calculateAmount(p), 0);
    const avg = total / Math.max(1, purchases.length);

    // Prompt ذكي يحاكي نظام الفواتير لكن بطلب نصيحة
    const prompt = `حلل بيانات المصروفات: إجمالي ${total.toFixed(2)}، متوسط ${avg.toFixed(2)}. توقع مصروف الشهر القادم وقدم نصيحة توفير بالليبي الدارج. أعد JSON: {"predictedNextMonth": number, "advice": "...", "riskCategory": "..."}`;

    const result = await analyzeExpenseText(apiKey, prompt);
    
    if (result && result.length > 0) {
      return {
        // الاستفادة من الـ hack بذكاء
        predictedNextMonth: Number(result[0].amount) || Math.round(avg * 30),
        advice: result[0].description || 'حاول تقليل المصروفات غير الضرورية',
        riskCategory: result[0].category || 'أخرى',
      };
    }
  } catch (error) {
    console.error("Prediction Error:", error);
  }

  // في حال فشل الذكاء الاصطناعي، نعطي توقع رياضي منطقي كخطة بديلة
  const total = purchases.reduce((s, p) => s + calculateAmount(p), 0);
  const avg = total / Math.max(1, purchases.length);
  
  return {
    predictedNextMonth: Math.round(avg * 30),
    advice: 'نصيحة رياضية: حافظ على متوسط صرفك الحالي باش ما تتجاوزش ميزانيتك.',
    riskCategory: 'عام',
  };
};

/**
 * 🌟 التحليل المالي العميق (الميزة الجديدة)
 * تقوم بتحليل مسار الصرف بناءً على المشتريات وتعطي نصيحة استراتيجية
 */
export const analyzeFinancialTrendWithAI = async (purchases: Purchase[]): Promise<any> => {
  const fallback = {
    trend: 'stable',
    analysis: 'مافيش بيانات كافية للتحليل توا.',
    advice: 'استمر في تسجيل مشترياتك باش نقدروا نقروا مسارك المالي.'
  };

  if (!purchases || purchases.length === 0) return fallback;

  // حسبة سريعة لإجمالي المصروفات لتقديمها للذكاء الاصطناعي
  const totalSpent = purchases.reduce((sum, p) => sum + (Number(p.price) * Number(p.quantity) || 0), 0);
  const avgTransaction = totalSpent / purchases.length;

  try {
    const systemPrompt = `أنت مستشار مالي ليبي خبير في إدارة ميزانيات الأفراد.
    يجب أن ترجع ردك بصيغة JSON كائن (Object) فقط يحتوي على الحقول التالية:
    {
      "trend": "up" | "down" | "stable", // up يعني الصرف زاد، down يعني قل
      "analysis": "تحليل للوضع المالي بلهجة ليبية",
      "advice": "نصيحة مالية قوية وعملية"
    }`;

    const userPrompt = `إجمالي المصروفات المسجلة: ${totalSpent.toFixed(2)} دينار، في ${purchases.length} عملية شراء. بمتوسط ${avgTransaction.toFixed(2)} للعملية. حلل المسار المالي وأعطني الخلاصة.`;

    // استيراد ديناميكي لمنع تداخل الملفات (Circular Dependency)
    const { aiManager } = await import('./aiServiceManager');
    const result = await aiManager.askGenericText(systemPrompt, userPrompt);

    if (result && result.trend) {
      return result;
    }
  } catch (error) {
    console.warn("Financial trend analysis failed, using fallback.", error);
  }

  return fallback;
};