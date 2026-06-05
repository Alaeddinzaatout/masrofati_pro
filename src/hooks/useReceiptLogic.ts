import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { auth } from '../firebase/config';
import { aiManager } from '../services/aiServiceManager';
import { addPurchasesBatch } from '../services/purchases';
import { checkAccess, recordUsage, showQuotaAlert, checkAndIncrementDailyQuota } from '../services/subscription';
import { speakReceiptSummary } from '../services/voiceService';
import { EditableItem, ValidationIssue } from '../types';
import { getImageSize, optimizeImage } from '../utils/imageOptimizer';
import { validateMath, normalizeUnit } from '../utils/validation';

export type AnalysisMode = 'gemini' | 'cerebras';

export const useReceiptLogic = () => {
  const router = useRouter();
  const [mode, setMode] = useState<AnalysisMode>('gemini');
  const [image, setImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<string>('');
  const [expenseText, setExpenseText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  
  // Validation
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [validationSummary, setValidationSummary] = useState<string>('');
  const [validationVisible, setValidationVisible] = useState(false);

  // Editable items
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [receiptDate, setReceiptDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [storeName, setStoreName] = useState<string>('');

  // Snackbar states
  const [snack, setSnack] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  const isSaving = useRef(false);
  const isAnalyzing = useRef(false);

  // ====== Helpers ======
  const showSnack = (message: string, type: 'success' | 'error' = 'success') => {
    setSnack({ visible: true, message, type });
  };

  const hideSnack = () => setSnack(prev => ({ ...prev, visible: false }));

  const resetAllState = useCallback(() => {
    setImage(null);
    setImageSize('');
    setResult(null);
    setEditableItems([]);
    setStoreName('');
    setExpenseText('');
    setReceiptDate(new Date().toISOString().split('T')[0]);
    setValidationIssues([]);
    setValidationSummary('');
    setValidationVisible(false);
    aiManager.clearReceiptCache();
    isAnalyzing.current = false;
  }, []);

  const generateItemId = () => `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Math Validation Effect
  useEffect(() => {
    if (editableItems.length === 0) return;
    const { valid, issues, summary } = validateMath(editableItems);
    setValidationIssues(issues as ValidationIssue[]);
    setValidationSummary(summary);
    setValidationVisible(!valid);
  }, [editableItems]);

  // Handle Result Transformation
  useEffect(() => {
    if (result) {
      let items: EditableItem[] = [];
      if (mode === 'gemini') {
        items = result.items.map((item: any) => {
          const rawTotal = parseFloat(item.total || item.price || item.amount || item.unitPrice || '0');
          const rawQty = parseFloat(item.qty || item.quantity || '1') || 1;
          const actualUnitPrice = rawTotal / rawQty;

          return {
            _id: generateItemId(),
            name: (item.name === 'null' || !item.name) ? '' : item.name,
            price: rawTotal.toString(),
            qty: rawQty.toString(),
            unit: item.unit || 'حبة',
            unitPrice: actualUnitPrice.toFixed(3).replace(/\.?0+$/, ''),
            category: item.category || 'أخرى',
          };
        });
        setStoreName(result.store === 'null' ? '' : (result.store || ''));
        if (result.date && result.date !== 'null') setReceiptDate(result.date);
      } else {
        items = result.map((item: any, index: number) => {
          const rawTotal = parseFloat(item.amount || item.price || item.total || '0');
          const rawQty = parseFloat(item.quantity || item.qty || '1') || 1;
          const actualUnitPrice = rawTotal / rawQty;

          return {
            _id: generateItemId(),
            name: item.description || `بند ${index + 1}`,
            price: rawTotal.toString(),
            qty: rawQty.toString(),
            unit: item.unit || 'حبة',
            unitPrice: actualUnitPrice.toFixed(3).replace(/\.?0+$/, ''),
            category: item.category || 'أخرى',
          };
        });
        setStoreName('نص مصروفات');
      }
      setEditableItems(items);
      
      const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
      speakReceiptSummary(totalAmount, items.length, result.store || undefined).catch(() => {});
    }
  }, [result, mode]);

  // ====== Actions ======

  const analyzeImage = async (uri: string, base64: string | undefined) => {
    if (!base64) {
      showSnack('فشلت القراءة، حاول مرة أخرى', 'error');
      return;
    }

    const uid = auth.currentUser?.uid;
    if (uid) {
      const quota = await checkAndIncrementDailyQuota(uid, 'receipt');
      if (!quota.allowed) {
        showQuotaAlert(router, 'daily_receipt');
        return;
      }
    }

    setOptimizing(true);
    let optimizedBase64s: string[];
    try {
      optimizedBase64s = await optimizeImage(uri);
      setImageSize(getImageSize(optimizedBase64s[0]));
    } catch {
      optimizedBase64s = [base64.replace(/^data:image\/\w+;base64,/, '')];
    } finally {
      setOptimizing(false);
    }

    setLoading(true);
    try {
      const data = await aiManager.analyzeReceipt(optimizedBase64s);
      setResult(data);
      
      // Deduct trial usage after successful analysis
      if (uid) {
        await recordUsage(uid, 'scan');
      }
    } catch (e: any) {
      showSnack('فشلت القراءة، حاول مرة أخرى', 'error');
      resetAllState();
    } finally {
      setLoading(false);
    }
  };

  const pickFromGallery = async () => {
    if (isAnalyzing.current) return;

    // Scan Gate
    const uid = auth.currentUser?.uid;
    if (uid) {
      const access = await checkAccess(uid, 'scan');
      if (!access.allowed) {
        showQuotaAlert(router);
        return;
      }
    }

    isAnalyzing.current = true;
    resetAllState();

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });
    if (!res.canceled && res.assets?.length > 0) {
      const asset = res.assets[0];
      setImage(asset.uri);
      const cleanBase64 = asset.base64?.replace(/^data:image\/\w+;base64,/, '');
      await analyzeImage(asset.uri, cleanBase64);
    }
    isAnalyzing.current = false;
  };

  const pickFromCamera = async () => {
    if (isAnalyzing.current) return;

    // Scan Gate
    const uid = auth.currentUser?.uid;
    if (uid) {
      const access = await checkAccess(uid, 'scan');
      if (!access.allowed) {
        showQuotaAlert(router);
        return;
      }
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showSnack('يرجى منح إذن الكاميرا من إعدادات الجهاز', 'error');
      return;
    }

    isAnalyzing.current = true;
    resetAllState();

    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });
    if (!res.canceled && res.assets?.length > 0) {
      const asset = res.assets[0];
      setImage(asset.uri);
      const cleanBase64 = asset.base64?.replace(/^data:image\/\w+;base64,/, '');
      await analyzeImage(asset.uri, cleanBase64);
    }
    isAnalyzing.current = false;
  };

  const handleAnalyzeText = async () => {
    if (!expenseText.trim()) {
      showSnack('الرجاء إدخال نص المصروفات', 'error');
      return;
    }

    const uid = auth.currentUser?.uid;
    if (uid) {
      const quota = await checkAndIncrementDailyQuota(uid, 'receipt');
      if (!quota.allowed) {
        showQuotaAlert(router, 'daily_receipt');
        return;
      }
    }

    setLoading(true);
    try {
      const data = await aiManager.analyzeText(expenseText);
      setResult(data);
      if (uid) {
        await recordUsage(uid, 'scan');
      }
    } catch (e: any) {
      showSnack('فشل تحليل النص، حاول مرة أخرى', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateItem = useCallback((index: number, field: keyof EditableItem, value: string) => {
    setEditableItems(prev => {
      const newItems = [...prev];
      const item = { ...newItems[index], [field]: value };
      
      const qty = parseFloat(item.qty) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const price = parseFloat(item.price) || 0;

      if (field === 'qty' || field === 'unitPrice') {
        if (qty > 0 && unitPrice > 0) item.price = (qty * unitPrice).toFixed(3);
      } else if (field === 'price') {
        if (qty > 0) item.unitPrice = (price / qty).toFixed(3);
        else if (unitPrice > 0) item.qty = (price / unitPrice).toFixed(3);
      }

      newItems[index] = item;
      return newItems;
    });
  }, []);

  const handleSplitItem = useCallback((index: number, parts: number) => {
    if (parts < 2) return;
    setEditableItems(prev => {
      const newItems = [...prev];
      const item = { ...newItems[index] };
      const currentQty = parseFloat(item.qty) || 1;
      const currentPrice = parseFloat(item.price) || 0;
      item.qty = (currentQty * parts).toString();
      if (currentPrice > 0) item.unitPrice = (currentPrice / parseFloat(item.qty)).toFixed(3);
      newItems[index] = item;
      return newItems;
    });
  }, []);

  const handleSaveAll = async () => {
    if (editableItems.length === 0 || isSaving.current) return;

    // 🛑 الجدار الأمني: منع الحفظ إذا كان هناك أسماء فارغة
    const hasEmptyNames = editableItems.some(item => !item.name || item.name.trim() === '' || item.name === 'null');
    if (hasEmptyNames) {
      showSnack('يجب كتابة اسم واضح لجميع الأصناف قبل الحفظ', 'error');
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    isSaving.current = true;
    setLoading(true);
    try {
      const batch = editableItems.map(item => ({
        name: item.name,
        price: parseFloat(item.price) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        quantity: parseFloat(item.qty) || 1,
        unit: normalizeUnit(item.unit), // 👈 توحيد الوحدة هنا قبل الحفظ
        category: item.category || 'أخرى',
        store: storeName || 'محل غير معروف',
        date: receiptDate || new Date().toISOString().split('T')[0],
        userId: uid,
        isVerified: true, // 🛡️ تم التحقق منها عبر الذكاء الاصطناعي
      }));

      await addPurchasesBatch(uid, batch);
      showSnack('تم حفظ المشتريات بنجاح ✅');
      resetAllState();
    } catch (e: any) {
      showSnack('فشل حفظ المشتريات: ' + e.message, 'error');
    } finally {
      setLoading(false);
      isSaving.current = false;
    }
  };

  return {
    mode, setMode,
    image, imageSize,
    expenseText, setExpenseText,
    loading, optimizing,
    validationIssues, validationSummary, validationVisible,
    editableItems, receiptDate, setReceiptDate, storeName, setStoreName,
    snack, hideSnack,
    actions: {
      pickFromGallery,
      pickFromCamera,
      handleAnalyzeText,
      updateItem,
      handleSplitItem,
      handleSaveAll,
      handleCancel: resetAllState
    }
  };
};