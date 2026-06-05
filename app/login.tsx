import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Snackbar, Switch, Text, TextInput } from 'react-native-paper';
import { auth } from '../src/firebase/config';
import { initializeUserTrial } from '../src/services/subscription';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedEmail = await SecureStore.getItemAsync('savedEmail');
        const savedPassword = await SecureStore.getItemAsync('savedPassword');
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);
        }
      } catch (e) {}
    };
    loadCredentials();
  }, []);

  const handleAuth = async () => {
    if (!email || !password) {
      setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await initializeUserTrial(user.uid);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      if (rememberMe) {
        await SecureStore.setItemAsync('savedEmail', email);
        await SecureStore.setItemAsync('savedPassword', password);
      } else {
        await SecureStore.deleteItemAsync('savedEmail');
        await SecureStore.deleteItemAsync('savedPassword');
      }
    } catch (err: any) {
      setError(translateError(err.code));
    }
    setLoading(false);
  };

  const translateError = (code: string) => {
    switch (code) {
      case 'auth/user-not-found': return 'المستخدم غير موجود';
      case 'auth/wrong-password': return 'كلمة المرور خاطئة';
      case 'auth/invalid-email': return 'البريد الإلكتروني غير صالح';
      case 'auth/email-already-in-use': return 'البريد الإلكتروني مستخدم بالفعل';
      default: return 'حدث خطأ في عملية التحقق، يرجى المحاولة لاحقاً';
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('الرجاء إدخال البريد الإلكتروني أولاً');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
    } catch (err: any) {
      setError(translateError(err.code));
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons name="wallet-outline" size={60} color="#007acc" />
            </View>
            <Text variant="headlineLarge" style={styles.title}>
              {isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </Text>
            <Text style={styles.subtitle}>
              {isRegister ? 'ابدأ رحلة تنظيم مصاريفك اليوم' : 'أهلاً بك مجدداً في مصروفاتي'}
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              label="البريد الإلكتروني"
              value={email}
              onChangeText={setEmail}
              mode="flat"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              textColor="#fff"
              underlineColor="transparent"
              activeUnderlineColor="#007acc"
              left={<TextInput.Icon icon="email-outline" color="#8E94A5" />}
            />

            <TextInput
              label="كلمة المرور"
              value={password}
              onChangeText={setPassword}
              mode="flat"
              style={styles.input}
              secureTextEntry={!showPassword}
              textColor="#fff"
              underlineColor="transparent"
              activeUnderlineColor="#007acc"
              left={<TextInput.Icon icon="lock-outline" color="#8E94A5" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  color="#8E94A5"
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            <View style={styles.rememberRow}>
              <View style={styles.switchLabelRow}>
                <Switch
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  color="#007acc"
                />
                <Text style={styles.rememberText}>تذكرني</Text>
              </View>
              {!isRegister && (
                <Button mode="text" onPress={handleForgotPassword} labelStyle={styles.forgotLabel}>
                  نسيت كلمة المرور؟
                </Button>
              )}
            </View>

            <Button
              mode="contained"
              onPress={handleAuth}
              loading={loading}
              style={styles.loginButton}
              labelStyle={styles.loginButtonLabel}
              contentStyle={styles.loginButtonContent}
            >
              {isRegister ? 'إنشاء حساب' : 'تسجيل الدخول'}
            </Button>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {isRegister ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟'}
              </Text>
              <Button
                mode="text"
                onPress={() => setIsRegister(!isRegister)}
                labelStyle={styles.switchButtonLabel}
              >
                {isRegister ? 'سجل دخولك' : 'أنشئ حساباً'}
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
        style={styles.errorSnackbar}
        action={{ label: 'حسناً', textColor: '#fff' }}
      >
        <Text style={styles.snackbarText}>{error}</Text>
      </Snackbar>

      <Snackbar
        visible={!!successMsg}
        onDismiss={() => setSuccessMsg('')}
        duration={4000}
        style={styles.successSnackbar}
        action={{ label: 'تم', textColor: '#fff' }}
      >
        <Text style={styles.snackbarText}>{successMsg}</Text>
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 122, 204, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'serif',
  },
  subtitle: {
    color: '#8E94A5',
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#1C222E',
    borderRadius: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    height: 60,
  },
  rememberRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  switchLabelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  rememberText: {
    color: '#8E94A5',
    marginRight: 8,
  },
  forgotLabel: {
    color: '#007acc',
    fontSize: 14,
  },
  loginButton: {
    borderRadius: 15,
    elevation: 4,
    shadowColor: '#007acc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    backgroundColor: '#007acc',
  },
  loginButtonContent: {
    height: 55,
  },
  loginButtonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  footer: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  footerText: {
    color: '#8E94A5',
    fontSize: 14,
  },
  switchButtonLabel: {
    color: '#007acc',
    fontWeight: 'bold',
    fontSize: 14,
  },
  errorSnackbar: {
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    marginBottom: 20,
  },
  successSnackbar: {
    backgroundColor: '#2ECC71',
    borderRadius: 10,
    marginBottom: 20,
  },
  snackbarText: {
    color: '#fff',
    textAlign: 'right',
  },
});