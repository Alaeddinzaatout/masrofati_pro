import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useContext } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Appbar, Button, Text } from 'react-native-paper';
import { PrivacyContext } from './_layout';

export default function PrivacyScreen() {
  const router = useRouter();
  const { setPrivacyAccepted } = useContext(PrivacyContext);

  const handleAccept = async () => {
    try {
      await AsyncStorage.setItem('privacy-accepted', 'true');
      setPrivacyAccepted(true);
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('Error saving privacy acceptance:', e);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="سياسة الخصوصية" />
      </Appbar.Header>
      <Text variant="bodyLarge" style={styles.text}>
        {`نحن في "مصروفاتي" نلتزم بحماية خصوصيتك. هذا التطبيق لا يشارك بياناتك مع أي طرف ثالث.

المعلومات التي نجمعها:
- البريد الإلكتروني (لإنشاء الحساب فقط).
- بيانات المشتريات (لتقديم خدمة التتبع).
- مفتاح Gemini API (يُخزن محلياً على جهازك فقط).

نحن لا نبيع بياناتك ولا نستخدمها لأي غرض آخر. يمكنك حذف حسابك وجميع بياناتك في أي وقت من قائمة الإعدادات.

للمزيد من الاستفسارات، تواصل معنا على: masrofati@email.com`}
      </Text>
      <Button mode="contained" onPress={handleAccept} style={{ margin: 15 }}>
        موافق
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  text: { margin: 20, lineHeight: 24, textAlign: 'right' },
});