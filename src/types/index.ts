/**
 * Masrofati Unified Type System
 * نظام الأنواع الموحد - يمثل الهيكل العظمي لبيانات التطبيق
 */

// ====== 1. سجل المشتريات (Purchase) ======
export interface Purchase {
  id: string;
  userId: string;
  name: string;
  normalizedName?: string; 
  price: number; // السعر للوحدة
  quantity: number;
  totalPrice?: number; // السعر الإجمالي (اختياري حالياً)
  unit: string;
  store: string;
  category: string;
  date: string; 
  notes?: string;
  createdAt: string;
  isOnSale?: boolean;
  discountPercent?: number;
  isVerified?: boolean; // 🛡️ هل السعر موثق (من فاتورة حقيقية)
}

export interface ProductIndexDoc {
  id?: string;
  userId: string;
  productName: string;
  normalizedName: string;
  stores: string[];
  categories: string[];
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  priceTrend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

export interface ConsumptionTrackDoc {
  userId: string;
  productName: string;
  normalizedName: string;
  dailyConsumptionRate: number;
  currentStock: number;
  lastPurchaseDate: string;
  predictedRunOutDate: string;
  daysUntilRunOut: number;
  wastedSinceLast?: number;
  updatedAt: string;
}

// ====== 2. قائمة التسوق (Shopping List) ======
export interface ShoppingItem {
  id: string;
  userId: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  note?: string;
  checked: boolean;
  createdAt: string;
  suggestedByAI?: boolean;
}

export interface PriceData {
  latestPrice: number;
  averagePrice: number;
  trend: 'up' | 'down' | 'same';
  store: string;
}

// ====== 3. الميزانية والذكاء المالي (Budget & Intel) ======
export interface BudgetStats {
  budget: number;
  spent: number;
  remaining: number;
  progress: number;
  isOverBudget: boolean;
  dailyBurnRate: number;
  projectedMonthEnd: number;
  daysRemainingInMonth: number;
  safeToSpendDaily: number;
  upcomingEssentialCost: number;
}

// ====== 4. محرك التنبؤ والمخزون (Inventory Prediction) ======
export interface ConsumptionAnalysis {
  exists: boolean;
  productName: string;
  currentStock: number;
  lastQuantity: number;
  avgDailyRate: number;
  confidenceScore: number;
  isRunningLow: boolean;
  isCritical: boolean;
  daysSinceLastPurchase: number;
  daysUntilRunOut: number;
  lastPurchaseDate: string;
  seasonalMultiplier: number;
}

// ====== 5. رادار الأسعار (Price Radar) ======
export interface StorePrice {
  store: string;
  unitPrice: number;
  unit: string;
  date: string;
  savingsPercent?: number;
}

export interface StrategicPlan {
  recommendedStore: {
    name: string;
    estimatedTotal: number;
    missingItems: number;
  };
  optimizedSplit: {
    total: number;
    potentialSavings: number;
    items: Array<{
      productName: string;
      bestStore: string;
      price: number;
      total: number;
    }>;
  };
  allStoresComparison: Array<{
    name: string;
    total: number;
    missingCount: number;
  }>;
  aiStrategicSummary?: string; // 🌟 الإضافة الجديدة اللي حلت المشكلة واعتمدت الذكاء الاصطناعي
}

// ====== 6. الأوسمة والتحفيز (Gamification) ======
export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
  progress?: number;
  requirement?: number;
}

// ====== 7. تحليل الهدر (Waste Analysis) ======
export interface WasteAnalysis {
  totalPurchased: number;
  totalConsumed: number;
  totalWasted: number;
  overallWastePercent: number;
  topWastedProducts: Array<{
    name: string;
    wastePercent: number;
    amount: number;
    category: string;
  }>;
  savingsPotential: number;
  recommendations: string[];
}

// ====== 8. معالجة الإيصالات والتحقق (Receipts & Validation) ======
export interface EditableItem {
  _id: string;
  name: string;
  price: string;
  qty: string;
  unit: string;
  unitPrice: string;
  category: string;
}

export interface ValidationIssue {
  name: string;
  message: string;
  severity: 'error' | 'warning';
}

// ====== 9. التحليلات الاستراتيجية (Strategic Analytics) ======

export interface StoreComparison {
  storeName: string;
  totalMatchCount: number;
  totalEstimatedCost: number;
  savingsPotential: number;
  cheapestItems: Array<{
    productName: string;
    price: number;
  }>;
}

export interface CategorySpend {
  category: string;
  totalSpent: number;
  itemCount: number;
  percentageOfTotal: number;
  monthlyTrend: 'up' | 'down' | 'stable';
}

export interface WasteReductionRecommendation {
  id: string;
  productName: string;
  riskLevel: 'high' | 'medium' | 'low';
  reason: string;
  suggestedAction: string;
}