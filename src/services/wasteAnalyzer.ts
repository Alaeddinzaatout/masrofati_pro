import { auth } from '../firebase/config';
import { Purchase } from '../types';
import { normalizeName } from '../utils/normalizer';
import { aiManager } from './aiServiceManager';
import { getDeepSeekKey } from './cerebras';
import { logError } from './logger';

const USER_CLASSIFICATIONS_KEY = 'user_classifications_v3';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 يومًا

// ====== القواميس الثابتة ======
const essentialCategories = new Set([
    'غذائي', 'خضروات وفواكه', 'لحوم', 'مشروبات', 'أدوية',
    'منظفات', 'فواتير', 'مواصلات', 'تعليم',
]);

const essentialKeywords = new Set([
    'خبز', 'حليب', 'بيض', 'جبن', 'زيت', 'سكر', 'أرز', 'مكرونة',
    'دقيق', 'عدس', 'حمص', 'فول', 'طماطم', 'بصل', 'بطاطس',
    'دجاج', 'لحم', 'سمك', 'خيار', 'خس', 'بقدونس', 'موز', 'تفاح',
    'صابون', 'شامبو', 'منظف', 'دواء', 'علاج', 'كهرباء', 'ماء', 'غاز',
    'بنزين', 'مواصلات', 'أجرة', 'مدرسة', 'جامعة', 'كتب',
]);

const luxuryKeywords = new Set([
    'شوكولاتة', 'حلويات', 'بسكويت', 'كيك', 'عصير', 'غازي',
    'مشروبات غازية', 'بيبسي', 'كوكاكولا', 'شيبس', 'مقرمشات',
    'آيس كريم', 'بوظة', 'كابتشينو', 'قهوة مختصة', 'مكسرات',
    'كماليات', 'هدية', 'ديكور', 'اكسسوارات', 'ألعاب', 'ترفيه',
    'سجائر', 'دخان', 'معسل',
]);

// ====== دوال التخصيص (التعلم الذاتي عبر الكاش المركزي) ======

async function loadUserClassifications(): Promise<Map<string, string>> {
    try {
        // 👈 التعديل الأول: سحب البيانات من الخزنة المركزية بدلاً من AsyncStorage
        const data = await aiManager.getGlobalCache(USER_CLASSIFICATIONS_KEY);
        if (!data) return new Map();
        return new Map(Object.entries(data));
    } catch {
        return new Map();
    }
}

async function saveUserClassifications(map: Map<string, string>): Promise<void> {
    try {
        const obj = Object.fromEntries(map);
        // 👈 التعديل الثاني: الحفظ في الخزنة المركزية مع تحديد وقت الصلاحية (30 يوم)
        await aiManager.setGlobalCache(USER_CLASSIFICATIONS_KEY, obj, CACHE_TTL_MS);
    } catch (error) {
        logError('wasteAnalyzer', error, { context: 'saveUserClassifications' });
    }
}

export const setUserClassification = async (productName: string, classification: 'essential' | 'luxury' | 'uncategorized'): Promise<void> => {
    const normalized = normalizeName(productName);
    const map = await loadUserClassifications();
    map.set(normalized, classification);
    await saveUserClassifications(map);
};

export const getUserClassification = async (productName: string): Promise<string | null> => {
    const normalized = normalizeName(productName);
    const map = await loadUserClassifications();
    return map.get(normalized) || null;
};

const classificationCache = new Map<string, string>();

// ====== العمليات الرئيسية ======

export const classifyPurchase = async (purchase: Partial<Purchase>): Promise<'essential' | 'luxury' | 'uncategorized'> => {
    if (!purchase?.name) return 'uncategorized';

    const name = purchase.name.trim().toLowerCase();
    const category = (purchase.category || '').toLowerCase();

    if (classificationCache.has(name)) return classificationCache.get(name) as any;

    // 1. فحص تصنيف المستخدم (لو المستخدم عدله بيده، التطبيق يتعلم)
    const userClassification = await getUserClassification(name);
    if (userClassification) {
        classificationCache.set(name, userClassification);
        return userClassification as any;
    }

    // 2. فحص القواميس الثابتة
    if (essentialCategories.has(category)) {
        classificationCache.set(name, 'essential');
        return 'essential';
    }

    for (const keyword of luxuryKeywords) {
        if (name.includes(keyword)) {
            classificationCache.set(name, 'luxury');
            return 'luxury';
        }
    }

    for (const keyword of essentialKeywords) {
        if (name.includes(keyword)) {
            classificationCache.set(name, 'essential');
            return 'essential';
        }
    }

    // 3. القرار الافتراضي: بدل ما نظلموه كـ "كمالي" أو نحرقوا رصيد الـ API في كل صنف، نعتبروه "غير مصنف"
    // سيتم إحصاء هذه الأصناف وإبلاغ المستخدم لمراجعتها يدوياً.
    classificationCache.set(name, 'uncategorized');
    return 'uncategorized';
};

export const analyzeWaste = async (purchases: Purchase[]): Promise<any> => {
    if (!purchases?.length) {
        return {
            totalSpent: 0, essentialSpent: 0, luxurySpent: 0, uncategorizedSpent: 0,
            wastePercent: 0, essentialPercent: 0, luxuryPercent: 0, uncategorizedPercent: 0,
            wasteBreakdown: [], advice: 'ابدأ بتسجيل مشترياتك! 💪',
        };
    }

    const classified = await Promise.all(
        purchases.map(async (p) => {
            const amount = p.price || 0; // الحسبة الصافية المضمونة
            const type = await classifyPurchase(p);
            return { ...p, amount, type };
        })
    );

    let totalSpent = 0, essentialSpent = 0, luxurySpent = 0, uncategorizedSpent = 0;
    const luxuryItems: any[] = [];

    classified.forEach(p => {
        totalSpent += p.amount;
        if (p.type === 'essential') essentialSpent += p.amount;
        else if (p.type === 'luxury') {
            luxurySpent += p.amount;
            luxuryItems.push(p);
        } else {
            uncategorizedSpent += p.amount;
        }
    });

    const wastePercent = totalSpent > 0 ? (luxurySpent / totalSpent) * 100 : 0;
    const essentialPercent = totalSpent > 0 ? (essentialSpent / totalSpent) * 100 : 0;
    const uncategorizedPercent = totalSpent > 0 ? (uncategorizedSpent / totalSpent) * 100 : 0;

    const wasteBreakdown = luxuryItems
        .map(item => ({
            name: item.name,
            lostValue: item.amount,
            percentage: parseFloat(((item.amount / (luxurySpent || 1)) * 100).toFixed(1)),
        }))
        .sort((a, b) => b.lostValue - a.lostValue)
        .slice(0, 10);

    // 👈 نصائح ديناميكية تعتمد على التصنيف المجهول
    let advice = '';
    if (uncategorizedPercent > 20) {
        advice = 'عندك مصاريف غير مصنفة واجد، راجعها باش الحسبة تزبط! 🔍';
    } else {
        advice = wastePercent <= 15 ? 'ممتاز يا بطل! 🏆' : wastePercent <= 30 ? 'نسبة مقبولة. 💡' : 'حاول تقليل الكماليات. 🧐';
    }

    return {
        totalSpent, essentialSpent, luxurySpent, uncategorizedSpent,
        wastePercent: parseFloat(wastePercent.toFixed(1)),
        essentialPercent: parseFloat(essentialPercent.toFixed(1)),
        luxuryPercent: parseFloat((100 - essentialPercent - uncategorizedPercent).toFixed(1)),
        uncategorizedPercent: parseFloat(uncategorizedPercent.toFixed(1)),
        wasteBreakdown,
        advice,
    };
};

export const analyzeWasteWithAI = async (purchases: Purchase[]): Promise<any> => {
    try {
        const basic = await analyzeWaste(purchases);
        if (!purchases?.length) return basic;

        try {
            const uid = auth.currentUser?.uid;
            if (uid) {
                const apiKey = await getDeepSeekKey(uid);
                if (apiKey) {
                    const topWaste = basic.wasteBreakdown.slice(0, 3).map((item: any) => `${item.name}: ${item.lostValue.toFixed(0)} د.ل`).join('، ');
                    
                    const systemPrompt = `أنت مستشار مالي ليبي قاسي جداً وصريح بطريقة مضحكة (Financial Roaster).
مهمتك توبيخ المستخدم بلهجة ليبية دارجة قوية ومضحكة على مصاريفه الكمالية (الهدر).
يجب أن ترجع ردك بصيغة JSON كائن (Object) فقط يحتوي على الحقول التالية:
{
  "roast": "توبيخ قاسي ومضحك بالليبي الدارج يذكر فيه أمثلة من مصاريفه، مثلاً: يا غالي فلوسك ضاعت في...",
  "substituteTip": "نصيحة عبقرية لبديل يوفر له هذه الأموال"
}`;
                    const userPrompt = `إجمالي المصروفات: ${basic.totalSpent.toFixed(0)} د.ل. الهدر في الكماليات: ${basic.wastePercent}%. أشياء مجهولة غير مصنفة: ${basic.uncategorizedPercent}%. أكثر أشياء ضيع فيها فلوسه: ${topWaste || 'لا توجد بيانات'}. هزبه واعطيه نصيحة.`;
                    
                    const result = await aiManager.askGenericText(systemPrompt, userPrompt);
                    if (result) {
                        return { 
                          ...basic, 
                          roast: result.roast, 
                          substituteTip: result.substituteTip,
                          aiEnhanced: true 
                        };
                    }
                }
            }
        } catch (e) {
            logError('wasteAnalyzer', e, { context: 'analyzeWasteWithAI_aiCall' });
        }
        return basic;
    } catch (e) {
        logError('wasteAnalyzer', e, { context: 'analyzeWasteWithAI' });
        return {
            totalSpent: 0, essentialSpent: 0, luxurySpent: 0, uncategorizedSpent: 0,
            wastePercent: 0, essentialPercent: 0, luxuryPercent: 0, uncategorizedPercent: 0,
            wasteBreakdown: [], advice: 'تعذر إجراء التحليل. حاول مرة أخرى لاحقاً.',
        };
    }
};