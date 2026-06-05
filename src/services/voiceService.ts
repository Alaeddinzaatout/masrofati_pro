import * as Speech from 'expo-speech';

/**
 * ============================================================================
 * VOICE SERVICE - MASROFATI (ADVANCED VERSION)
 * ============================================================================
 * هذا الكود مصمم ليكون محركاً صوتياً متكاملاً يدعم الأرقام الكبيرة،
 * اللهجة الليبية، ونظام إدارة الطوابير الصوتية لضمان تجربة مستخدم سلسة.
 * ============================================================================
 */

// ====== أنواع البيانات (Types) ======
type Language = 'ar' | 'en';
type DialectMode = 'formal' | 'libyan';

interface SpeechRequest {
  text: string;
  options?: Speech.SpeechOptions;
  onDone?: () => void;
}

// ====== المحرك الصوتي (Voice Queue Manager) ======
/**
 * كلاس لإدارة طابور النطق لمنع تداخل الأصوات وضمان تسلسل الجمل
 */
class VoiceQueue {
  private queue: SpeechRequest[] = [];
  private isSpeaking: boolean = false;

  async add(text: string, options?: Speech.SpeechOptions) {
    return new Promise<void>((resolve) => {
      this.queue.push({
        text,
        options,
        onDone: () => resolve(),
      });
      this.process();
    });
  }

  private async process() {
    if (this.isSpeaking || this.queue.length === 0) return;

    this.isSpeaking = true;
    const current = this.queue.shift();

    if (current) {
      try {
        await Speech.speak(current.text, {
          ...current.options,
          onDone: () => {
            this.isSpeaking = false;
            if (current.onDone) current.onDone();
            this.process();
          },
          onError: (error) => {
            console.warn('Speech Queue Error:', error);
            this.isSpeaking = false;
            if (current.onDone) current.onDone();
            this.process();
          },
        });
      } catch (e) {
        this.isSpeaking = false;
        this.process();
      }
    }
  }

  async stop() {
    this.queue = [];
    this.isSpeaking = false;
    await Speech.stop();
  }
}

const voiceQueue = new VoiceQueue();

// ====== خوارزمية تفنيط الأرقام العربية (Arabic Number to Words) ======
/**
 * تحويل الأرقام إلى نطق عربي فصيح ودقيق (يدعم حتى الملايين)
 */
const arabicNumberToWords = (num: number): string => {
  if (num === 0) return 'صفر';

  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];

  const processThousands = (n: number): string => {
    if (n === 0) return '';
    if (n === 1) return 'ألف';
    if (n === 2) return 'ألفان';
    if (n >= 3 && n <= 10) return processHundreds(n) + ' آلاف';
    return processHundreds(n) + ' ألفاً';
  };

  const processMillions = (n: number): string => {
    if (n === 0) return '';
    if (n === 1) return 'مليون';
    if (n === 2) return 'مليونان';
    if (n >= 3 && n <= 10) return processHundreds(n) + ' ملايين';
    return processHundreds(n) + ' مليوناً';
  };

  const processHundreds = (n: number): string => {
    if (n === 0) return '';
    let result = '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (h > 0) result += hundreds[h];

    if (t === 0 && u === 0) return result;
    if (result !== '') result += ' و';

    if (t === 0) result += units[u];
    else if (t === 1) {
      if (u === 0) result += 'عشرة';
      else if (u === 1) result += 'أحد عشر';
      else if (u === 2) result += 'اثنا عشر';
      else result += units[u] + ' عشر';
    } else {
      if (u > 0) result += units[u] + ' و' + tens[t];
      else result += tens[t];
    }
    return result;
  };

  let final = '';
  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  if (millions > 0) final += processMillions(millions);
  if (thousands > 0) {
    if (final !== '') final += ' و';
    final += processThousands(thousands);
  }
  if (remainder > 0) {
    if (final !== '') final += ' و';
    final += processHundreds(remainder);
  }

  return final.trim();
};

// ====== دوال المساعدة (Utilities) ======

/**
 * كشف اللغة تلقائياً
 */
const detectLanguage = (text: string): Language => {
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text) ? 'ar' : 'en';
};

/**
 * تنسيق المبلغ للنطق بالدينار والمليم (دقة ليبية)
 */
const formatAmountForSpeech = (amount: number): string => {
  const dinars = Math.floor(amount);
  const millims = Math.round((amount - dinars) * 1000);

  let result = '';

  // نطق الدنانير
  if (dinars === 0) {
    result = 'صفر دينار';
  } else if (dinars === 1) {
    result = 'دينار واحد';
  } else if (dinars === 2) {
    result = 'ديناران';
  } else if (dinars >= 3 && dinars <= 10) {
    result = `${arabicNumberToWords(dinars)} دنانير`;
  } else {
    result = `${arabicNumberToWords(dinars)} ديناراً`;
  }

  // نطق المليمات
  if (millims > 0) {
    result += ' و';
    if (millims === 1) result += ' مليم واحد';
    else if (millims === 2) result += ' مليمان';
    else if (millims >= 3 && millims <= 10) result += ` ${arabicNumberToWords(millims)} مليمات`;
    else result += ` ${arabicNumberToWords(millims)} مليم`;
  }

  return result;
};

/**
 * قواميس اللهجة الليبية للحالات المختلفة
 */
const LIBYAN_PHRASES = {
  success: [
    'تم الحفظ يا غالي، أمورك في السليم.',
    'سجلتها لك، مية مية.',
    'تم، ربي يبارك لك في مالك.',
  ],
  warning: [
    'رد بالك، الصنف هذا سعره زاد شوية.',
    'راهو ميزانيتك قربت تشطب، وسع بالك.',
    'الحاجة هذه غالية شوية اليوم، راجع حساباتك.',
  ],
  welcome: [
    'مرحبتين بيك في مصروفاتي، كيف نقدر نساعدك اليوم؟',
    'أهلاً بيك، إن شاء الله يومك مبارك.',
  ]
};

const getRandomPhrase = (category: keyof typeof LIBYAN_PHRASES): string => {
  const phrases = LIBYAN_PHRASES[category];
  return phrases[Math.floor(Math.random() * phrases.length)];
};

// ====== الوظائف الأساسية المصدرة (Public API) ======

/**
 * نطق نص عام مع دعم الطابور والذكاء في اللغة
 */
export const speakText = async (
  text: string,
  options?: {
    pitch?: number;
    rate?: number;
    language?: string;
    useQueue?: boolean;
  }
): Promise<void> => {
  if (!text || text.trim().length === 0) return;

  const language = options?.language || detectLanguage(text);
  const speechOptions: Speech.SpeechOptions = {
    language: language === 'ar' ? 'ar' : 'en',
    pitch: options?.pitch ?? 1.0,
    rate: options?.rate ?? 0.9, // إبطاء خفيف لزيادة الوضوح
  };

  if (options?.useQueue !== false) {
    await voiceQueue.add(text, speechOptions);
  } else {
    await Speech.stop();
    await Speech.speak(text, speechOptions);
  }
};

/**
 * نطق ملخص تحليل الفاتورة (احترافي جداً)
 */
export const speakReceiptSummary = async (
  totalAmount: number,
  itemCount: number,
  storeName?: string,
  mode: DialectMode = 'libyan'
): Promise<void> => {
  let message = '';

  if (mode === 'libyan') {
    const welcome = getRandomPhrase('success');
    message = `${welcome} `;
    if (storeName && storeName !== 'نص مصروفات') {
      message += `شريت من ${storeName}. `;
    }
    message += `الحساب طلع ${formatAmountForSpeech(totalAmount)}. `;
    message += `وعندك ${itemCount} صنف في القائمة.`;
  } else {
    message = `تم تحليل الفاتورة بنجاح. `;
    if (storeName) message += `المتجر هو ${storeName}. `;
    message += `المبلغ الإجمالي هو ${formatAmountForSpeech(totalAmount)}. `;
    message += `عدد العناصر المستخرجة هو ${itemCount}.`;
  }

  await speakText(message, { useQueue: true });
};

/**
 * نطق رسائل النجاح أو التنبيه بالليبي
 */
export const speakNotification = async (
  type: 'success' | 'warning',
  customMessage?: string
): Promise<void> => {
  const message = customMessage || getRandomPhrase(type);
  await speakText(message, { 
    pitch: type === 'warning' ? 0.8 : 1.0, 
    rate: type === 'warning' ? 0.85 : 0.95 
  });
};

/**
 * نطق حالة الميزانية
 */
export const speakBudgetStatus = async (
  remaining: number,
  isExceeded: boolean
): Promise<void> => {
  let message = '';
  if (isExceeded) {
    message = `يا غالي، راهو ميزانيتك فاتت الحد بـ ${formatAmountForSpeech(Math.abs(remaining))}. لازم تنقص شوية.`;
  } else {
    message = `مازال عندك في ميزانيتك ${formatAmountForSpeech(remaining)}. أمورك طيبة.`;
  }
  await speakText(message);
};

/**
 * إيقاف المحرك الصوتي فوراً
 */
export const stopSpeaking = async (): Promise<void> => {
  await voiceQueue.stop();
};
