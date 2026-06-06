import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { logError } from './logger';

const DEEPSEEK_KEY = 'deepseek-api-key';
const DEEPSEEK_ASYNC_KEY = 'deepseek-api-key-async';
const DEEPSEEK_MODEL = 'deepseek-chat';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

// ====== Type Definitions ======

export interface ExpenseItem {
  amount: number;
  unitPrice: number;
  quantity: number;
  unit: string;
  category: string;
  description: string;
}

export interface TestResult {
  success: boolean;
  message: string;
}

// ====== دوال المساعدة ======

/**
 * استخراج JSON من نص DeepSeek
 */
function extractJSON(rawText: string): any[] {
  if (!rawText || rawText.trim() === '') return [];

  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/```(?:json)?\s?/g, '').replace(/```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.items)) return parsed.items;
      return [parsed];
    }
  } catch (e) {
    // Regex fallback
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try { return JSON.parse(arrayMatch[0]); } catch {}
    }
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return [JSON.parse(objMatch[0])]; } catch {}
    }
  }

  // Fallback للتحليل اليدوي البسيط
  const lines = rawText.split(/[\n,،]+/).map(l => l.trim()).filter(l => l.length > 0);
  const fallbackItems: any[] = [];
  for (const line of lines) {
    const numbers = line.match(/\d+(?:[.,]\d+)?/g);
    if (numbers && numbers.length > 0) {
      const amount = parseFloat(numbers[numbers.length - 1].replace(',', '.'));
      if (amount > 0) {
        fallbackItems.push({
          amount,
          unitPrice: 0,
          quantity: 1,
          unit: 'حبة',
          category: 'أخرى',
          description: line.replace(numbers[numbers.length - 1], '').trim() || `بند ${fallbackItems.length + 1}`,
        });
      }
    }
  }
  return fallbackItems;
}

// ====== حفظ واسترجاع مفتاح API (مع Fallback لـ AsyncStorage) ======

export const saveDeepSeekKey = async (userId: string, apiKey: string): Promise<void> => {
  console.log("DEEPSEEK_SERVICE: Attempting to save API key.");
  try {
    const testResult = await testDeepSeekKey(apiKey.trim());
    if (!testResult.success) throw new Error(testResult.message);
    console.log("DEEPSEEK_SERVICE: Key test passed.");

    // 1. التخزين المحلي الآمن (للسرعة)
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(DEEPSEEK_KEY, apiKey.trim());
    } else {
      try { await SecureStore.setItemAsync(DEEPSEEK_KEY, apiKey.trim()); } 
      catch { await AsyncStorage.setItem(DEEPSEEK_KEY, apiKey.trim()); }
    }

    // 2. المزامنة مع النظام العالمي (Firestore) - استخدام deepseekKey كما هو مطلوب
    await setDoc(doc(db, 'system_config', 'api_keys'), {
      deepseekKey: apiKey.trim(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log("DEEPSEEK_SERVICE: Key saved successfully to global config.");
  } catch (e) {
    console.log("DEEPSEEK_SERVICE: General error in saveDeepSeekKey:", e);
    logError('deepseek', e, { context: 'saveDeepSeekKey', userId });
    throw e;
  }
};

export const getDeepSeekKey = async (userId: string): Promise<string | null> => {
  try {
    let key: string | null = null;

    // 1. محاولة الجلب من التخزين المحلي
    if (Platform.OS === 'web') {
      key = await AsyncStorage.getItem(DEEPSEEK_KEY);
    } else {
      try {
        key = await SecureStore.getItemAsync(DEEPSEEK_KEY);
        if (!key) key = await AsyncStorage.getItem(DEEPSEEK_KEY);
      } catch {
        key = await AsyncStorage.getItem(DEEPSEEK_KEY);
      }
    }

    if (key) return key;

    // 2. محاولة السحابة (الإعدادات العالمية) - استخدام deepseekKey
    const snap = await getDoc(doc(db, 'system_config', 'api_keys'));
    if (snap.exists()) {
      const fbKey = snap.data()?.deepseekKey;
      if (fbKey) {
        // حفظ محلياً للمرة القادمة
        if (Platform.OS === 'web') {
          await AsyncStorage.setItem(DEEPSEEK_KEY, fbKey);
        } else {
          try { await SecureStore.setItemAsync(DEEPSEEK_KEY, fbKey); } catch {}
        }
        return fbKey;
      }
    }
  } catch (e) {
    logError('deepseek', e, { context: 'getDeepSeekKey', userId });
  }
  return null;
};

// ====== العمليات الرئيسية ======

export const testDeepSeekKey = async (apiKey: string): Promise<TestResult> => {
  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: 'user', content: 'Say "Hello" only' }]
      })
    });

    const responseData = await response.json();
    console.log("DEEPSEEK FULL RESPONSE:", JSON.stringify(responseData, null, 2));

    if (!response.ok) {
       return { success: false, message: responseData.error?.message || 'فشل الاتصال بـ DeepSeek' };
    }

    const choice = responseData?.choices?.[0];
    if (choice?.message?.content) return { success: true, message: 'المفتاح صالح ✓' };
    
    return { success: false, message: 'استجابة غير متوقعة' };
  } catch (error: any) {
    console.log("DEEPSEEK ERROR:", error);
    return { success: false, message: error.message || 'فشل الاتصال بـ DeepSeek' };
  }
};

const SYSTEM_PROMPT = `أنت مساعد متخصص في تحليل فواتير المصروفات باللهجة الليبية. استخرج JSON مصفوفة فقط: [{"amount": رقم, "unitPrice": رقم, "quantity": رقم, "unit": نص, "category": نص, "description": نص}]. 
[القاعدة الذهبية]: إياك أن تقوم بأي عملية حسابية نهائياً. استخرج "الكمية" وضعها في (quantity). استخرج الرقم المكتوب كإجمالي وضعه في (amount). اجعل حقل (unitPrice) دائماً 0.`;

export const analyzeExpenseText = async (apiKey: string, text: string): Promise<ExpenseItem[]> => {
  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text.trim() }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) throw new Error('فشل استدعاء DeepSeek API');
    
    const responseData = await response.json();
    const choice = responseData?.choices?.[0];
    const rawText = choice?.message?.content || '';
    const result = extractJSON(rawText);

    return result.map(item => ({
      amount: parseFloat(item.amount) || 0,
      unitPrice: 0,
      quantity: parseFloat(item.quantity) || 1,
      unit: item.unit || 'حبة',
      category: item.category || 'أخرى',
      description: item.description || item.name || 'بند غير معروف',
    }));
  } catch (error) {
    logError('deepseek', error, { context: 'analyzeExpenseText' });
    throw error;
  }
};

/**
 * 🌟 الدالة العامة (The Cure): تفصل المهام وتستقبل أي Prompt لحل مشكلة التهريب
 */
export const askDeepSeekGeneric = async (apiKey: string, systemPrompt: string, userPrompt: string): Promise<any> => {
  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) throw new Error('فشل استدعاء DeepSeek API');

    const responseData = await response.json();
    const choice = responseData?.choices?.[0];
    let rawText = choice?.message?.content || '';

    // محاولة استخراج JSON النظيف بدلاً من المصفوفة الإجبارية
    rawText = rawText.trim().replace(/```(?:json)?\s?/g, '').replace(/```/g, '').trim();
    
    try {
      return JSON.parse(rawText);
    } catch (e) {
      const startObj = rawText.indexOf('{');
      const endObj = rawText.lastIndexOf('}');
      if (startObj !== -1 && endObj !== -1) {
        return JSON.parse(rawText.substring(startObj, endObj + 1));
      }
      
      const startArr = rawText.indexOf('[');
      const endArr = rawText.lastIndexOf(']');
      if (startArr !== -1 && endArr !== -1) {
        return JSON.parse(rawText.substring(startArr, endArr + 1));
      }
    }

    return null;
  } catch (error) {
    logError('deepseek', error, { context: 'askDeepSeekGeneric' });
    throw error;
  }
};
