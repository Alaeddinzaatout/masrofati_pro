// خدمة تسجيل أخطاء بسيطة
// في وضع الإنتاج، يمكن إرسال الأخطاء إلى خادم خارجي

const isProduction = process.env.NODE_ENV === 'production';

export const logError = (module: string, error: unknown, extra?: Record<string, unknown>) => {
  if (isProduction) {
    // في وضع الإنتاج، يمكن إرسال الخطأ إلى خدمة مراقبة مثل Sentry
    // console.log هي للتوضيح فقط، يمكن استبدالها
    console.log(`[${module}]`, error, extra);
  } else {
    console.error(`[${module}]`, error, extra);
  }
};