import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Purchase } from '../types';
import { logError } from './logger';

// ====== الثوابت ======
const GEMINI_KEY = 'gemini-api-key';
const GEMINI_ASYNC_KEY = 'gemini-api-key-async';
const MODEL_NAME = 'gemini-3-flash-preview';

// ====== الواجهات (Interfaces) ======

export interface GeminiItem {
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
  category: string;
  isUnverified?: boolean;
}

export interface GeminiReceiptResponse {
  store: string;
  date: string;
  items: GeminiItem[];
  receiptTotal?: number;
  auditPassed?: boolean;
}

export interface GeminiSuggestion {
  suggestion: string | null;
  reason: string;
}

export interface TestResult {
  success: boolean;
  message: string;
}

// ====== دوال المساعدة ======

/**
 * استخراج JSON من نص Gemini مع تنظيف أقوى
 */
function extractJSON(rawText: string): any {
  if (!rawText) throw new Error('رد فارغ');
  const cleaned = rawText.trim().replace(/```json/g, '').replace(/```/g, '').trim();

  // محاولة البحث عن أول { وآخر }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start === -1 || end === -1) throw new Error('لا يوجد هيكل JSON');

  return JSON.parse(cleaned.substring(start, end + 1));
}

// دالة الاتصال مع Retry
async function callGeminiWithRetry(
  prompt: string,
  parts: any[],
  apiKey: string,
  retries = 2
): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              maxOutputTokens: 8192,
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) throw new Error('فشل الاتصال');

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error('لا يوجد نص في الرد');

      return extractJSON(text);
    } catch (e) {
      if (i === retries) throw e;
      console.warn(`Retry ${i + 1} failed...`);
      // انتظار بسيط قبل إعادة المحاولة
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Unhandled Gemini retry state');
}

/**
 * 🛡️ درع التاريخ: تحليل التاريخ بصيغة YYYY-MM-DD مع طرد الأخطاء
 */
function parseDate(rawDate: string): string {
  const today = new Date().toISOString().split('T')[0];
  if (!rawDate) return today;

  // تنظيف الأرقام العربية
  const cleaned = rawDate.replace(/[٠-٩]/g, d =>
    String.fromCharCode(d.charCodeAt(0) - '٠'.charCodeAt(0) + '0'.charCodeAt(0))
  );

  const match = cleaned.match(
    /(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})|(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{4})/
  );

  let parsedDateString = today;
  
  if (match) {
    if (match[1]) {
      parsedDateString = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    } else if (match[6]) {
      parsedDateString = `${match[6]}-${match[5].padStart(2, '0')}-${match[4].padStart(2, '0')}`;
    }
  }

  // 🛑 الفلتر الصارم: نمنع أي تاريخ من المستقبل، أو أقدم من 30 يوم
  const parsedDate = new Date(parsedDateString);
  const now = new Date();
  
  if (isNaN(parsedDate.getTime())) return today;

  const diffDays = (now.getTime() - parsedDate.getTime()) / (1000 * 3600 * 24);
  
  // إذا كان التاريخ من المستقبل (نعطي سماحية يوم لاختلاف التوقيت) أو أقدم من 30 يوم
  if (diffDays < -1 || diffDays > 30) {
    return today; // اطرد التاريخ القديم/المستقبلي واجبره على تاريخ اليوم!
  }

  return parsedDateString;
}

// ====== حفظ واسترجاع مفتاح API ======

export const saveUserApiKey = async (userId: string, apiKey: string): Promise<void> => {
  try {
    // 1. التخزين المحلي (للسرعة)
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(GEMINI_KEY, apiKey);
    } else {
      try { await SecureStore.setItemAsync(GEMINI_KEY, apiKey); } 
      catch { await AsyncStorage.setItem(GEMINI_KEY, apiKey); }
    }

    // 2. المزامنة مع النظام العالمي (Firestore)
    await setDoc(
      doc(db, 'system_config', 'api_keys'),
      { geminiApiKey: apiKey, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (e) {
    logError('gemini', e, { context: 'saveUserApiKey' });
  }
};

export const getUserApiKey = async (userId: string): Promise<string | null> => {
  try {
    let key: string | null = null;

    // 1. محاولة الجلب من التخزين المحلي
    if (Platform.OS === 'web') {
      key = await AsyncStorage.getItem(GEMINI_KEY);
    } else {
      try {
        key = await SecureStore.getItemAsync(GEMINI_KEY);
        if (!key) key = await AsyncStorage.getItem(GEMINI_KEY);
      } catch {
        key = await AsyncStorage.getItem(GEMINI_KEY);
      }
    }

    if (key) return key;

    // 2. محاولة السحابة (الإعدادات العالمية)
    const snap = await getDoc(doc(db, 'system_config', 'api_keys'));
    if (snap.exists()) {
      const fbKey = (snap.data() as any)?.geminiApiKey;
      if (fbKey) {
        // حفظ محلياً للمرة القادمة
        if (Platform.OS === 'web') {
          await AsyncStorage.setItem(GEMINI_KEY, fbKey);
        } else {
          try { await SecureStore.setItemAsync(GEMINI_KEY, fbKey); } catch {}
        }
        return fbKey;
      }
    }
  } catch (e) {
    logError('gemini', e, { context: 'getUserApiKey' });
  }
  return null;
};

// ====== العمليات الرئيسية ======

export const testGeminiKey = async (apiKey: string): Promise<TestResult> => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey.trim()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'قل "مرحباً" فقط' }] }],
          generationConfig: { maxOutputTokens: 10, temperature: 0.1 },
        }),
      }
    );

    if (response.ok) return { success: true, message: 'المفتاح صالح ✅' };
    return { success: false, message: 'المفتاح غير صالح ❌' };
  } catch (error) {
    logError('gemini', error, { context: 'testGeminiKey' });
    return { success: false, message: 'فشل الاتصال بالخادم' };
  }
};

export const analyzeReceipt = async (
  apiKey: string,
  base64Images: string[]
): Promise<GeminiReceiptResponse> => {
  const prompt = `أنت خبير استخراج بيانات (OCR) آلي. مهمتك استخراج النصوص والأرقام من الفاتورة كما هي مكتوبة تماماً.

  [القاعدة الذهبية - ممنوع الرياضيات]: 
  1. إياك أن تقوم بأي عملية ضرب، قسمة، أو استنتاج حسابي.
  2. استخرج "الكمية" (qty).
  3. استخرج الرقم المكتوب أمام الصنف في الفاتورة وضعه في حقل (total) كما هو بالضبط.
  4. اجعل حقل (unitPrice) دائماً 0 (الصفر).
  5. التاريخ يجب أن يكون منطقياً YYYY-MM-DD.

  [هيكل الرد - JSON فقط]:
  {
    "store": "اسم المحل",
    "date": "YYYY-MM-DD",
    "items": [
      {
        "name": "اسم الصنف",
        "qty": 1.0,
        "unit": "حبة",
        "unitPrice": 0.0,
        "total": 0.0,
        "category": "غير معروف",
        "confidence": 0.9
      }
    ],
    "receiptTotal": 0.0
  }
  `;

  const parts: any[] = [{ text: prompt }];
  base64Images.forEach(img =>
    parts.push({ inline_data: { mime_type: 'image/jpeg', data: img } })
  );

  const result = await callGeminiWithRetry(prompt, parts, apiKey);

  // إزالة التحقق الحسابي من هنا، لأننا سنجعل الـ TypeScript يقوم بالقسمة لاحقاً
  const validatedItems = (result.items || []).map((item: any) => ({
    ...item,
    isUnverified: false, // نلغي اللون الأحمر من هنا نهائياً
  }));

  return {
    store: result.store,
    // 🛡️ تمرير التاريخ لدالة الحماية
    date: parseDate(result.date),
    items: validatedItems,
  };
};

export const categorizeBatch = async (
  apiKey: string,
  items: { name: string }[]
): Promise<any[]> => {
  if (!items.length) return [];
  const names = items.map(i => i.name).join('، ');
  const prompt = `صنف الأصناف التالية إلى فئاتها (غذائي، منظفات، أدوية، مشروبات، لحوم، خضروات وفواكه، أدوات منزلية، أخرى) واقترح الوحدة والكمية. أعد JSON مصفوفة فقط. الأصناف: ${names}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey.trim()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
        }),
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return extractJSON(data.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch {
    return [];
  }
};

export const suggestRestock = async (
  apiKey: string,
  purchases: Purchase[]
): Promise<GeminiSuggestion> => {
  if (!purchases?.length) return { suggestion: null, reason: 'لا توجد بيانات كافية' };

  const historyText = purchases
    .slice(-20)
    .map(p => `${p.name} (${p.date})`)
    .join('، ');

  const prompt = `بناءً على تاريخ المشتريات التالي: ${historyText}. اقترح أهم صنف يحتاج شراء قريباً. أعد JSON فقط: {"suggestion": "اسم الصنف", "reason": "سبب التوقع"}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey.trim()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
        }),
      }
    );

    if (!response.ok) return { suggestion: null, reason: 'فشل الاتصال بـ Gemini' };

    const data = await response.json();
    return extractJSON(data.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch {
    return { suggestion: null, reason: 'حدث خطأ أثناء التحليل' };
  }
};