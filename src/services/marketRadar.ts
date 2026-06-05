import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { normalizeName } from '../utils/normalizer';
import { aiManager } from './aiServiceManager';
import { logError } from './logger';

export interface GlobalPrice {
  id?: string;
  productName: string;
  originalName: string;
  category: string;
  price: number;
  unitPrice: number;
  store: string;
  date: string;
  timestamp: number;
  isVerified?: boolean;
  location?: {
    lat: number;
    lon: number;
  } | null;
}

export interface RadarResult {
  productName: string;
  globalAverage: number;
  bestDeal: GlobalPrice | null;
  recentPrices: GlobalPrice[];
  confidence: number;
  aiAnalysis?: string;
}

/**
 * جلب الأسعار من الرادار المجتمعي لصنف معين (مع دعم البحث الذكي)
 */
export const searchGlobalMarket = async (productName: string): Promise<RadarResult | null> => {
  if (!productName) return null;
  const normalized = normalizeName(productName);
  
  // 💡 نأخذ الكلمة الأولى للبحث الذكي (مثلاً: لو كتب "عصير تفاح" يبحث عن "عصير")
  const searchWord = normalized.split(' ')[0];
  if (!searchWord) return null;

  try {
    // 🔍 1. البحث باستخدام البادئة (Prefix Search): يغطي كل الفواتير القديمة والجديدة التي تبدأ بالكلمة
    const qPrefix = query(
      collection(db, 'global_prices'),
      where('productName', '>=', searchWord),
      where('productName', '<=', searchWord + '\uf8ff'),
      limit(50)
    );
    const prefixSnapshot = await getDocs(qPrefix);

    // 🔍 2. البحث الذكي باستخدام الكلمات المفتاحية (لو الكلمة في نص الاسم ومش في بدايته)
    const qSmart = query(
      collection(db, 'global_prices'),
      where('searchKeywords', 'array-contains', searchWord),
      limit(50)
    );
    const smartSnapshot = await getDocs(qSmart);

    if (smartSnapshot.empty && prefixSnapshot.empty) return null;

    // دمج النتائج بدون تكرار
    const pricesMap = new Map<string, GlobalPrice>();
    
    prefixSnapshot.forEach(doc => {
      pricesMap.set(doc.id, { id: doc.id, ...doc.data() } as GlobalPrice);
    });
    
    smartSnapshot.forEach(doc => {
      if (!pricesMap.has(doc.id)) {
        pricesMap.set(doc.id, { id: doc.id, ...doc.data() } as GlobalPrice);
      }
    });

    const prices = Array.from(pricesMap.values());

    // ترتيب النتائج حسب الأحدث في الذاكرة لتجنب أخطاء الفايربيس
    prices.sort((a, b) => b.timestamp - a.timestamp);

    // فلترة الأسعار المنطقية (تجنب القيم الشاذة جداً)
    const validPrices = prices.filter(p => p.unitPrice > 0);
    if (validPrices.length === 0) return null;

    // 💡 الذكاء الحقيقي: تجميع الأسعار حسب (المحل + اسم المنتج) باش نعرض كل الأنواع
    const storeProductMap = new Map<string, GlobalPrice>();
    validPrices.forEach(p => {
      const key = `${p.store}_${p.productName}`;
      const existing = storeProductMap.get(key);
      // إذا المحل والمنتج مش موجودين، أو السعر أحدث، نحفظه
      if (!existing || p.timestamp > existing.timestamp) {
        storeProductMap.set(key, p);
      }
    });

    const uniqueStorePrices = Array.from(storeProductMap.values());

    // حساب المتوسط الحقيقي للمجموعة
    const total = uniqueStorePrices.reduce((sum, p) => sum + p.unitPrice, 0);
    const average = total / uniqueStorePrices.length;

    // إيجاد أفضل سعر وتجهيز القائمة (ترتيب تصاعدي: الأرخص أولاً)
    const sortedByPrice = [...uniqueStorePrices].sort((a, b) => a.unitPrice - b.unitPrice);
    const bestDeal = sortedByPrice[0];

    // نسبة الثقة
    const confidence = Math.min((uniqueStorePrices.length / 5) * 100, 100);

    const result: RadarResult = {
      productName: normalized,
      globalAverage: parseFloat(average.toFixed(2)),
      bestDeal,
      recentPrices: sortedByPrice.slice(0, 20), // 💡 عرض أرخص 20 نتيجة لأنها قد تشمل منتجات مختلفة
      confidence: parseFloat(confidence.toFixed(0)),
    };

    // 🧠 تشغيل الذكاء الاصطناعي لاكتشاف التخفيضات القوية (Real Deals)
    if (bestDeal && bestDeal.unitPrice < average * 0.8) {
      try {
        const systemPrompt = `أنت محلل أسواق مالي ليبي في "مصروفاتي".
مهمتك إعطاء تنبيه حماسي وقصير جداً للمستخدم حول توفر سلعة بسعر مغري جداً مقارنة بالسوق.
أرجع الرد كـ JSON فقط: {"dealAlert": "نص التنبيه الحماسي..."}`;
        
        const userPrompt = `المنتج: ${bestDeal.originalName}. متوسط سعر السوق للأنواع المشابهة: ${average.toFixed(2)} د.ل. تم العثور عليه في ${bestDeal.store} بسعر ${bestDeal.unitPrice.toFixed(2)} د.ل! (أرخص بـ ${(((average - bestDeal.unitPrice)/average)*100).toFixed(0)}%).`;
        
        const aiResponse = await aiManager.askGenericText(systemPrompt, userPrompt);
        if (aiResponse && aiResponse.dealAlert) {
          result.aiAnalysis = aiResponse.dealAlert;
        }
      } catch (e) {
         // فشل الذكاء، نتجاهل بصمت
      }
    }

    return result;
  } catch (error) {
    logError('marketRadar', error, { context: 'searchGlobalMarket', productName });
    return null;
  }
};