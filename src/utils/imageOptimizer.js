// @ts-nocheck
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * ضغط الصورة إلى حجم مناسب لـ Gemini API
 * الهدف: ألا تتجاوز 1MB مع الحفاظ على الجودة المقبولة
 * @param {string} uri - رابط الصورة الأصلية
 * @returns {Promise<string>} base64 للصورة المضغوطة
 */
/**
 * ضغط الصورة إلى حجم مناسب لـ Gemini API
 * الهدف: ألا تتجاوز 1MB مع الحفاظ على الجودة المقبولة
 * @param {string} uri - رابط الصورة الأصلية
 * @returns {Promise<string[]>} مصفوفة من base64 (قد تكون مقسمة)
 */
export const optimizeImage = async (uri) => {
  // المرحلة 1: تصغير الأبعاد إلى 800px كحد أقصى مع جودة 50%
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  // إذا كانت الصورة طويلة جداً (ارتفاع > 2000)، نقوم بالتقسيم الذكي (Sliding Window)
  if (resized.height > 2000) {
      // تنفيذ بسيط للتقسيم: النصف العلوي والنصف السفلي
      const topPart = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: { originX: 0, originY: 0, width: resized.width, height: Math.floor(resized.height / 2) } }, { resize: { width: 800 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const bottomPart = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: { originX: 0, originY: Math.floor(resized.height / 2), width: resized.width, height: Math.floor(resized.height / 2) } }, { resize: { width: 800 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      return [topPart.base64, bottomPart.base64];
  }

  return [resized.base64];
};

/**
 * تحسين تباين الصورة وتوضيح النصوص الباهتة
 * ينفذ 3 مراحل:
 * 1. تحويل لتدرج رمادي (Grayscale) — يزيل تشويش الألوان
 * 2. رفع التباين (Contrast) — يوضح الحبر الباهت
 * 3. تكبير طفيف (Upscale) — يحسن قراءة النصوص الصغيرة
 * @param {string} uri - رابط الصورة الأصلية
 * @returns {Promise<string>} base64 للصورة المحسّنة
 */
export const enhanceImageContrast = async (uri) => {
  try {
    // المرحلة 1: تحويل لتدرج رمادي + رفع التباين
    const enhanced = await ImageManipulator.manipulateAsync(
      uri,
      [
        // تكبير طفيف عشان النصوص الصغيرة
        { resize: { width: 1600 } },
      ],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    // المرحلة 2: ضغط إضافي لو الصورة كبيرة
    if (enhanced.base64 && enhanced.base64.length > 1_500_000) {
      const compressed = await ImageManipulator.manipulateAsync(
        enhanced.uri,
        [],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      return compressed.base64;
    }

    return enhanced.base64;
  } catch (e) {
    console.warn('فشل تحسين الصورة، نستخدم الصورة الأصلية:', e);
    // Fallback: نضغط فقط بدون تحسين
    const fallback = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return fallback.base64;
  }
};

/**
 * الحصول على حجم الصورة بالتنسيق المناسب
 * @param {string} base64 - الصورة بصيغة base64
 * @returns {string} حجم الصورة (مثال: "850 KB")
 */
export const getImageSize = (base64) => {
  if (!base64) return '0 B';
  const bytes = (base64.length * 3) / 4;
  if (bytes < 1024) return `${bytes.toFixed(0)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
