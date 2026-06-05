// @ts-nocheck
/**
 * قاموس المصطلحات الليبية للوحدات
 * يساعد في توحيد أسماء الوحدات المختلفة
 */
export const libyanUnitAliases = {
  'كيلو': ['كيلو', 'كيلوغرام', 'kg', 'كجم', 'كيلوجرام'],
  'لتر': ['لتر', 'لترات', 'ل', 'liter', 'litre'],
  'حبة': ['حبة', 'حبات', 'واحدة', 'واحد', 'piece'],
  'ستيكة': ['ستيكة', 'ستيك', 'ستيكه', 'pack', 'package', 'باكو', 'باكيت'],
  'ربطة': ['ربطة', 'ربطه', 'ربط', 'رباط', 'bundle', 'bunch', 'حزمة', 'حزمه'],
  'صندوق': ['صندوق', 'صندق', 'box', 'carton box'],
  'كرتونة': ['كرتونة', 'كرتونه', 'كرتون', 'carton'],
  'فردة': ['فردة', 'فرده', 'فرد', 'زوج', 'pair', 'single'],
  'علبة': ['علبة', 'علبه', 'can', 'tin', 'علب'],
  'كيس': ['كيس', 'كيسة', 'كيسه', 'bag', 'كياس', 'شوال'],
  'زجاجة': ['زجاجة', 'زجاجه', 'زجاج', 'bottle', 'قنينة', 'قنينه'],
  'قطعة': ['قطعة', 'قطعه', 'قطع', 'piece'],
};

/**
 * توحيد اسم الوحدة بناءً على المصطلحات الليبية
 * @param {string} unit - اسم الوحدة المدخل
 * @returns {string} اسم الوحدة الموحد
 */
export const normalizeUnit = (unit) => {
  if (!unit) return 'حبة';
  const trimmed = unit.trim();
  for (const [standard, aliases] of Object.entries(libyanUnitAliases)) {
    if (aliases.includes(trimmed.toLowerCase())) {
      return standard;
    }
  }
  return trimmed; // إذا ما لقيناش مطابقة، نرجعه كما هو
};

/**
 * التحقق الرياضي من صحة حسابات الأصناف
 * يتأكد أن (الكمية × سعر الوحدة) يساوي (الإجمالي) مع نسبة تسامح
 * @param {Array} items - قائمة الأصناف
 * @param {Object} options - خيارات إضافية
 * @param {number} options.tolerance - نسبة التسامح (افتراضي 0.05 = 5%)
 * @returns {{valid: boolean, issues: Array, summary: string}}
 */
export const validateMath = (items, options = {}) => {
  const tolerance = options.tolerance || 0.05;
  const issues = [];

  if (!items || !Array.isArray(items) || items.length === 0) {
    return {
      valid: true,
      issues: [],
      summary: 'مافيش أصناف للتحقق منها.'
    };
  }

  items.forEach((item, index) => {
    const qty = parseFloat(item.qty || item.quantity || 0);
    const unitPrice = parseFloat(item.unitPrice || item.unit_price || 0);
    const total = parseFloat(item.total || item.amount || item.price || 0);
    const name = item.name || item.description || '';

    if (!name || name === 'null' || name.trim() === '') {
      issues.push({
        index,
        name: `بند ${index + 1}`,
        field: 'name',
        message: 'اسم الصنف غير واضح. يرجى كتابته.',
        severity: 'error',
      });
    }

    if (qty <= 0 || unitPrice <= 0 || total <= 0) {
      issues.push({
        index,
        name: name || `بند ${index + 1}`,
        field: qty <= 0 ? 'qty' : (unitPrice <= 0 ? 'unitPrice' : 'total'),
        qty,
        unitPrice,
        total,
        message: `بيانات غير مكتملة. يرجى التأكد من السعر والكمية.`,
        severity: 'error',
      });
      return;
    }

    const expectedTotal = qty * unitPrice;
    const diff = Math.abs(total - expectedTotal);
    const diffPercent = diff / Math.max(total, expectedTotal);

    if (diffPercent > tolerance) {
      issues.push({
        index,
        name: item.name || item.description || `صنف ${index + 1}`,
        qty,
        unitPrice,
        total,
        expectedTotal: parseFloat(expectedTotal.toFixed(3)),
        diff: parseFloat(diff.toFixed(3)),
        diffPercent: parseFloat((diffPercent * 100).toFixed(1)),
        message: `في تفاوت في الحسابات: الكمية (${qty}) × سعر الوحدة (${unitPrice}) = ${expectedTotal.toFixed(3)}، لكن الإجمالي المدخل = ${total.toFixed(3)} (فارق ${diffPercent > 0.5 ? 'كبير' : 'بسيط'})`,
        severity: diffPercent > 0.5 ? 'error' : 'warning',
      });
    }
  });

  const valid = issues.length === 0;
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  let summary;
  if (valid) {
    summary = '✅ كل الحسابات سليمة. مبروك!';
  } else if (errorCount > 0) {
    summary = `⚠️ فيه ${errorCount} خطأ و ${warningCount} تنبيه في الحسابات. يفضل تراجع الأصناف اللي باللون الأحمر.`;
  } else {
    summary = `🔶 فيه ${warningCount} تنبيه بسيط في الحسابات. ممكن تتجاهلها أو تعدلها.`;
  }

  return { valid, issues, summary };
};

/**
 * محاولة إصلاح الأخطاء الرياضية تلقائياً
 * @param {Array} items - قائمة الأصناف
 * @returns {Array} الأصناف بعد محاولة الإصلاح
 */
export const fixMathIssues = (items) => {
  if (!items || !Array.isArray(items)) return [];

  return items.map((item) => {
    const qty = parseFloat(item.qty || item.quantity || 1);
    const unitPrice = parseFloat(item.unitPrice || item.unit_price || 0);
    const total = parseFloat(item.total || item.amount || item.price || 0);

    if (qty <= 0 || unitPrice <= 0 || total <= 0) {
      return item; // ما نقدرش نصلحه، نرجعه كما هو
    }

    const expectedTotal = qty * unitPrice;
    const diff = Math.abs(total - expectedTotal);
    const diffPercent = diff / Math.max(total, expectedTotal);

    if (diffPercent <= 0.05) {
      // الفارق بسيط (أقل من 5%) — نصحح الإجمالي
      const fixed = { ...item };
      if (item.total !== undefined) fixed.total = parseFloat(expectedTotal.toFixed(3));
      if (item.amount !== undefined) fixed.amount = parseFloat(expectedTotal.toFixed(3));
      if (item.price !== undefined) fixed.price = parseFloat(expectedTotal.toFixed(3));
      return fixed;
    }

    if (diffPercent > 0.5 && qty > 1) {
      // الفارق كبير والكمية > 1 — ممكن المستخدم كتب الإجمالي مكان سعر الوحدة
      // نحاول: unitPrice = total / qty
      const fixed = { ...item };
      const correctedUnitPrice = total / qty;
      if (item.unitPrice !== undefined) fixed.unitPrice = parseFloat(correctedUnitPrice.toFixed(3));
      if (item.unit_price !== undefined) fixed.unit_price = parseFloat(correctedUnitPrice.toFixed(3));
      return fixed;
    }

    return item; // ما قدرناش نصلحه
  });
};

/**
 * توحيد تنسيق الأصناف من مختلف المصادر (Gemini, Cerebras)
 * @param {Array} items - قائمة الأصناف
 * @returns {Array} الأصناف بتنسيق موحد
 */
export const normalizeItems = (items) => {
  if (!items || !Array.isArray(items)) return [];

  return items.map((item) => ({
    name: item.name || item.description || '',
    qty: parseFloat(item.qty || item.quantity || 1),
    unit: normalizeUnit(item.unit || 'حبة'),
    unitPrice: parseFloat(item.unitPrice || item.unit_price || 0),
    total: parseFloat(item.total || item.amount || item.price || 0),
    category: item.category || 'أخرى',
  }));
};
