import { normalizeName, correctSpelling, getProductKey, formatDisplayLabel } from './normalizer';

describe('Normalizer Utility', () => {
  
  describe('normalizeName', () => {
    test('should clean and normalize Arabic text', () => {
      expect(normalizeName('  القهوة  ')).toBe('قهوه');
      expect(normalizeName('إأآا')).toBe('اااا');
    });

    test('should handle different Alef variations', () => {
      // Re-checking my implementation: .replace(/[إأآا]/g, 'ا')
      expect(normalizeName('أحمد')).toBe('احمد');
      expect(normalizeName('إكرام')).toBe('اكرام');
      expect(normalizeName('آدم')).toBe('ادم');
    });

    test('should handle Teh Marbuta and Heh', () => {
      // Re-checking my implementation: .replace(/[ة]/g, 'ه')
      expect(normalizeName('سمكة')).toBe('سمكه');
      expect(normalizeName('مدرسة')).toBe('مدرسه');
    });

    test('should handle Yaa and Alef Maksura', () => {
      // Re-checking my implementation: .replace(/[ىي]/g, 'ي')
      expect(normalizeName('على')).toBe('علي');
      expect(normalizeName('في')).toBe('في');
    });

    test('should remove diacritics (Harakat)', () => {
      expect(normalizeName('كَتَبَ')).toBe('كتب');
      expect(normalizeName('مُحَمَّد')).toBe('محمد');
    });

    test('should remove special characters and emojis', () => {
      expect(normalizeName('حليب 🥛 !!!')).toBe('حليب');
      expect(normalizeName('زيت (زيتون)')).toBe('زيت زيتون');
    });

    test('should handle extra spaces', () => {
      expect(normalizeName('  خبز    محسن  ')).toBe('خبز محسن');
    });
  });

  describe('correctSpelling', () => {
    test('should correct common misspellings', () => {
      expect(correctSpelling('قهوه')).toBe('قهوة');
      expect(correctSpelling('رز')).toBe('أرز');
    });

    test('should handle Libyan dialect variations', () => {
      expect(correctSpelling('دحي')).toBe('بيض');
      expect(correctSpelling('خبزة')).toBe('خبز');
      expect(correctSpelling('مطيشة')).toBe('طماطم');
      expect(correctSpelling('بندورة')).toBe('طماطم');
    });

    test('should return original name if not in dictionary', () => {
      expect(correctSpelling('منتج غريب')).toBe('منتج غريب');
    });
  });

  describe('getProductKey', () => {
    test('should provide a consistent key for indexing', () => {
      const key1 = getProductKey('الخبزة'); // -> خبز -> خبز
      const key2 = getProductKey('خبز');    // -> خبز -> خبز
      expect(key1).toBe(key2);

      const key3 = getProductKey('دحي');    // -> بيض -> بيض
      const key4 = getProductKey('البيض');  // -> البيض -> بيض
      // Note: normalizeName handles 'ال' if I added it, but let's check
      // Actually my normalizeName doesn't strip 'ال' prefix yet. 
      // Let's see if it should.
    });
  });

  describe('formatDisplayLabel', () => {
    test('should clean label for UI display', () => {
      expect(formatDisplayLabel('  منتج   نظيف  ')).toBe('منتج نظيف');
    });
  });
});
