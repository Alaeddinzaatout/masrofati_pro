import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase/config';
import { normalizeName } from '../utils/normalizer';
import { categorizeBatch, getUserApiKey } from './gemini';
import { logError } from './logger';

const CATEGORY_CACHE_KEY = 'smart-category-cache-v2';
const SUGGESTION_CACHE_KEY = 'smart-suggestion-cache-v2';
// const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 أيام (يمكن استخدامه مستقبلاً)

// ====== الأنماط المعتمدة للفئات ======
export type CategoryType = 
  | 'غذائي' 
  | 'منظفات' 
  | 'أدوية' 
  | 'مشروبات' 
  | 'لحوم' 
  | 'خضروات وفواكه' 
  | 'أدوات منزلية' 
  | 'مواصلات' 
  | 'فواتير' 
  | 'تعليم' 
  | 'ترفيه' 
  | 'أخرى';

const CATEGORY_KEYWORDS_MAP = new Map<string, CategoryType>();
const CATEGORY_DATA: Record<CategoryType, string[]> = {
    'خضروات وفواكه': [
        'طماطم', 'بندورة', 'خيار', 'بصل', 'بطاطس', 'بطاطا', 'جزر', 'فلفل',
        'خس', 'كرنب', 'قرنبيط', 'بروكلي', 'سبانخ', 'ملوخية', 'بامية',
        'كوسة', 'باذنجان', 'ثوم', 'ليمون', 'برتقال', 'تفاح', 'موز',
        'عنب', 'فراولة', 'بطيخ', 'شمام', 'مانجو', 'أناناس', 'خوخ',
        'مشمش', 'كرز', 'رمان', 'توت', 'أفوكادو', 'جريب فروت', 'يوسفي',
        'نعناع', 'بقدونس', 'كزبرة', 'شبت', 'جرجير', 'فجل',
    ],
    'لحوم': [
        'لحم', 'دجاج', 'فراخ', 'كفتة', 'برجر', 'سجق', 'مرتديلا',
        'لحمة', 'لحوم', 'غنم', 'عجل', 'بقر', 'جمل', 'ديك رومي',
        'كبد', 'قلب', 'مفروم', 'ستيك', 'شاورما', 'كباب',
    ],
    'مشروبات': [
        'مويه', 'مياه', 'عصير', 'بيبسي', 'كوكاكولا', 'كولا', 'فانتا',
        'سبرايت', 'ميرندا', 'شاي', 'قهوة', 'نسكافيه', 'حليب', 'لبن',
        'روب', 'زبادي', 'يوغورت', 'مشروب', 'غازي', 'سفن أب',
        'نسكويك', 'ميلو',
    ],
    'منظفات': [
        'صابون', 'كلوركس', 'منظف', 'ديتول', 'فيري', 'بريل', 'تايد',
        'أريال', 'بونكس', 'فلاش', 'كلور', 'معطر', 'ملمع', 'جافيل',
        'سائل', 'جلي', 'صابون سائل', 'مسحوق', 'مبيض', 'منعم',
        'إسفنجة', 'سفنج', 'قطن', 'مناديل', 'ورق', 'فوط',
    ],
    'أدوية': [
        'دواء', 'بانادول', 'بروفين', 'أسبيرين', 'فيتامين', 'مضاد',
        'مرهم', 'كريم', 'حبوب', 'شراب', 'قطرة', 'بخاخ', 'لصقة',
        'علاج', 'أدوية', 'صيدلية',
    ],
    'غذائي': [
        'خبز', 'خبزة', 'عيش', 'رز', 'أرز', 'مكرونة', 'شعيرية',
        'سكر', 'ملح', 'زيت', 'طحين', 'دقيق', 'سميد', 'كسكس',
        'عدس', 'حمص', 'فول', 'فاصوليا', 'بازلاء', 'لوبيا',
        'تونة', 'سردين', 'معلبات', 'صلصة', 'كاتشاب', 'مايونيز',
        'جبن', 'جبنة', 'زبدة', 'سمن', 'كريمة', 'حلاوة', 'عسل',
        'مربى', 'شوكولاتة', 'بسكويت', 'كيك', 'حلويات', 'شيبس',
        'بطاطس شيبس', 'مقرمشات', 'بذور', 'مكسرات', 'لوز', 'فستق',
        'جوز', 'كاجو', 'بندق', 'فول سوداني', 'زبيب', 'تمر',
        'بيض', 'خل', 'بهارات', 'كمون', 'فلفل أسود',
        'كركم', 'زعتر', 'ورق لوري', 'قرفة', 'فانيليا', 'بكينج',
        'خميرة', 'جيلاتين', 'نشا',
    ],
    'أدوات منزلية': [
        'صحن', 'كأس', 'كوب', 'ملعقة', 'شوكة', 'سكين', 'طبق',
        'قدر', 'مقلاة', 'طاسة', 'صينية', 'وعاء', 'زبالة', 'كيس',
        'شامبو', 'صابون استحمام', 'معجون أسنان', 'فرشاة', 'مشط',
        'شفرة', 'موس', 'عطر', 'ديو', 'كريم', 'لوشن', 'زيت شعر',
    ],
    'مواصلات': [
        'بنزين', 'ديزل', 'زيت سيارة', 'مواصلات', 'تاكسي', 'باص',
        'تذكرة', 'طيران', 'قطار', 'عبارة',
    ],
    'فواتير': [
        'كهرباء', 'ماء', 'غاز', 'هاتف', 'نت', 'إنترنت', 'اشتراك',
        'فواتير', 'إيجار', 'قسط',
    ],
    'تعليم': [
        'مدرسة', 'جامعة', 'كتب', 'دفتر', 'قلم', 'كراسة', 'شنطة',
        'مصاريف', 'رسوم', 'دروس', 'تعليم',
    ],
    'ترفيه': [
        'سينما', 'مطعم', 'كافيه', 'وجبة', 'أكل', 'عشاء', 'غداء',
        'فطور', 'سفرة', 'نزهة', 'رحلات', 'تلفاز', 'نتفلكس',
    ],
    'أخرى': [],
};

// بناء Map عكسي
for (const [category, keywords] of Object.entries(CATEGORY_DATA)) {
    for (const keyword of keywords) {
        const normalized = normalizeName(keyword);
        if (normalized) {
            CATEGORY_KEYWORDS_MAP.set(normalized, category as CategoryType);
        }
    }
}

// ====== دوال مساعدة للكاش ======
async function loadCache(storageKey: string): Promise<Map<string, any>> {
    try {
        const data = await AsyncStorage.getItem(storageKey);
        if (!data) return new Map();
        const parsed = JSON.parse(data);
        return new Map(Object.entries(parsed));
    } catch {
        return new Map();
    }
}

async function saveCache(storageKey: string, map: Map<string, any>): Promise<void> {
    try {
        const obj = Object.fromEntries(map);
        await AsyncStorage.setItem(storageKey, JSON.stringify(obj));
    } catch (error) {
        logError('smartCategorizer', error, { context: 'saveCache' });
    }
}

// ====== العمليات الرئيسية ======

export const categorizeProduct = async (productName: string): Promise<CategoryType> => {
    if (!productName || !productName.trim()) return 'أخرى';

    const normalized = normalizeName(productName);
    if (!normalized) return 'أخرى';

    const cache = await loadCache(CATEGORY_CACHE_KEY);
    if (cache.has(normalized)) return cache.get(normalized);

    if (CATEGORY_KEYWORDS_MAP.has(normalized)) {
        const category = CATEGORY_KEYWORDS_MAP.get(normalized)!;
        cache.set(normalized, category);
        await saveCache(CATEGORY_CACHE_KEY, cache);
        return category;
    }

    for (const [keyword, category] of CATEGORY_KEYWORDS_MAP.entries()) {
        if (normalized.includes(keyword) || keyword.includes(normalized)) {
            cache.set(normalized, category);
            await saveCache(CATEGORY_CACHE_KEY, cache);
            return category;
        }
    }

    try {
        const uid = auth.currentUser?.uid;
        if (uid) {
            const apiKey = await getUserApiKey(uid);
            if (apiKey) {
                const result = await categorizeBatch(apiKey, [{ name: productName }]);
                if (result?.[0]?.category && result[0].category !== 'أخرى') {
                    const cat = result[0].category as CategoryType;
                    cache.set(normalized, cat);
                    await saveCache(CATEGORY_CACHE_KEY, cache);
                    return cat;
                }
            }
        }
    } catch (error) {
        logError('smartCategorizer', error, { context: 'categorizeProduct' });
    }

    return 'أخرى';
};

export const categorizeUnknownItems = async (items: any[]): Promise<any[]> => {
    if (!items?.length) return [];

    const cache = await loadCache(CATEGORY_CACHE_KEY);
    const unknownItems: any[] = [];
    const results: any[] = [];

    for (const item of items) {
        const normalized = normalizeName(item.name);
        if (!normalized) {
            results.push({ ...item, category: 'أخرى' });
            continue;
        }

        if (cache.has(normalized)) {
            results.push({ ...item, category: cache.get(normalized) });
            continue;
        }

        if (CATEGORY_KEYWORDS_MAP.has(normalized)) {
            const category = CATEGORY_KEYWORDS_MAP.get(normalized)!;
            cache.set(normalized, category);
            results.push({ ...item, category });
            continue;
        }

        let found = false;
        for (const [keyword, category] of CATEGORY_KEYWORDS_MAP.entries()) {
            if (normalized.includes(keyword) || keyword.includes(normalized)) {
                cache.set(normalized, category);
                results.push({ ...item, category });
                found = true;
                break;
            }
        }
        if (found) continue;

        unknownItems.push(item);
    }

    await saveCache(CATEGORY_CACHE_KEY, cache);

    if (unknownItems.length > 0) {
        try {
            const uid = auth.currentUser?.uid;
            if (uid) {
                const apiKey = await getUserApiKey(uid);
                if (apiKey) {
                    const batchResults = await categorizeBatch(apiKey, unknownItems);
                    if (batchResults?.length > 0) {
                        const freshCache = await loadCache(CATEGORY_CACHE_KEY);
                        for (let i = 0; i < unknownItems.length; i++) {
                            const category = batchResults[i]?.category || 'أخرى';
                            const normalized = normalizeName(unknownItems[i].name);
                            if (normalized) freshCache.set(normalized, category);
                            results.push({ ...unknownItems[i], category });
                        }
                        await saveCache(CATEGORY_CACHE_KEY, freshCache);
                    } else {
                        unknownItems.forEach(i => results.push({ ...i, category: 'أخرى' }));
                    }
                } else {
                    unknownItems.forEach(i => results.push({ ...i, category: 'أخرى' }));
                }
            }
        } catch (error) {
            logError('smartCategorizer', error, { context: 'categorizeUnknownItems' });
            unknownItems.forEach(i => results.push({ ...i, category: 'أخرى' }));
        }
    }

    return results;
};

export const sortByAisle = (items: any[]): any[] => {
    if (!items?.length) return [];
    const aisleOrder: CategoryType[] = [
        'خضروات وفواكه', 'لحوم', 'غذائي', 'مشروبات',
        'منظفات', 'أدوات منزلية', 'أدوية', 'مواصلات',
        'فواتير', 'تعليم', 'ترفيه', 'أخرى',
    ];
    return [...items].sort((a, b) => {
        const orderA = aisleOrder.indexOf(a.category || 'أخرى');
        const orderB = aisleOrder.indexOf(b.category || 'أخرى');
        return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
    });
};

export const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
        'خضروات وفواكه': '#4caf50', 'لحوم': '#f44336', 'غذائي': '#ff9800',
        'مشروبات': '#2196f3', 'منظفات': '#9c27b0', 'أدوات منزلية': '#795548',
        'أدوية': '#00bcd4', 'مواصلات': '#607d8b', 'فواتير': '#e91e63',
        'تعليم': '#3f51b5', 'ترفيه': '#ff5722', 'أخرى': '#9e9e9e',
    };
    return colors[category] || '#9e9e9e';
};

export const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
        'خضروات وفواكه': '🥦', 'لحوم': '🥩', 'غذائي': '🍞',
        'مشروبات': '🥤', 'منظفات': '🧹', 'أدوات منزلية': '🏠',
        'أدوية': '💊', 'مواصلات': '🚗', 'فواتير': '📄',
        'تعليم': '📚', 'ترفيه': '🎮', 'أخرى': '📦',
    };
    return icons[category] || '📦';
};
