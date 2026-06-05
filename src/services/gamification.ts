import AsyncStorage from '@react-native-async-storage/async-storage';
import { Badge } from '../types';

const BADGES_KEY = 'user-badges';
const SAVINGS_KEY = 'total-savings';
const STATS_KEY = 'user-stats';

export interface UserStats {
  comparisons: number;
  purchases: number;
  reports: number;
  receipts: number;
  shoppingLists: number;
  wastePercent: number;
  predictions: number;
  [key: string]: number; // للسماح بالتحديث الديناميكي
}

/**
 * تعريف وسام داخلي مع شرط التحقق وحساب نسبة التقدم
 */
export interface BadgeDefinition extends Omit<Badge, 'earned' | 'earnedAt' | 'progress'> {
  condition: (savings: number, stats: UserStats) => boolean;
  calculateProgress: (savings: number, stats: UserStats) => number; // 🌟 إضافة دالة حساب التقدم
}

/**
 * قائمة الأوسمة المتاحة (مع حساب التقدم الدقيق لكل وسام)
 */
export const ALL_BADGES: BadgeDefinition[] = [
  {
    id: 'first_saving',
    title: 'الموفر الذكي 🏅',
    description: 'وفرت أول 10 دنانير في مشترياتك!',
    icon: '🏅',
    condition: (savings) => savings >= 10,
    calculateProgress: (savings) => Math.min(100, (savings / 10) * 100),
  },
  {
    id: 'saving_50',
    title: 'المدخر المحترف 💎',
    description: 'وفرت 50 دينار بفضل مقارنة الأسعار!',
    icon: '💎',
    condition: (savings) => savings >= 50,
    calculateProgress: (savings) => Math.min(100, (savings / 50) * 100),
  },
  {
    id: 'saving_100',
    title: 'تاجر الأسواق 🏆',
    description: 'وفرت 100 دينار! أنت تعرف وين تشري!',
    icon: '🏆',
    condition: (savings) => savings >= 100,
    calculateProgress: (savings) => Math.min(100, (savings / 100) * 100),
  },
  {
    id: 'price_hunter',
    title: 'صائد الأسعار 🎯',
    description: 'قارنت أسعار 10 أصناف مختلفة',
    icon: '🎯',
    condition: (_, stats) => (stats?.comparisons || 0) >= 10,
    calculateProgress: (_, stats) => Math.min(100, ((stats?.comparisons || 0) / 10) * 100),
  },
  {
    id: 'regular',
    title: 'المتابع المخلص 📊',
    description: 'سجلت 50 عملية شراء في التطبيق',
    icon: '📊',
    condition: (_, stats) => (stats?.purchases || 0) >= 50,
    calculateProgress: (_, stats) => Math.min(100, ((stats?.purchases || 0) / 50) * 100),
  },
  {
    id: 'analyst',
    title: 'محلل المصروفات 📈',
    description: 'استخدمت التقارير 20 مرة',
    icon: '📈',
    condition: (_, stats) => (stats?.reports || 0) >= 20,
    calculateProgress: (_, stats) => Math.min(100, ((stats?.reports || 0) / 20) * 100),
  },
  {
    id: 'receipt_master',
    title: 'سيد الإيصالات 📸',
    description: 'صورت وحللت 30 إيصال',
    icon: '📸',
    condition: (_, stats) => (stats?.receipts || 0) >= 30,
    calculateProgress: (_, stats) => Math.min(100, ((stats?.receipts || 0) / 30) * 100),
  },
  {
    id: 'shopping_list',
    title: 'منظم التسوق 🛒',
    description: 'استخدمت قائمة التسوق 10 مرات',
    icon: '🛒',
    condition: (_, stats) => (stats?.shoppingLists || 0) >= 10,
    calculateProgress: (_, stats) => Math.min(100, ((stats?.shoppingLists || 0) / 10) * 100),
  },
  {
    id: 'waste_warrior',
    title: 'محارب الهدر ♻️',
    description: 'نسبة الهدر أقل من 20%',
    icon: '♻️',
    condition: (_, stats) => (stats?.wastePercent || 100) <= 20,
    // الهدر يبدأ من 100 وينزل، كل ما ينزل تزيد النسبة للوسام
    calculateProgress: (_, stats) => {
      const currentWaste = stats?.wastePercent || 100;
      if (currentWaste <= 20) return 100;
      return Math.max(0, 100 - currentWaste); 
    },
  },
  {
    id: 'prediction_master',
    title: 'العراف 🔮',
    description: 'استخدمت توقعات الذكاء الاصطناعي 5 مرات',
    icon: '🔮',
    condition: (_, stats) => (stats?.predictions || 0) >= 5,
    calculateProgress: (_, stats) => Math.min(100, ((stats?.predictions || 0) / 5) * 100),
  },
];

/**
 * جلب الأوسمة الحالية للمستخدم من الذاكرة المحلية
 */
export const getUserBadges = async (): Promise<any[]> => {
  try {
    const data = await AsyncStorage.getItem(BADGES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

/**
 * جلب إجمالي التوفير
 */
export const getTotalSavings = async (): Promise<number> => {
  try {
    const data = await AsyncStorage.getItem(SAVINGS_KEY);
    return data ? parseFloat(data) : 0;
  } catch {
    return 0;
  }
};

/**
 * إضافة مبلغ توفير
 */
export const addSavings = async (amount: number): Promise<number> => {
  const current = await getTotalSavings();
  const newTotal = current + amount;
  await AsyncStorage.setItem(SAVINGS_KEY, newTotal.toString());
  return newTotal;
};

/**
 * جلب إحصائيات المستخدم
 */
export const getUserStats = async (): Promise<UserStats> => {
  const defaultStats: UserStats = {
    comparisons: 0,
    purchases: 0,
    reports: 0,
    receipts: 0,
    shoppingLists: 0,
    wastePercent: 100,
    predictions: 0,
  };
  try {
    const data = await AsyncStorage.getItem(STATS_KEY);
    return data ? JSON.parse(data) : defaultStats;
  } catch {
    return defaultStats;
  }
};

/**
 * تحديث إحصائية معينة
 */
export const updateStat = async (key: keyof UserStats, increment = 1): Promise<UserStats> => {
  const stats = await getUserStats();
  stats[key] = (Number(stats[key]) || 0) + increment;
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  return stats;
};

/**
 * التحقق من الأوسمة الجديدة ومنحها
 */
export const checkAndAwardBadges = async (): Promise<Badge[]> => {
  const savings = await getTotalSavings();
  const stats = await getUserStats();
  const currentBadges = await getUserBadges();
  const currentIds = new Set(currentBadges.map(b => b.id));

  const newBadges: Badge[] = [];

  for (const badge of ALL_BADGES) {
    if (!currentIds.has(badge.id) && badge.condition(savings, stats)) {
      newBadges.push({
        ...badge,
        earned: true,
        earnedAt: new Date().toISOString(),
        progress: 100,
      });
    }
  }

  if (newBadges.length > 0) {
    const updated = [...currentBadges, ...newBadges];
    await AsyncStorage.setItem(BADGES_KEY, JSON.stringify(updated));
  }

  return newBadges;
};

/**
 * الحصول على كافة الأوسمة مع حالة كل منها (للعرض في الواجهة)
 */
export const getAllBadgesWithStatus = async (): Promise<Badge[]> => {
  const savings = await getTotalSavings();
  const stats = await getUserStats();
  const userBadges = await getUserBadges();
  const userBadgeMap = new Map(userBadges.map(b => [b.id, b]));

  return ALL_BADGES.map(badge => {
    const userBadge = userBadgeMap.get(badge.id);
    const isEarned = !!userBadge;
    return {
      ...badge,
      earned: isEarned,
      earnedAt: userBadge?.earnedAt || null,
      // 🌟 تشغيل محرك حساب النسبة المئوية الحقيقي
      progress: isEarned ? 100 : badge.calculateProgress(savings, stats), 
    };
  });
};