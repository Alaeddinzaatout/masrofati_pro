import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ShoppingItem } from '../types';

const COLLECTION_NAME = 'shoppingLists';

/**
 * إضافة صنف لقائمة التسوق
 */
export const addShoppingItem = async (userId: string, item: Partial<ShoppingItem>): Promise<string | null> => {
  if (!userId) return null;

  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...item,
    userId,
    name: item.name || 'صنف جديد', // 🛡️ حماية من الأسماء الفارغة
    quantity: Number(item.quantity) || 1, // 🛡️ تحويل إجباري لرقم
    checked: item.checked || false,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
};

/**
 * تحديث صنف
 */
export const updateShoppingItem = async (itemId: string, updates: Partial<ShoppingItem>): Promise<void> => {
  if (!itemId) return;
  const docRef = doc(db, COLLECTION_NAME, itemId);
  await updateDoc(docRef, updates);
};

/**
 * حذف صنف
 */
export const deleteShoppingItem = async (itemId: string): Promise<void> => {
  if (!itemId) return;
  await deleteDoc(doc(db, COLLECTION_NAME, itemId));
};

/**
 * مسح جميع الأصناف المشتراة (مصفحة بنظام Batch)
 */
export const clearCompletedItems = async (items: ShoppingItem[]): Promise<void> => {
  const completed = items.filter(i => i.checked && i.id);
  if (completed.length === 0) return;

  const CHUNK_SIZE = 450; // 🛡️ حماية من حد الـ 500 عملية في الفايربيس
  
  for (let i = 0; i < completed.length; i += CHUNK_SIZE) {
    const chunk = completed.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    
    chunk.forEach(item => {
      const docRef = doc(db, COLLECTION_NAME, item.id);
      batch.delete(docRef);
    });
    
    await batch.commit();
  }
};

/**
 * الاستماع لتغيرات قائمة التسوق في الوقت الفعلي
 */
export const listenToShoppingList = (userId: string, callback: (data: ShoppingItem[]) => void) => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, COLLECTION_NAME), 
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(docSnapshot => ({ 
      id: docSnapshot.id, 
      ...docSnapshot.data() 
    } as ShoppingItem));
    
    // 🛡️ فرز آمن: حماية من الأصناف اللي انكتبت قبل إضافة ميزة الـ createdAt
    data.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    
    callback(data);
  }, (error) => {
    console.error("Shopping list listen error:", error);
  });
};