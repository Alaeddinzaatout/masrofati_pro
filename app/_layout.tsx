import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, I18nManager, LogBox, Platform, useColorScheme, View } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { auth } from '../src/firebase/config';
import { DarkTheme, LightTheme } from '../src/theme';

LogBox.ignoreLogs(['Invalid DOM property `transform-origin`', /transform-origin/]);

// 🛡️ كاتم صوت جراحي (Interceptor) لإخفاء تحذير React DOM المزعج على متصفح الويب
if (Platform.OS === 'web') {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('transform-origin')) {
      return; // تجاهل هذا التحذير السخيف من مكتبة Charts بالكامل
    }
    originalConsoleError(...args);
  };
}

// منع إخفاء شاشة البداية تلقائياً - سنخفيها يدوياً بعد التحميل
SplashScreen.preventAutoHideAsync().catch(() => {});

// Override transform-origin for react-native-chart-kit SVG elements on web
if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `
    svg[style*="transform-origin"] {
      transform-origin: center !important;
    }
    text[style*="transform-origin"] {
      transform-origin: center !important;
    }
  `;
  document.head.appendChild(style);
}

const DARK_MODE_KEY = 'dark-mode-preference';

export const ThemeContext = React.createContext({
  darkModePref: 'auto',
  setDarkModePref: (val: string) => {},
});

export const PrivacyContext = React.createContext({
  privacyAccepted: false,
  setPrivacyAccepted: (val: boolean) => {},
});

export default function RootLayout() {
  const [user, setUser] = useState<any>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyLoaded, setPrivacyLoaded] = useState(false);
  const [darkModePref, setDarkModePref] = useState<string>('auto');
  const navigationState = useRootNavigationState();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const segments = useSegments();

  const isReady = privacyLoaded && authLoaded;

  // تحميل الإعدادات المخزنة
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(DARK_MODE_KEY),
      AsyncStorage.getItem('privacy-accepted')
    ]).then(([darkVal, privacyVal]) => {
      if (darkVal) setDarkModePref(darkVal);
      setPrivacyAccepted(privacyVal === 'true');
      setPrivacyLoaded(true);
    });
  }, []);

  const handleSetDarkModePref = async (val: string) => {
    setDarkModePref(val);
    await AsyncStorage.setItem(DARK_MODE_KEY, val);
  };

  // تحديد الثيم بناءً على التفضيل
  let theme;
  if (darkModePref === 'dark') {
    theme = DarkTheme;
  } else if (darkModePref === 'light') {
    theme = LightTheme;
  } else {
    theme = colorScheme === 'dark' ? DarkTheme : LightTheme;
  }

  // ضبط اتجاه اللغة - العربية هي اللغة الوحيدة، لذا نطبق RTL دائماً
  useEffect(() => {
    if (!I18nManager.isRTL) {
      I18nManager.forceRTL(true);
    }
  }, []);

  // مراقبة حالة تسجيل الدخول (مستقلة تماماً)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoaded(true);
    });

    // Fallback: إذا فشل Firebase Auth في الاستجابة خلال 5 ثوان، نكمل على أي حال
    const timeout = setTimeout(() => {
      setAuthLoaded(true);
    }, 5000);

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, []);

  // إخفاء شاشة البداية وإعادة التوجيه عند الجاهزية
  useEffect(() => {
    if (!isReady || !navigationState?.key) return;

    // إخفاء شاشة البداية (Splash Screen) بعد التحميل
    SplashScreen.hideAsync().catch(() => {});

    const inAuthGroup = segments[0] === '(tabs)';
    const inLogin = segments[0] === 'login';
    const inWelcome = segments[0] === 'welcome';
    const inUpgrade = segments[0] === 'upgrade';

    if (!user) {
      // لا يوجد مستخدم - اذهب إلى تسجيل الدخول (إذا لم يكن هناك بالفعل)
      if (!inLogin) {
        router.replace('/login');
      }
    } else if (user && !privacyAccepted) {
      // يوجد مستخدم لكن لم يقبل الخصوصية
      if (!inWelcome) {
        router.replace('/welcome');
      }
    } else if (user && privacyAccepted) {
      // مستخدم جاهز - اذهب إلى التبويبات (إذا لم يكن فيها بالفعل)
      if (!inAuthGroup && !inUpgrade) {
        router.replace('/(tabs)');
      }
    }
  }, [user, isReady, privacyAccepted, navigationState?.key, segments, router]);

  // عرض شاشة تحميل أثناء التهيئة (بلون غامق لتجنب الشاشة البيضاء)
  if (!isReady || !navigationState?.key) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0E17' }}>
        <ActivityIndicator size="large" color="#007acc" />
      </View>
    );
  }

  return (
    <PrivacyContext.Provider value={{ privacyAccepted, setPrivacyAccepted }}>
      <ThemeContext.Provider value={{ darkModePref, setDarkModePref: handleSetDarkModePref }}>
        <PaperProvider theme={theme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </PaperProvider>
      </ThemeContext.Provider>
    </PrivacyContext.Provider>
  );
}
