import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Linking, Alert, Platform } from 'react-native';
import { Text, Button, Card, TextInput, ActivityIndicator, Divider } from 'react-native-paper';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../src/firebase/config';
import { activateLicenseKey } from '../src/services/activation';

export default function UpgradeScreen() {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [supportNumber, setSupportNumber] = useState('+218900000000');

  // Load support number dynamically
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_config', 'app_settings'), (snap) => {
      if (snap.exists() && snap.data().supportPhoneNumber) {
        setSupportNumber(snap.data().supportPhoneNumber);
      }
    }, (err) => {
      console.warn("Failed to listen to support number", err);
    });
    return () => unsub();
  }, []);

  const handleWhatsApp = () => {
    const phoneNumber = supportNumber.replace('+', '');
    const message = 'أهلاً، أرغب في الاشتراك في نسخة برو من تطبيق مصروفاتي.';
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback for web or devices without WhatsApp app
        const webUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        Linking.openURL(webUrl);
      }
    });
  };

  const handleActivate = async () => {
    if (!key.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال مفتاح التفعيل أولاً.');
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert('خطأ', 'يجب تسجيل الدخول للقيام بهذه العملية.');
      return;
    }

    setLoading(true);
    try {
      await activateLicenseKey(uid, key.trim());
      
      if (Platform.OS === 'web') {
        window.alert('تم تفعيل النسخة برو بنجاح! استمتع بكافة المميزات.');
        router.replace('/(tabs)');
      } else {
        Alert.alert('نجاح ✅', 'تم تفعيل النسخة برو بنجاح! استمتع بكافة المميزات.', [
          { text: 'حسناً', onPress: () => router.replace('/(tabs)') }
        ]);
      }
    } catch (error: any) {
      Alert.alert('فشل التفعيل', error.message || 'حدث خطأ ما، يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: 'الترقية للنسخة برو',
        headerStyle: { backgroundColor: '#0A0E17' },
        headerTintColor: '#fff',
      }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="rocket-launch" size={80} color="#FFD700" />
          <Text variant="headlineMedium" style={styles.title}>ارتقِ إلى النسخة برو 🚀</Text>
          <Text style={styles.subtitle}>افتح كافة المميزات والذكاء الاصطناعي بلا حدود</Text>
        </View>

        <View style={styles.plansContainer}>
          <Card style={styles.planCard}>
            <Card.Content style={styles.planContent}>
              <View>
                <Text style={styles.planTitle}>باقة شهرية</Text>
                <Text style={styles.planPrice}>15 د.ل <Text style={styles.planDuration}>/ شهر</Text></Text>
              </View>
              <MaterialCommunityIcons name="check-decagram" size={24} color="#007acc" />
            </Card.Content>
          </Card>

          <Card style={[styles.planCard, styles.popularCard]}>
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>توفير!</Text>
            </View>
            <Card.Content style={styles.planContent}>
              <View>
                <Text style={styles.planTitle}>باقة نصف سنوية</Text>
                <Text style={styles.planPrice}>75 د.ل <Text style={styles.planDuration}>/ 6 أشهر</Text></Text>
              </View>
              <MaterialCommunityIcons name="star-circle" size={30} color="#FFD700" />
            </Card.Content>
          </Card>

          <Card style={styles.planCard}>
            <Card.Content style={styles.planContent}>
              <View>
                <Text style={styles.planTitle}>باقة سنوية</Text>
                <Text style={styles.planPrice}>120 د.ل <Text style={styles.planDuration}>/ سنة</Text></Text>
              </View>
              <Text style={styles.bestValue}>الأفضل!</Text>
            </Card.Content>
          </Card>
        </View>

        <Button 
          mode="contained" 
          onPress={handleWhatsApp}
          style={styles.whatsappButton}
          contentStyle={styles.buttonInner}
          icon="whatsapp"
        >
          تواصل معنا عبر واتساب للاشتراك
        </Button>

        <Divider style={styles.divider} />

        <View style={styles.activationSection}>
          <Text style={styles.activationTitle}>هل لديك مفتاح تفعيل؟</Text>
          <TextInput
            label="أدخل مفتاح التفعيل هنا"
            value={key}
            onChangeText={setKey}
            mode="outlined"
            style={styles.input}
            outlineColor="#1C222E"
            activeOutlineColor="#007acc"
            textColor="#fff"
            placeholderTextColor="#8E94A5"
          />
          <Button 
            mode="contained" 
            onPress={handleActivate}
            loading={loading}
            disabled={loading}
            style={styles.activateButton}
            buttonColor="#007acc"
          >
            تفعيل المفتاح
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 15,
    textAlign: 'center',
  },
  subtitle: {
    color: '#8E94A5',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
  },
  plansContainer: {
    width: '100%',
    marginBottom: 30,
  },
  planCard: {
    backgroundColor: '#1C222E',
    marginBottom: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  popularCard: {
    borderColor: '#FFD700',
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 1,
  },
  popularText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  planContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  planTitle: {
    color: '#8E94A5',
    fontSize: 14,
  },
  planPrice: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
  },
  planDuration: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#8E94A5',
  },
  bestValue: {
    color: '#2ecc71',
    fontWeight: 'bold',
    fontSize: 14,
  },
  whatsappButton: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#25D366',
    marginBottom: 30,
  },
  buttonInner: {
    height: 55,
  },
  divider: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 30,
  },
  activationSection: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 40,
  },
  activationTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    width: '100%',
    backgroundColor: '#1C222E',
    marginBottom: 15,
  },
  activateButton: {
    width: '100%',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
  },
});
