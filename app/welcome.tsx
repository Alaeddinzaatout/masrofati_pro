import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useContext, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Checkbox, Snackbar, Text } from 'react-native-paper';
import { PrivacyContext } from './_layout';

export default function WelcomeScreen() {
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const { setPrivacyAccepted } = useContext(PrivacyContext);
  const router = useRouter();

    const handleAccept = async () => {
    if (!accepted) {
      setError('يجب الموافقة على سياسة الخصوصية للمتابعة');
      return;
    }
    try {
      await AsyncStorage.setItem('privacy-accepted', 'true');
      setPrivacyAccepted(true);
      // التوجيه إلى التبويبات الرئيسية
      router.replace('/(tabs)');
    } catch (e: any) {
      setError('حدث خطأ: ' + e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>👋 مرحباً!</Text>
          <Text variant="bodyLarge" style={styles.text}>
            نحن سعداء بانضمامك إلينا. قبل المتابعة، يجب أن توافق على جمع بعض البيانات الضرورية لتشغيل التطبيق.

لن نشارك بياناتك مع أي طرف ثالث. يمكنك الاطلاع على سياسة الخصوصية الكاملة من قائمة الإعدادات.
          </Text>
          <Checkbox.Item
            label="أوافق على سياسة الخصوصية وجمع البيانات"
            status={accepted ? 'checked' : 'unchecked'}
            onPress={() => setAccepted(!accepted)}
          />
          <Button
            mode="contained"
            onPress={handleAccept}
            disabled={!accepted}
            style={{ marginTop: 20 }}
          >
            موافق
          </Button>
          <Snackbar visible={!!error} onDismiss={() => setError('')} action={{ label: 'حسناً' }}>
            {error}
          </Snackbar>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0E17' },
  card: { width: '90%', maxWidth: 400 },
  title: { textAlign: 'center', marginBottom: 20, color: '#007acc' },
  text: { marginBottom: 20, lineHeight: 22 },
});