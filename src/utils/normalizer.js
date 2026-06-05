/**
 * محرك معالجة النصوص المركزي - Masrofati Normalizer
 * يقوم هذا الملف بتوحيد أسماء المنتجات لضمان دقة تحليل البيانات والبحث
 */

// ====== قاموس التصحيح الإملائي وتوحيد المصطلحات (موسع) ======
const SPELLING_DICTIONARY = {
  // المترادفات الليبية
  'بندوره': 'طماطم',
  'مطيشه': 'طماطم',
  'دحي': 'بيض',
  'خبزه': 'خبز',
  'مكرونه': 'مكرونة',
  'مايه': 'ماء',
  'مويه': 'ماء',
  'مياه': 'ماء',
  'اميه': 'ماء',
  'شاهي': 'شاي',
  'لحمه': 'لحم',
  'فراخ': 'دجاج',
  'رز': 'أرز',
  'قهوه': 'قهوة',
  'طماطم حكه': 'طماطم معجون',
  'دحيه': 'بيض',
  
  // جذور مركبة يجب الحفاظ عليها كقطعة واحدة
  'زيت زيتون': 'زيت زيتون',
  'زيت ذره': 'زيت ذرة',
  'زيت عباد': 'زيت دوار الشمس',
  'معجون اسنان': 'معجون أسنان',
  'ورق حمام': 'ورق تواليت',
  'مناديل مبلله': 'مناديل مبللة',
  'زيت محرك': 'زيت سيارة',

  // تأكيد الجذور الأساسية
  'حليب': 'حليب',
  'لبن': 'لبن',
  'زبادي': 'زبادي',
  'تونة': 'تونة',
  'تونه': 'تونة',
  'سردين': 'سردين',
  'عصير': 'عصير',
  'بسكويت': 'بسكويت',
  'صابون': 'صابون',
  'شامبو': 'شامبو',
};

/**
 * تنظيف وتنسيق النص العربي
 * @param {string} text - النص المراد تنسيقه
 * @returns {string} النص المنسق
 */
export const normalizeName = (text) => {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, '') // إزالة الحركات
    .replace(/[إأآا]/g, 'ا') // توحيد الألفات
    .replace(/[ىي]/g, 'ي') // توحيد الياء
    .replace(/[ؤو]/g, 'و') // توحيد الواو
    .replace(/[ئ]/g, 'ي') // توحيد الهمزة على النبرة
    .replace(/[ة]/g, 'ه') // توحيد التاء المربوطة والهاء
    .replace(/[^\w\s\u0600-\u06FF]/g, '') // إزالة الرموز
    .replace(/\s+/g, ' ')
    .trim();

  // 1. إزالة الكلمات الشائعة (Stop words)
  const stopWords = ['ال', 'ب', 'ل', 'عن', 'من', 'في', 'متاع', 'امتاع'];
  
  // 2. إزالة العبوات والمقاييس (Packages & Metrics) - درع الحماية الليبي!
  const containers = ['باكو', 'حكه', 'شيشه', 'فازو', 'كيس', 'شكاره', 'ستيكه', 'صندوق', 'طرف', 'قطعه', 'كيلو', 'نص', 'ربع', 'لتر', 'غرام', 'جرام', 'ملي'];

  return cleaned
    .split(' ')
    .filter(word => !stopWords.includes(word) && !containers.includes(word))
    .map(word => word.startsWith('ال') ? word.substring(2) : word)
    .join(' ')
    .trim();
};

/**
 * استخراج الاسم الجذري (الأساسي) للمنتج
 * @param {string} name - اسم المنتج
 * @returns {string} الاسم الجذري
 */
export const getRootName = (name) => {
  if (!name) return '';
  const normalized = normalizeName(name);

  // 1. البحث عن الكلمة المفتاحية في قاموس المصطلحات
  for (const key of Object.keys(SPELLING_DICTIONARY)) {
    if (normalized.includes(key)) {
      return SPELLING_DICTIONARY[key];
    }
  }

  // 2. إذا لم نجد في القاموس، نأخذ أول كلمة (التي أصبحت نظيفة من العبوات)
  return normalized.split(' ')[0] || normalized;
};

/**
 * تصحيح الإملاء وتوحيد المسميات
 * @param {string} name - اسم المنتج
 * @returns {string} الاسم المصحح
 */
export const correctSpelling = (name) => {
  if (!name) return '';
  const normalized = normalizeName(name);
  
  if (SPELLING_DICTIONARY[normalized]) {
    return SPELLING_DICTIONARY[normalized];
  }

  for (const [key, value] of Object.entries(SPELLING_DICTIONARY)) {
    if (normalized === key) return value;
  }

  return name.trim();
};

export const getProductKey = (name) => {
  const corrected = correctSpelling(name);
  return normalizeName(corrected);
};

export const formatDisplayLabel = (name) => {
  if (!name) return '';
  return name.trim().replace(/\s+/g, ' ');
};