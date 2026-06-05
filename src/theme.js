// @ts-nocheck
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';

/**
 * لوحة ألوان Masrofati VIP (Modern & Luxury)
 * تعتمد على التدرجات العميقة والتباين العالي
 */

const VIP_COLORS = {
  royalBlue: '#0A84FF',
  deepDark: '#010101',
  surfaceDark: '#121214',
  accentGold: '#FFD700',
  successGreen: '#32D74B',
  errorRed: '#FF453A',
  glassWhite: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
};

// إعدادات السمة الفاتحة (Modern & Clean)
const LightTheme = {
  ...MD3LightTheme,
  roundness: 16,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#007AFF',
    secondary: '#5856D6',
    error: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    onSurfaceVariant: '#3C3C43',
    elevation: {
      level1: '#FFFFFF',
      level2: '#F9F9F9',
      level3: '#F2F2F2',
    },
  },
};

// إعدادات السمة الداكنة (Luxurious Dark)
const DarkTheme = {
  ...MD3DarkTheme,
  roundness: 20, // زوايا أكثر نعومة
  colors: {
    ...MD3DarkTheme.colors,
    primary: VIP_COLORS.royalBlue,
    secondary: '#AF52DE',
    error: VIP_COLORS.errorRed,
    background: VIP_COLORS.deepDark,
    surface: VIP_COLORS.surfaceDark,
    surfaceVariant: '#1C1C1E',
    onSurface: VIP_COLORS.textPrimary,
    onSurfaceVariant: VIP_COLORS.textSecondary,
    elevation: {
      level1: '#1C1C1E',
      level2: '#2C2C2E',
      level3: '#3A3A3C',
    },
  },
};

// تكييف ثيمات التنقل
const { LightTheme: AdaptedLight, DarkTheme: AdaptedDark } = adaptNavigationTheme({
  reactNavigationLight: {
    ...NavigationDefaultTheme,
    colors: {
      ...NavigationDefaultTheme.colors,
      background: '#F2F2F7',
      card: '#FFFFFF',
    }
  },
  reactNavigationDark: {
    ...NavigationDarkTheme,
    colors: {
      ...NavigationDarkTheme.colors,
      background: VIP_COLORS.deepDark,
      card: '#000000',
      border: 'rgba(255,255,255,0.1)',
    }
  },
});

export { AdaptedDark, AdaptedLight, DarkTheme, LightTheme };
