import { Alert, Platform } from 'react-native';
import { doc, getDoc, increment, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// 🛡️ دالة مساعدة لإظهار تنبيه متوافق مع الويب
export const showQuotaAlert = (router: any, type: 'trial' | 'daily_receipt' | 'daily_cop' = 'trial') => {
  const title = 'تنبيه 🚨';
  let message = 'لقد انتهى رصيدك المجاني! يرجى الترقية للنسخة برو للاستمرار في استخدام هذه الميزة.';
  
  if (type === 'daily_receipt') {
    message = 'وصلت للحد اليومي للمسح الذكي (5/5). يرجى إدخال الفاتورة يدوياً اليوم أو المحاولة غداً.';
  } else if (type === 'daily_cop') {
    message = '👮‍♂️ يا مواطن، راجعت ميزانيتك بما فيه الكفاية اليوم! طبّق النصائح اللي قلتلك عليها، وسكر محفظتك، وراجعني بكرة!';
  }

  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (type === 'trial') router.push('/upgrade');
  } else {
    const buttons = [{ text: 'حسناً', style: 'cancel' as any }];
    if (type === 'trial') buttons.push({ text: 'ترقية الآن', onPress: () => router.push('/upgrade') } as any);
    
    Alert.alert(title, message, buttons);
  }
};

/**
 * 🛡️ حارس الكوتا اليومية (للمشتركين والمجانيين)
 * يحمي الـ API من الاستهلاك المفرط
 */
export const checkAndIncrementDailyQuota = async (userId: string, feature: 'receipt' | 'cop'): Promise<{ allowed: boolean; count?: number }> => {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  const today = new Date().toISOString().split('T')[0];
  const limit = feature === 'receipt' ? 5 : 3;

  if (userSnap.exists()) {
    const data = userSnap.data();
    let usage = data.dailyUsage || { date: today, receiptCount: 0, copCount: 0 };

    // إذا تغير اليوم، نصفر العدادات
    if (usage.date !== today) {
      usage = { date: today, receiptCount: 0, copCount: 0 };
    }

    const currentCount = feature === 'receipt' ? (usage.receiptCount || 0) : (usage.copCount || 0);

    if (currentCount >= limit) {
      return { allowed: false, count: currentCount };
    }

    // زيادة العداد وحفظه
    const fieldToUpdate = feature === 'receipt' ? 'dailyUsage.receiptCount' : 'dailyUsage.copCount';
    await updateDoc(userRef, {
      'dailyUsage.date': today,
      [fieldToUpdate]: increment(1)
    });

    return { allowed: true, count: currentCount + 1 };
  }

  return { allowed: false };
};

// 1. دالة تزرع العداد والقيود أول ما المستخدم يسجل حساب جديد
export const initializeUserTrial = async (userId: string) => {
  const userRef = doc(db, "users", userId);
  const now = new Date();
  const trialEndDate = new Date();
  trialEndDate.setDate(now.getDate() + 14); // 14 يوم فترة تجريبية

  await setDoc(userRef, {
    isSubscribed: false,
    trialEndDate: trialEndDate.toISOString(),
    scansUsed: 0,
    questionsUsed: 0,
    // حدود كريمة لبناء عادة يومية خلال فترة التجربة
    scanLimit: 15,
    questionLimit: 15,
    createdAt: serverTimestamp()
  }, { merge: true });
};

// 2. دالة الفحص (المصيدة اللي تمنعه لو كمل رصيده)
export const checkAccess = async (userId: string, actionType: 'scan' | 'question') => {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();

    // 🛡️ المشترك برو عنده وصول غير محدود
    if (data.isSubscribed) return { allowed: true, reason: 'subscribed' };

    // ⏳ فحص انتهاء الفترة التجريبية (14 يوم)
    const today = new Date();
    const trialEnd = new Date(data.trialEndDate);
    if (today > trialEnd) return { allowed: false, reason: 'trial_expired' };

    // 📊 فحص استهلاك الكوتا (ديناميكي من الوثيقة)
    const limit = actionType === 'scan' ? (data.scanLimit || 15) : (data.questionLimit || 15);
    const used = actionType === 'scan' ? (data.scansUsed || 0) : (data.questionsUsed || 0);

    if (used >= limit) {
      return { allowed: false, reason: `${actionType}s_limit_reached` };
    }

    return { allowed: true, reason: 'trial_active' };
  }
  return { allowed: false, reason: 'user_not_found' };
};

// 3. دالة الخصم (تنقص من رصيده بعد كل عملية ناجحة)
export const recordUsage = async (userId: string, actionType: 'scan' | 'question') => {
  const userRef = doc(db, "users", userId);
  const fieldToUpdate = actionType === 'scan' ? 'scansUsed' : 'questionsUsed';

  await updateDoc(userRef, {
    [fieldToUpdate]: increment(1)
  });
};