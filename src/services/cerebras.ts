import { Cerebras } from '@cerebras/cerebras_cloud_sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { logError } from './logger';

const CEREBRAS_KEY = 'cerebras-api-key';
const CEREBRAS_ASYNC_KEY = 'cerebras-api-key-async';
const CEREBRAS_MODEL = 'gpt-oss-120b';

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
 * استخراج JSON من نص Cerebras
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

  // Fallback للتحليل اليدوي البسيط (نفس منطقك الأصلي)
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

export const saveCerebrasKey = async (userId: string, apiKey: string): Promise<void> => {
  console.log("CEREBRAS_SERVICE: Attempting to save API key.");
  try {
    const testResult = await testCerebrasKey(apiKey.trim());
    if (!testResult.success) throw new Error(testResult.message);
    console.log("CEREBRAS_SERVICE: Key test passed.");

    // 1. التخزين المحلي الآمن (للسرعة)
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(CEREBRAS_KEY, apiKey.trim());
    } else {
      try { await SecureStore.setItemAsync(CEREBRAS_KEY, apiKey.trim()); } 
      catch { await AsyncStorage.setItem(CEREBRAS_KEY, apiKey.trim()); }
    }

    // 2. المزامنة مع النظام العالمي (Firestore)
    await setDoc(doc(db, 'system_config', 'api_keys'), {
      cerebrasApiKey: apiKey.trim(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log("CEREBRAS_SERVICE: Key saved successfully to global config.");
  } catch (e) {
    console.log("CEREBRAS_SERVICE: General error in saveCerebrasKey:", e);
    logError('cerebras', e, { context: 'saveCerebrasKey', userId });
    throw e;
  }
};

export const getCerebrasKey = async (userId: string): Promise<string | null> => {
  try {
    let key: string | null = null;

    // 1. محاولة الجلب من التخزين المحلي
    if (Platform.OS === 'web') {
      key = await AsyncStorage.getItem(CEREBRAS_KEY);
    } else {
      try {
        key = await SecureStore.getItemAsync(CEREBRAS_KEY);
        if (!key) key = await AsyncStorage.getItem(CEREBRAS_KEY);
      } catch {
        key = await AsyncStorage.getItem(CEREBRAS_KEY);
      }
    }

    if (key) return key;

    // 2. محاولة السحابة (الإعدادات العالمية)
    const snap = await getDoc(doc(db, 'system_config', 'api_keys'));
    if (snap.exists()) {
      const fbKey = snap.data()?.cerebrasApiKey;
      if (fbKey) {
        // حفظ محلياً للمرة القادمة
        if (Platform.OS === 'web') {
          await AsyncStorage.setItem(CEREBRAS_KEY, fbKey);
        } else {
          try { await SecureStore.setItemAsync(CEREBRAS_KEY, fbKey); } catch {}
        }
        return fbKey;
      }
    }
  } catch (e) {
    logError('cerebras', e, { context: 'getCerebrasKey', userId });
  }
  return null;
};

// ====== العمليات الرئيسية ======

export const testCerebrasKey = async (apiKey: string): Promise<TestResult> => {
  try {
    const client = new Cerebras({ apiKey: apiKey.trim() });
    const response = await client.chat.completions.create({
      model: CEREBRAS_MODEL,
      messages: [{ role: 'user', content: 'Say "Hello" only' }],
      // ✂️ مسحنا max_tokens باش نعطوه مساحة يتنفس ويرد براحته
    });
    
    // 🪤 الفخ السري: طباعة رد السيرفر بالكامل في الشاشة السوداء (Terminal)
    console.log("CEREBRAS FULL RESPONSE:", JSON.stringify(response, null, 2));

    const choice = (response?.choices as any)?.[0];
    if (choice?.message?.content) return { success: true, message: 'المفتاح صالح ✓' };
    
    return { success: false, message: 'استجابة غير متوقعة' };
  } catch (error: any) {
    console.log("CEREBRAS ERROR:", error);
    return { success: false, message: error.message || 'فشل الاتصال بـ Cerebras' };
  }
};
const SYSTEM_PROMPT = `أنت مساعد متخصص في تحليل فواتير المصروفات باللهجة الليبية. استخرج JSON مصفوفة فقط: [{"amount": رقم, "unitPrice": رقم, "quantity": رقم, "unit": نص, "category": نص, "description": نص}]. 
[القاعدة الذهبية]: إياك أن تقوم بأي عملية حسابية نهائياً. استخرج "الكمية" وضعها في (quantity). استخرج الرقم المكتوب كإجمالي وضعه في (amount). اجعل حقل (unitPrice) دائماً 0.`;

export const analyzeExpenseText = async (apiKey: string, text: string): Promise<ExpenseItem[]> => {
  try {
    const client = new Cerebras({ apiKey: apiKey.trim() });
    const response = await client.chat.completions.create({
      model: CEREBRAS_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text.trim() }
      ],
      temperature: 0.1,
    });

    const choice = (response?.choices as any)?.[0];
    const rawText = choice?.message?.content || '';
    const result = extractJSON(rawText);

    return result.map(item => ({
      amount: parseFloat(item.amount) || 0,
      unitPrice: 0, // 👈 التعديل هنا: سحبنا الثقة منه نهائياً
      quantity: parseFloat(item.quantity) || 1,
      unit: item.unit || 'حبة',
      category: item.category || 'أخرى',
      description: item.description || item.name || 'بند غير معروف',
    }));
  } catch (error) {
    logError('cerebras', error, { context: 'analyzeExpenseText' });
    throw error;
  }
};

/**
 * 🌟 الدالة العامة (The Cure): تفصل المهام وتستقبل أي Prompt لحل مشكلة التهريب
 */
export const askCerebrasGeneric = async (apiKey: string, systemPrompt: string, userPrompt: string): Promise<any> => {
  try {
    const client = new Cerebras({ apiKey: apiKey.trim() });
    const response = await client.chat.completions.create({
      model: CEREBRAS_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2, // حرارة منخفضة لضمان الالتزام بالـ JSON
    });

    const choice = (response?.choices as any)?.[0];
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
    logError('cerebras', error, { context: 'askCerebrasGeneric' });
    throw error;
  }
};
