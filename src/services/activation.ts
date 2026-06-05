import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc,
  updateDoc, 
  serverTimestamp, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Activates a license key for a user.
 * 
 * @param userId - The unique identifier of the user (Firebase Auth UID)
 * @param keyString - The activation key provided by the user
 */
export const activateLicenseKey = async (userId: string, keyString: string) => {
  try {
    const keyRef = doc(db, 'activation_keys', keyString.trim());
    const keySnap = await getDoc(keyRef);

    if (!keySnap.exists()) {
      throw new Error('مفتاح غير صحيح. يرجى التأكد من الرمز.');
    }

    const keyData = keySnap.data();

    if (keyData.is_used) {
      throw new Error('هذا المفتاح مستخدم مسبقاً.');
    }

    const durationDays = keyData.durationDays || 30;
    const now = new Date();
    const newEndDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // 1. Update the key document
    await updateDoc(keyRef, {
      is_used: true,
      used_by: userId,
      used_at: serverTimestamp(),
    });

    // 2. Update the user's subscription status
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      isSubscribed: true,
      subscriptionEndDate: newEndDate.toISOString(),
      scansUsed: 0,
      questionsUsed: 0,
      lastActivationAt: serverTimestamp(),
    }, { merge: true });

    return { success: true, endDate: newEndDate };
  } catch (error: any) {
    console.error('[Activation] Error activating license:', error);
    throw error;
  }
};
