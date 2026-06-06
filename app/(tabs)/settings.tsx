import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, Alert, Platform } from 'react-native';
import { Button, Snackbar, Text, TextInput, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, addDoc, setDoc, collection, getDoc } from 'firebase/firestore';
import { auth, db } from '../../src/firebase/config';
import { useSettingsLogic } from '../../src/hooks/useSettingsLogic';
import { calculateRemainingDays } from '../../src/utils/dateUtils';
import ApiKeysCard from '../../src/components/settings/ApiKeysCard';
import AppearanceCard from '../../src/components/settings/AppearanceCard';
import SmartNotificationsCard from '../../src/components/settings/SmartNotificationsCard';
import SystemDataCard from '../../src/components/settings/SystemDataCard';

export default function SettingsScreen() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [accountStatus, setAccountStatus] = useState<'trial' | 'pro' | 'expired'>('trial');
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Support Number States
  const [supportNumber, setSupportNumber] = useState('');
  const [isSavingNumber, setIsSavingNumber] = useState(false);

  console.log('DEBUG: Is Admin state:', isAdmin, 'User Email:', auth.currentUser?.email);

  const loadSupportNumber = async () => {
    try {
      const snap = await getDoc(doc(db, 'system_config', 'app_settings'));
      if (snap.exists()) {
        setSupportNumber(snap.data().supportPhoneNumber || '');
      }
    } catch (e) {
      console.warn("Failed to load support number", e);
    }
  };

  const saveSupportNumber = async () => {
    if (!isAdmin || isSavingNumber) return;
    setIsSavingNumber(true);
    try {
      await setDoc(doc(db, 'system_config', 'app_settings'), {
        supportPhoneNumber: supportNumber.trim()
      }, { merge: true });
      
      if (Platform.OS === 'web') window.alert('تم حفظ رقم الدعم بنجاح ✅');
      else Alert.alert('نجاح ✅', 'تم تحديث رقم الدعم الفني بنجاح.');
    } catch (e) {
      console.error("Error saving support number: ", e);
    } finally {
      setIsSavingNumber(false);
    }
  };

  const generateKey = async (durationDays: number) => {
    if (!isAdmin || isGenerating) return;
    setIsGenerating(true);
    try {
      const keyString = `MAS-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${durationDays}D`;
      await setDoc(doc(db, 'activation_keys', keyString), {
        key: keyString,
        durationDays: durationDays,
        is_used: false,
        createdAt: new Date().toISOString()
      });
      if (Platform.OS === 'web') {
        window.alert(`تم توليد المفتاح بنجاح:\n\n${keyString}\n\n(قم بنسخه الآن)`);
      } else {
        Alert.alert('نجاح ✅', `تم توليد المفتاح:\n\n${keyString}`, [{ text: 'موافق' }]);
      }
    } catch (e) {
      console.error("Error generating key: ", e);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    let unsubSnap: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // 1. تنظيف أي مستمع قديم فوراً عند تغير حالة المستخدم
      if (unsubSnap) {
        unsubSnap();
        unsubSnap = null;
      }

      if (user) {
        setIsAdmin(user.email === 'alaadden.zatout@gmail.com');
        loadSupportNumber();
        const userRef = doc(db, 'users', user.uid);
        unsubSnap = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const subscribed = !!data.isSubscribed;
            setIsSubscribed(subscribed);

            const proExpiry = data.subscriptionExpiresAt || data.subscriptionEndDate;
            const trialExpiry = data.trialExpiresAt || data.trialEndDate;

            if (subscribed && proExpiry) {
              const remaining = calculateRemainingDays(proExpiry);
              setDaysLeft(remaining);
              setAccountStatus(remaining > 0 ? 'pro' : 'expired');
            } else if (!subscribed && trialExpiry) {
              const remaining = calculateRemainingDays(trialExpiry);
              setDaysLeft(remaining);
              setAccountStatus(remaining > 0 ? 'trial' : 'expired');
            } else {
              setDaysLeft(0);
              setAccountStatus('expired');
            }
          }
        }, (err) => {
          console.warn("Settings subscription listener permission issue:", err.message);
        });
      } else {
        setIsAdmin(false);
        setIsSubscribed(false);
        setAccountStatus('trial');
        setDaysLeft(null);
      }
    });

    return () => {
      unsubAuth();
      if (unsubSnap) unsubSnap();
    };
  }, []);

  const {
    geminiKey,
    deepseekKey,
    testing,
    notifPrefs,
    darkModePref,
    toggleDarkMode,
    snack,
    hideSnack,
    actions
  } = useSettingsLogic();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ مركز التحكم</Text>
        <Text style={styles.headerSubtitle}>إدارة الذكاء الاصطناعي، التنبيهات، والنظام</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contentContainer}
      >
        {isAdmin && (
          <>
            <ApiKeysCard 
              geminiKey={geminiKey}
              deepseekKey={deepseekKey}
              testing={testing}
              onSaveGemini={actions.saveGeminiKey}
              onTestGemini={actions.testGemini}
              onSaveDeepSeek={actions.saveDeepSeekKey}
              onTestDeepSeek={actions.testDeepSeek}
            />

            <View style={{ marginHorizontal: 15, marginBottom: 20, backgroundColor: '#1C222E', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.2)' }}>
              <Text style={{ color: '#FFD700', fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>
                🏭 مصنع المفاتيح (للإدمن فقط)
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <Button mode="contained" buttonColor="#2ecc71" onPress={() => generateKey(30)} style={{ flex: 1, marginRight: 5 }}>شهر</Button>
                <Button mode="contained" buttonColor="#f39c12" onPress={() => generateKey(180)} style={{ flex: 1, marginHorizontal: 5 }}>6 شهور</Button>
                <Button mode="contained" buttonColor="#e74c3c" onPress={() => generateKey(365)} style={{ flex: 1, marginLeft: 5 }}>سنة</Button>
              </View>

              <Divider style={{ backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 15 }} />

              <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>رقم واتساب الدعم الفني:</Text>
              <TextInput
                mode="outlined"
                value={supportNumber}
                onChangeText={setSupportNumber}
                placeholder="+218..."
                textColor="#fff"
                outlineColor="rgba(255,255,255,0.2)"
                activeOutlineColor="#FFD700"
                style={{ backgroundColor: '#0A0E17', marginBottom: 10 }}
              />
              <Button 
                mode="contained" 
                buttonColor="#FFD700" 
                textColor="#000" 
                onPress={saveSupportNumber}
                loading={isSavingNumber}
              >
                حفظ رقم الدعم
              </Button>
            </View>
          </>
        )}

        {!isAdmin && accountStatus === 'trial' && (
          <View style={{ marginHorizontal: 15, marginBottom: 20, backgroundColor: '#1C222E', borderRadius: 16, padding: 15, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#3498db' }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
              ⏳ الفترة التجريبية: متبقي {daysLeft !== null ? daysLeft : '...'} يوم
            </Text>
            <Button 
              mode="text" 
              onPress={() => router.push('/upgrade')} 
              labelStyle={{ color: '#FFD700', fontWeight: 'bold' }}
            >
              ترقية الآن للحصول على كافة المميزات
            </Button>
          </View>
        )}

        {!isAdmin && accountStatus === 'pro' && (
          <Text style={{ textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: '#FFD700', marginVertical: 18 }}>
            👑 حسابك مفعل النسخة برو (متبقي {daysLeft !== null ? daysLeft : '...'} يوم)
          </Text>
        )}

        {!isAdmin && accountStatus === 'expired' && (
          <View style={{ marginHorizontal: 15, marginBottom: 20, backgroundColor: 'rgba(231, 76, 60, 0.1)', borderRadius: 16, padding: 15, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#e74c3c' }}>
            <Text style={{ color: '#e74c3c', fontSize: 16, fontWeight: 'bold' }}>
              ❌ انتهت صلاحية الحساب
            </Text>
            <Button 
              mode="contained" 
              buttonColor="#FFD700" 
              textColor="#000"
              style={{ marginTop: 10, borderRadius: 12 }}
              onPress={() => router.push('/upgrade')}
            >
              تجديد الاشتراك الآن
            </Button>
          </View>
        )}

        <AppearanceCard 
          darkModePref={darkModePref}
          onToggle={toggleDarkMode}
        />

        <SmartNotificationsCard 
          prefs={notifPrefs}
          onUpdate={actions.updateNotifPref}
        />

        <SystemDataCard 
          onCheckUpdates={actions.checkForUpdates}
          onExport={actions.exportData}
          onDeleteAccount={actions.deleteAccount}
        />

        <Button 
          mode="contained-tonal" 
          onPress={actions.signOut} 
          textColor="#e74c3c" 
          buttonColor="rgba(231, 76, 60, 0.1)"
          style={styles.logoutBtn}
        >
          تسجيل الخروج
        </Button>
      </ScrollView>

      <Snackbar 
        visible={snack.visible} 
        onDismiss={hideSnack} 
        style={{ backgroundColor: snack.color || '#1C222E', borderRadius: 16 }} 
        action={{ label: 'حسناً', textColor: '#fff' }}
      >
        {snack.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { padding: 25, paddingTop: 50, backgroundColor: '#1C222E', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5, zIndex: 10 },
  headerTitle: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 24 },
  headerSubtitle: { color: '#8E94A5', textAlign: 'center', marginTop: 5 },
  scrollView: { flex: 1 },
  contentContainer: { paddingVertical: 20, paddingBottom: 40 },
  logoutBtn: { marginHorizontal: 20, marginTop: 10, borderRadius: 16, height: 50, justifyContent: 'center' },
});
