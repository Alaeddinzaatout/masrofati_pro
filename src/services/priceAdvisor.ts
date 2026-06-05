import { auth } from '../firebase/config';
import { Purchase, StorePrice, StrategicPlan } from '../types';
import { getUserApiKey } from './gemini'; // 🌟 استدعاء مفتاح الذكاء الاصطناعي الحقيقي
import { logError } from './logger';
import {
  getPriceHistory as getPriceHistoryFromDB,
  getStoresForProduct as getStoresForProductFromDB
} from './priceHistory';

export interface PriceComparison {
  trend: 'up' | 'down' | 'rising' | 'falling' | 'stable';
  advice: string;
  predictedPrice?: number;
  alert: boolean;
  bestDeal: StorePrice | null;
}

// ====== 🧠 المساعد الذكي الخفي (The AI Brain) ======
// هذه الدالة تتصل بـ Gemini لاستخراج نصائح حقيقية مبنية على البيانات
async function askOracleAI(prompt: string, fallbackData: any): Promise<any> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return fallbackData;
    
    const apiKey = await getUserApiKey(uid);
    if (!apiKey) return fallbackData;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey.trim()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            responseMimeType: 'application/json', 
            temperature: 0.4 // حرارة منخفضة لضمان دقة النصيحة
          }
        })
      }
    );

    if (!response.ok) return fallbackData;

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) return fallbackData;

    const cleaned = text.trim().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    logError('priceAdvisor', error, { context: 'askOracleAI' });
    return fallbackData; // 🛡️ شبكة أمان: لو فصل النت، يرجع للحسبة الرياضية
  }
}

// ====== العمليات الرئيسية ======

/**
 * 🌟 تحليل ذكي حقيقي لاتجاه السعر
 */
export const analyzePriceTrend = async (productName: string, priceHistory: Purchase[]): Promise<any> => {
  if (!productName || priceHistory.length < 2) return null;

  try {
    const prices = priceHistory.map(h => h.price).filter(p => p > 0);
    if (prices.length < 2) return null; 

    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const latest = prices[0];
    const previous = prices[1];
    const changePercent = ((latest - previous) / previous) * 100;
    
    // 1. الحسبة الرياضية الأساسية (Fallback)
    let mathTrend: 'rising' | 'falling' | 'stable' = 'stable';
    if (changePercent > 5) mathTrend = 'rising';
    else if (changePercent < -5) mathTrend = 'falling';
    
    const mathFallback = {
      trend: mathTrend,
      advice: mathTrend === 'rising' ? 'السعر يرتفع، خذ حذرك.' : mathTrend === 'falling' ? 'السعر ينزل، فرصة ممتازة!' : 'السعر مستقر.',
      predictedPrice: latest * (1 + (changePercent / 100))
    };

    // 2. 🧠 طلب تحليل الخبير الاقتصادي (Gemini)
    const prompt = `أنت خبير اقتصادي ليبي. المستخدم يراقب سعر "${productName}".
    سجل الأسعار السابقة (من الأحدث للأقدم): ${prices.slice(0, 5).join('، ')} دينار.
    متوسط السعر: ${avg.toFixed(2)}. نسبة التغير: ${changePercent.toFixed(1)}%.
    المطلوب:
    1. استنتج الاتجاه (rising, falling, stable).
    2. أعطني توقعاً دقيقاً للسعر القادم (رقم فقط).
    3. قدم نصيحة شراء بلهجة ليبية دارجة وذكية (جملة واحدة).
    أرجع JSON فقط: {"trend": "...", "advice": "...", "predictedPrice": رقم}`;

    const aiResult = await askOracleAI(prompt, mathFallback);

    return {
      trend: aiResult.trend || mathTrend,
      advice: aiResult.advice || mathFallback.advice,
      changePercent: parseFloat(changePercent.toFixed(1)),
      averagePrice: parseFloat(avg.toFixed(2)),
      predictedPrice: parseFloat((aiResult.predictedPrice || mathFallback.predictedPrice).toFixed(2))
    };
  } catch (error) {
    logError('priceAdvisor', error, { context: 'analyzePriceTrend', productName });
    return null;
  }
};

/**
 * مقارنة السعر الآني
 */
export const comparePrices = async (productName: string, currentPrice: number, currentStore: string): Promise<PriceComparison> => {
  const uid = auth.currentUser?.uid;
  const result: PriceComparison = {
    trend: 'stable',
    advice: 'لا توجد بيانات كافية للمقارنة حالياً.',
    alert: false,
    bestDeal: null,
  };

  if (!uid || !productName) return result;

  try {
    const history = await getPriceHistoryFromDB(uid, productName, 10);
    if (history.length > 0) {
      const prices = history.map(h => h.price);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      
      if (currentPrice > avg * 1.15) {
        result.alert = true;
        result.advice = `⚠️ السعر أغلى من المعتاد بـ ${((currentPrice - avg) / avg * 100).toFixed(0)}%.`;
      }
    }

    const stores = await getStoresForProductFromDB(uid, productName);
    const otherStores = stores.filter(s => s.store !== currentStore);
    
    if (otherStores.length > 0) {
      const best = otherStores.sort((a, b) => a.unitPrice - b.unitPrice)[0];
      if (best && best.unitPrice < currentPrice) {
        result.bestDeal = best;
        result.advice += ` 🏆 تقدر توفر وتاخذه من ${best.store} بـ ${best.unitPrice} د.ل`;
      }
    }

    return result;
  } catch (error) {
    return result;
  }
};

export const priceAdvisor = async (purchase: Purchase): Promise<PriceComparison> => {
  return await comparePrices(purchase.name, purchase.price, purchase.store);
};

/**
 * 🌟 الخطة الاستراتيجية المدعومة بالذكاء الاصطناعي (True Oracle Plan)
 */
export const generateStrategicShoppingPlan = async (shoppingList: Array<{name: string, quantity: number}>): Promise<StrategicPlan | null> => {
  try {
    if (!Array.isArray(shoppingList) || shoppingList.length === 0) return null;
    const uid = auth.currentUser?.uid;
    if (!uid) return null;

    const planResults: any[] = [];
    const allStores = new Set<string>();

    // 1. تجميع البيانات الدقيقة من قاعدة البيانات
    await Promise.all(shoppingList.map(async (item) => {
      const stores = await getStoresForProductFromDB(uid, item.name);
      if (stores && stores.length > 0) {
        planResults.push({
          productName: item.name,
          quantity: item.quantity || 1,
          prices: stores,
        });
        stores.forEach(s => allStores.add(s.store));
      }
    }));

    if (planResults.length === 0 || allStores.size === 0) return null;

    // 2. الحسابات الرياضية الصارمة (لضمان دقة الفاتورة)
    const storeTotals: Record<string, { total: number, missingCount: number }> = {};
    allStores.forEach(store => {
      let total = 0;
      let missingCount = 0;
      planResults.forEach(item => {
        const storePrice = item.prices.find((p: any) => p.store === store);
        if (storePrice) {
          total += storePrice.unitPrice * item.quantity;
        } else {
          missingCount++;
          const avg = item.prices.reduce((s: number, p: any) => s + p.unitPrice, 0) / item.prices.length;
          total += avg * item.quantity;
        }
      });
      storeTotals[store] = { total: parseFloat(total.toFixed(2)), missingCount };
    });

    const sortedStoreTotals = Object.entries(storeTotals).sort((a, b) => a[1].total - b[1].total);
    const singleStoreBest = sortedStoreTotals[0];
    if (!singleStoreBest) return null;

    const optimizedSplit: any[] = [];
    let splitTotal = 0;
    planResults.forEach(item => {
      const bestPrice = [...item.prices].sort((a, b) => a.unitPrice - b.unitPrice)[0];
      if (!bestPrice) return;
      optimizedSplit.push({
        productName: item.productName,
        bestStore: bestPrice.store,
        price: bestPrice.unitPrice,
        total: parseFloat((bestPrice.unitPrice * item.quantity).toFixed(2)),
      });
      splitTotal += bestPrice.unitPrice * item.quantity;
    });

    const potentialSavings = parseFloat((singleStoreBest[1].total - splitTotal).toFixed(2));

    // 3. 🧠 دمج الذكاء الاصطناعي لكتابة "خلاصة الخطة"
    const aiPrompt = `أنت مستشار تسوق ليبي حكيم.
    البيانات: إذا اشترى المستخدم من محل واحد (${singleStoreBest[0]}) سيدفع ${singleStoreBest[1].total} دينار.
    وإذا قسم مشترياته على عدة محلات ليتصيد أرخص الأسعار، سيوفر ${potentialSavings} دينار.
    المطلوب: اكتب نصيحة (فقرة قصيرة بلهجة ليبية) تنصحه فيها: هل التوفير يستحق تعب التنقل بين المحلات وصرف البنزين؟ أم الأفضل الشراء من محل واحد؟
    أرجع JSON فقط: {"strategicAdvice": "..."}`;

    const fallbackAdvice = potentialSavings > 15 
      ? `التوفير ممتاز (${potentialSavings} د.ل)! يستاهل تقسم مشترياتك بين المحلات.` 
      : `الفرق بسيط (${potentialSavings} د.ل)، خوذ من ${singleStoreBest[0]} وريح راسك من المشاوير.`;

    const aiResult = await askOracleAI(aiPrompt, { strategicAdvice: fallbackAdvice });

    return {
      recommendedStore: {
        name: singleStoreBest[0],
        estimatedTotal: singleStoreBest[1].total,
        missingItems: singleStoreBest[1].missingCount
      },
      optimizedSplit: {
        total: parseFloat(splitTotal.toFixed(2)),
        potentialSavings: potentialSavings,
        items: optimizedSplit
      },
      allStoresComparison: sortedStoreTotals.map(([name, data]) => ({ name, ...data })),
      aiStrategicSummary: aiResult.strategicAdvice // 🌟 الخلاصة الذكية التي ستعرض في الواجهة
    };
  } catch (error) {
    logError('priceAdvisor', error, { context: 'generateStrategicShoppingPlan' });
    return null;
  }
};