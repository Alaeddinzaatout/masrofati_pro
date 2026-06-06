import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { ConsumptionAnalysis, Purchase } from '../types';
import { getUserApiKey } from './gemini';
import { logError } from './logger';
import { normalizeProductName, correctSpelling } from './priceHistory';

// ====== 🧠 المساعد الذكي الخفي (The Inventory Oracle) ======
async function askInventoryOracle(prompt: string): Promise<any> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;
    
    const apiKey = await getUserApiKey(uid);
    if (!apiKey) return null;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey.trim()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            responseMimeType: 'application/json', 
            temperature: 0.5
          }
        })
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) return null;

    const cleaned = text.trim().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    logError('inventoryPredictor', error, { context: 'askInventoryOracle' });
    return null; 
  }
}

// ====== 🏠 قائمة الأساسيات (The Staples List) ======
// الأصناف اللي ما يقدروش يستغنوا عليها الليبيين
const STAPLES_DICTIONARY: Record<string, { rank: number, category: string }> = {
  'حليب': { rank: 10, category: 'ألبان' },
  'خبز': { rank: 10, category: 'مخبوزات' },
  'بيض': { rank: 9, category: 'بروتين' },
  'زيت': { rank: 8, category: 'أساسيات' },
  'طماطم': { rank: 8, category: 'خضروات' },
  'بصل': { rank: 8, category: 'خضروات' },
  'بطاطس': { rank: 8, category: 'خضروات' },
  'سكر': { rank: 7, category: 'أساسيات' },
  'أرز': { rank: 7, category: 'أساسيات' },
  'مكرونة': { rank: 7, category: 'أساسيات' },
  'ماء': { rank: 9, category: 'مشروبات' },
  'شاي': { rank: 8, category: 'منبهات' },
  'قهوة': { rank: 8, category: 'منبهات' },
  'حفاضات': { rank: 10, category: 'أطفال' },
};

/**
 * تحليل معدل استهلاك صنف معين (النسخة الموحدة مع قاعدة البيانات - Single Source of Truth)
 */
export const analyzeConsumption = async (purchases: Purchase[], productName: string): Promise<ConsumptionAnalysis> => {
  const fallback = { exists: false } as ConsumptionAnalysis;
  if (!productName) return fallback;

  const uid = auth.currentUser?.uid;
  if (!uid) return fallback;

  try {
    const normalized = normalizeProductName(correctSpelling(productName));
    const q = query(
      collection(db, 'consumptionTrack'),
      where('userId', '==', uid),
      where('normalizedName', '==', normalized)
    );
    const snap = await getDocs(q);
    
    // 💡 ذكاء إضافي: لو مش موجود في التتبع، نفحصه في القاموس
    const stapleInfo = STAPLES_DICTIONARY[normalized] || STAPLES_DICTIONARY[productName];
    const isKnownStaple = !!stapleInfo;

    if (snap.empty) {
      if (isKnownStaple) {
        // حتى لو ماعنداش سجل، نعتبروه موجود بأقل الإمكانيات
        return {
          exists: true,
          productName,
          currentStock: 0,
          avgDailyRate: 0.2,
          confidenceScore: 0.5,
          isRunningLow: true,
          isCritical: true,
          daysUntilRunOut: 0,
          isStaple: true,
          stapleRank: stapleInfo.rank
        } as any;
      }
      return fallback;
    }

    const data = snap.docs[0].data();
    const daysUntilRunOut = data.daysUntilRunOut || 0;
    
    // 🧠 حساب الحرج بناءً على نوع الصنف
    const criticalThreshold = isKnownStaple ? 4 : 2; // الأساسيات تنبهك قبل 4 أيام
    const lowThreshold = isKnownStaple ? 8 : 4;

    const isCritical = daysUntilRunOut <= criticalThreshold || data.currentStock <= 0.1;
    const isRunningLow = daysUntilRunOut <= lowThreshold || data.currentStock <= 0.3;

    return {
      exists: true,
      productName: data.productName || productName,
      currentStock: data.currentStock,
      lastQuantity: 0, 
      avgDailyRate: data.dailyConsumptionRate || 0,
      confidenceScore: 1.0, 
      isRunningLow,
      isCritical,
      daysSinceLastPurchase: data.lastPurchaseDate ? Math.floor((Date.now() - new Date(data.lastPurchaseDate).getTime()) / 86400000) : 0,
      daysUntilRunOut,
      lastPurchaseDate: data.lastPurchaseDate || '',
      seasonalMultiplier: 1,
      isStaple: isKnownStaple,
      stapleRank: stapleInfo?.rank || 0
    } as any;
  } catch (error) {
    logError('inventoryPredictor', error, { context: 'analyzeConsumption' });
    return fallback;
  }
};

export const getLowStockItems = async (purchases?: Purchase[]): Promise<ConsumptionAnalysis[]> => {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  
  try {
    const q = query(collection(db, 'consumptionTrack'), where('userId', '==', uid));
    const snap = await getDocs(q);
    const lowStockItems: ConsumptionAnalysis[] = [];
    
    snap.forEach(doc => {
      const data = doc.data();
      const daysUntilRunOut = data.daysUntilRunOut || 0;
      const isCritical = daysUntilRunOut <= 3 || data.currentStock <= 0.1;
      const isRunningLow = daysUntilRunOut <= 7 || data.currentStock <= 0.3;
      
      if (isRunningLow || isCritical) {
        lowStockItems.push({
          exists: true,
          productName: data.productName,
          currentStock: data.currentStock,
          lastQuantity: 0,
          avgDailyRate: data.dailyConsumptionRate || 0,
          confidenceScore: 1.0,
          isRunningLow,
          isCritical,
          daysSinceLastPurchase: data.lastPurchaseDate ? Math.floor((Date.now() - new Date(data.lastPurchaseDate).getTime()) / 86400000) : 0,
          daysUntilRunOut,
          lastPurchaseDate: data.lastPurchaseDate || '',
          seasonalMultiplier: 1,
        });
      }
    });
    return lowStockItems.sort((a, b) => a.daysUntilRunOut - b.daysUntilRunOut);
  } catch (error) {
    logError('inventoryPredictor', error, { context: 'getLowStockItems' });
    return [];
  }
};

/**
 * 🌟 توقع النواقص بالذكاء الهجين (Hybrid AI)
 */
export const predictShortages = async (purchases?: Purchase[]): Promise<any[]> => {
  const lowStockItems = await getLowStockItems(purchases);
  if (lowStockItems.length === 0) return [];

  // 1. حساب التواريخ رياضياً (الأساس المتين)
  const mathResults = lowStockItems.slice(0, 10).map(item => {
    const predictedDate = new Date();
    predictedDate.setDate(predictedDate.getDate() + item.daysUntilRunOut);
    return {
      ...item,
      predictedShortageDate: item.daysUntilRunOut > 0 ? predictedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      advice: item.isCritical ? `⚠️ ضروري تشري ${item.productName} اليوم!` : `💡 دير حسابك تشري ${item.productName} خلال ${item.daysUntilRunOut} أيام.`,
    };
  });

  // 2. 🧠 إضافة لمسة الخبير الليبي (الذكاء الاصطناعي)
  try {
    const itemsSummary = lowStockItems.slice(0, 10).map(item =>
      `- ${item.productName}: يكفي لمدة ${item.daysUntilRunOut} أيام (الاستهلاك ${item.avgDailyRate}/يوم، حرج: ${item.isCritical ? 'نعم' : 'لا'})`
    ).join('\n');

    const prompt = `أنت خبير ليبي في تدبير شؤون الحوش والمقاضي.
    هذه قائمة بالنواقص في حوش المستخدم بناءً على حسابات دقيقة:
    ${itemsSummary}
    
    المطلوب:
    أعطني نصيحة مخصصة لكل صنف بلهجة ليبية دارجة، ودودة ومفيدة. (مثلاً: يا غالي الطماطم بيكمل عليك بعد يومين، دير حسابك تشري حكة وأنت مروح).
    
    أرجع الرد بصيغة JSON array فقط، كل عنصر يحتوي:
    {"productName": "اسم الصنف", "advice": "النصيحة الليبية"}`;

    const aiAdviceList = await askInventoryOracle(prompt);

    if (aiAdviceList && Array.isArray(aiAdviceList)) {
      // دمج نصائح الذكاء الاصطناعي مع الحسابات الرياضية الدقيقة
      return mathResults.map(mathItem => {
        const aiMatch = aiAdviceList.find((ai: any) => ai.productName === mathItem.productName);
        if (aiMatch && aiMatch.advice) {
          return { ...mathItem, advice: aiMatch.advice };
        }
        return mathItem;
      });
    }
  } catch (error) {
    // 🛡️ لو فصل النت، التطبيق يكمل يخدم بالحسابات الرياضية بدون أي توقف
    console.warn("AI failed to predict shortages, falling back to math.", error);
  }

  return mathResults;
};
