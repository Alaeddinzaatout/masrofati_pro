import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase/config';
import { ConsumptionAnalysis, ProductIndexDoc, Purchase, StorePrice } from '../types';
import { analyzeExpenseText, askDeepSeekGeneric, ExpenseItem, getDeepSeekKey } from './cerebras';
import { analyzeReceipt, GeminiReceiptResponse, GeminiSuggestion, suggestRestock as geminiSuggestRestock, getUserApiKey as getGeminiKey } from './gemini';
import { analyzeConsumption, getLowStockItems, predictShortages } from './inventoryPredictor';
import { analyzePriceTrend, comparePrices, priceAdvisor } from './priceAdvisor';
import {
    getAllProducts as getAllProductsFromDB,
    getPriceHistory as getPriceHistoryFromDB,
    getStoresForProduct as getStoresForProductFromDB
} from './priceHistory';
import { analyzeFinancialTrendWithAI } from './reportEngine';

// ====== ثوابت ======
const STORAGE_KEY_PREFIX = 'ai_manager_';
const DEFAULT_MAX_CACHE_SIZE = 100;
const DEFAULT_TTL = 10 * 60 * 1000; // 10 دقائق

// ====== مدير الكاش المركزي (The Centralized Persistent Cache) ======
class PersistentCache {
    prefix: string;
    maxSize: number;
    setCount: number;

    constructor(prefix = 'cache_', maxSize = DEFAULT_MAX_CACHE_SIZE) {
        this.prefix = prefix;
        this.maxSize = maxSize;
        this.setCount = 0;
    }

    async get(key: string): Promise<any | null> {
        try {
            const raw = await AsyncStorage.getItem(this.prefix + key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            
            // 🛡️ التعديل الأول: دعم TTL مخصص لكل عنصر (مثلاً 30 يوم لبعض البيانات)
            const ttl = parsed.ttl || DEFAULT_TTL;
            
            if (Date.now() - parsed.timestamp < ttl) {
                return parsed.data;
            }
            await AsyncStorage.removeItem(this.prefix + key);
            return null;
        } catch (e) {
            return null;
        }
    }

    // 🛡️ التعديل الثاني: إضافة متغير ttl اختياري
    async set(key: string, data: any, ttl?: number): Promise<void> {
        try {
            const payload = { data, timestamp: Date.now(), ttl: ttl || DEFAULT_TTL };
            await AsyncStorage.setItem(this.prefix + key, JSON.stringify(payload));
            this.setCount++;
            if (this.setCount % 10 === 0) this.cleanup();
        } catch (e) {}
    }

    async delete(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(this.prefix + key);
        } catch (e) {}
    }

    async cleanup(): Promise<void> {
        try {
            const allKeys = await AsyncStorage.getAllKeys();
            const cacheKeys = allKeys.filter(k => k.startsWith(this.prefix));
            if (cacheKeys.length > this.maxSize) {
                const itemsToDelete = cacheKeys.slice(0, cacheKeys.length - this.maxSize);
                await AsyncStorage.multiRemove(itemsToDelete);
            }
        } catch (e) {}
    }

    async clear(): Promise<void> {
        try {
            const allKeys = await AsyncStorage.getAllKeys();
            const cacheKeys = allKeys.filter(k => k.startsWith(this.prefix));
            if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
        } catch (e) {}
    }
}

// ====== مُحدد المعدل الدائم (Persistent Rate Limiter) ======
class PersistentRateLimiter {
    serviceName: string;
    maxRequests: number;
    windowMs: number;
    storageKey: string;

    constructor(serviceName: string, maxRequests = 5, windowMs = 60_000) {
        this.serviceName = serviceName;
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.storageKey = STORAGE_KEY_PREFIX + 'ratelimiter_' + serviceName;
    }

    async canProceed(): Promise<boolean> {
        const now = Date.now();
        const raw = await AsyncStorage.getItem(this.storageKey);
        let requests: number[] = raw ? JSON.parse(raw) : [];

        requests = requests.filter(t => now - t < this.windowMs);

        if (requests.length >= this.maxRequests) {
            const waitTime = Math.ceil((this.windowMs - (now - requests[0])) / 1000);
            throw new Error(`تجاوزت حد الطلبات. انتظر ${waitTime} ثانية`);
        }

        requests.push(now);
        await AsyncStorage.setItem(this.storageKey, JSON.stringify(requests));
        return true;
    }

    async rollback(): Promise<void> {
        const raw = await AsyncStorage.getItem(this.storageKey);
        if (raw) {
            const requests: number[] = JSON.parse(raw);
            requests.pop();
            await AsyncStorage.setItem(this.storageKey, JSON.stringify(requests));
        }
    }

    async getRemaining(): Promise<number> {
        const now = Date.now();
        const raw = await AsyncStorage.getItem(this.storageKey);
        let requests: number[] = raw ? JSON.parse(raw) : [];
        requests = requests.filter(t => now - t < this.windowMs);
        return Math.max(0, this.maxRequests - requests.length);
    }
}

let cachedGeminiKey: string | null = null;
let cachedDeepSeekKey: string | null = null;

const getGeminiKeyWithCache = async (): Promise<string | null> => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('يجب تسجيل الدخول أولاً');
    if (!cachedGeminiKey) cachedGeminiKey = await getGeminiKey(uid);
    return cachedGeminiKey;
};

const getDeepSeekKeyWithCache = async (): Promise<string | null> => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('يجب تسجيل الدخول أولاً');
    if (!cachedDeepSeekKey) cachedDeepSeekKey = await getDeepSeekKey(uid);
    return cachedDeepSeekKey;
};

class AIServiceManager {
    cache: PersistentCache;
    geminiLimiter: PersistentRateLimiter;
    deepseekLimiter: PersistentRateLimiter;

    constructor() {
        this.cache = new PersistentCache('ai_cache_');
        this.geminiLimiter = new PersistentRateLimiter('gemini', 5, 60_000);
        this.deepseekLimiter = new PersistentRateLimiter('deepseek', 10, 60_000);
    }

    _getCurrentUserId(): string {
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error('يجب تسجيل الدخول أولاً');
        return uid;
    }

    // ====== دوال الكاش المركزي لباقي التطبيق ======
    async getGlobalCache(key: string): Promise<any | null> {
        return await this.cache.get('global_' + key);
    }

    async setGlobalCache(key: string, data: any, ttl_ms?: number): Promise<void> {
        await this.cache.set('global_' + key, data, ttl_ms);
    }

    async deleteGlobalCache(key: string): Promise<void> {
        await this.cache.delete('global_' + key);
    }

    // ====== مهام الذكاء الاصطناعي ======
    async analyzeReceipt(base64Images: string[]): Promise<GeminiReceiptResponse> {
        if (!base64Images || base64Images.length === 0) throw new Error('صور غير صالحة');
        const cacheKey = 'receipt_' + base64Images[0].substring(0, 100);
        const cached = await this.cache.get(cacheKey);
        if (cached) return cached as GeminiReceiptResponse;

        await this.geminiLimiter.canProceed();
        try {
            const apiKey = await getGeminiKeyWithCache();
            if (!apiKey) throw new Error('مفتاح Gemini مفقود');
            
            const result = await analyzeReceipt(apiKey, base64Images);

            const now = new Date();
            const todayString = now.toISOString().split('T')[0];

            const sanitizeDate = (dateStr: string) => {
                if (!dateStr) return todayString;
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return todayString;
                const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
                if (d > now || diffDays > 30) return todayString;
                return dateStr;
            };

            if (result) {
                if ((result as any).date) (result as any).date = sanitizeDate((result as any).date);
                if (Array.isArray((result as any).items)) {
                    (result as any).items.forEach((item: any) => {
                        if (item.date) item.date = sanitizeDate(item.date);
                    });
                }
                if (Array.isArray(result)) {
                    result.forEach((item: any) => {
                        if (item.date) item.date = sanitizeDate(item.date);
                    });
                }
            }

            await this.cache.set(cacheKey, result);
            return result;
        } catch (error) {
            await this.geminiLimiter.rollback();
            throw error;
        }
    }

    async analyzeText(text: string): Promise<ExpenseItem[]> {
        if (!text?.trim()) throw new Error('نص غير صالح');
        const cacheKey = 'text_' + text.trim().substring(0, 100);
        const cached = await this.cache.get(cacheKey);
        if (cached) return cached as ExpenseItem[];

        await this.deepseekLimiter.canProceed();
        
        // 🛡️ مناعة DeepSeek (Retry Loop): المحاولة 3 مرات قبل الاستسلام
        let retries = 3;
        while (retries > 0) {
            try {
                const apiKey = await getDeepSeekKeyWithCache();
                if (!apiKey) throw new Error('مفتاح DeepSeek مفقود');
                const result = await analyzeExpenseText(apiKey, text);
                await this.cache.set(cacheKey, result);
                return result;
            } catch (error) {
                retries--;
                if (retries === 0) {
                    await this.deepseekLimiter.rollback();
                    throw error;
                }
                // انتظار ثانية واحدة قبل المحاولة مجدداً
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        throw new Error('فشل الاتصال بـ DeepSeek بعد عدة محاولات');
    }

    async askGenericText(systemPrompt: string, userPrompt: string): Promise<any> {
        if (!userPrompt?.trim()) throw new Error('نص غير صالح');
        const cacheKey = 'generic_' + userPrompt.trim().substring(0, 100);
        const cached = await this.cache.get(cacheKey);
        if (cached) return cached;

        await this.deepseekLimiter.canProceed();
        
        console.log("AI_MANAGER: Entering askGenericText for DeepSeek");
        
        // 🛡️ مناعة DeepSeek (Retry Loop)
        let retries = 3;
        while (retries > 0) {
            try {
                const apiKey = await getDeepSeekKeyWithCache();
                console.log("AI_MANAGER: DeepSeek Key found:", !!apiKey);
                
                if (!apiKey) throw new Error('مفتاح DeepSeek مفقود');
                const result = await askDeepSeekGeneric(apiKey, systemPrompt, userPrompt);
                if (result) await this.cache.set(cacheKey, result);
                return result;
            } catch (error: any) {
                console.error("AI_MANAGER: DeepSeek Attempt Failed:", error.message);
                retries--;
                if (retries === 0) {
                    await this.deepseekLimiter.rollback();
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        throw new Error('فشل الاتصال بـ DeepSeek بعد عدة محاولات');
    }

    async comparePrices(productName: string, currentPrice: number, currentStore: string): Promise<any> {
        return await comparePrices(productName, currentPrice, currentStore);
    }

    async priceAdvisor(purchase: any): Promise<any> {
        return await priceAdvisor(purchase);
    }

    async analyzePriceTrend(productName: string, priceHistory: Purchase[]): Promise<any> {
        return await analyzePriceTrend(productName, priceHistory);
    }

    async getPriceHistory(productName: string, limitCount = 50): Promise<Purchase[]> {
        const uid = this._getCurrentUserId();
        return await getPriceHistoryFromDB(uid, productName, limitCount);
    }

    async getStoresForProduct(productName: string, limitCount = 100): Promise<StorePrice[]> {
        const uid = this._getCurrentUserId();
        return await getStoresForProductFromDB(uid, productName, limitCount);
    }

    async getAllProducts(limitCount = 100, startAfterDoc = null): Promise<ProductIndexDoc[]> {
        const uid = this._getCurrentUserId();
        const result = await getAllProductsFromDB(uid, limitCount, startAfterDoc);
        return result.products as ProductIndexDoc[];
    }

    async analyzeConsumption(purchases: Purchase[], productName: string): Promise<ConsumptionAnalysis> {
        return await analyzeConsumption(purchases, productName);
    }

    async getLowStockItems(purchases: Purchase[]): Promise<ConsumptionAnalysis[]> {
        return await getLowStockItems(purchases);
    }

    async predictShortages(purchases: Purchase[]): Promise<any[]> {
        return await predictShortages(purchases);
    }

    async analyzeFinancialTrend(purchases: Purchase[]): Promise<any> {
        return await analyzeFinancialTrendWithAI(purchases);
    }

    async suggestRestock(purchases: Purchase[]): Promise<GeminiSuggestion> {
        if (!purchases?.length) return { suggestion: null, reason: 'لا توجد بيانات' };
        await this.geminiLimiter.canProceed();
        try {
            const apiKey = await getGeminiKeyWithCache();
            if (!apiKey) throw new Error('مفتاح Gemini مفقود');
            return await geminiSuggestRestock(apiKey, purchases);
        } catch (error) {
            await this.geminiLimiter.rollback();
            throw error;
        }
    }

    async clearReceiptCache(): Promise<void> {
        try {
            const allKeys = await AsyncStorage.getAllKeys();
            const receiptKeys = allKeys.filter(k => k.startsWith(this.cache.prefix + 'receipt_'));
            if (receiptKeys.length > 0) {
                await AsyncStorage.multiRemove(receiptKeys);
            }
        } catch (e) {
            console.warn('Clear receipt cache error:', e);
        }
    }

    async clearCache(): Promise<void> { await this.cache.clear(); }
    invalidateKeyCache(): void { cachedGeminiKey = null; cachedDeepSeekKey = null; }

    async getLimiterStatus(): Promise<any> {
        return {
            gemini: { remaining: await this.geminiLimiter.getRemaining() },
            deepseek: { remaining: await this.deepseekLimiter.getRemaining() },
        };
    }
}

export const aiManager = new AIServiceManager();