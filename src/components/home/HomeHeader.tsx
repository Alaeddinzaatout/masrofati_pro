import { signOut } from 'firebase/auth';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Appbar } from 'react-native-paper';
import { auth } from '../../firebase/config';

interface HomeHeaderProps {
  title?: string;
}

const HomeHeader = ({ title = "سجل المصروفات الذكي" }: HomeHeaderProps) => {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("خطأ في تسجيل الخروج:", error);
    }
  };

  return (
    <Appbar.Header style={styles.appbar}>
      <Appbar.Content title={title} titleStyle={styles.appbarTitle} />
      <Appbar.Action icon="logout" iconColor="#fff" onPress={handleSignOut} />
    </Appbar.Header>
  );
};

const styles = StyleSheet.create({
  appbar: { backgroundColor: '#1C222E', elevation: 0 },
  appbarTitle: { color: '#fff', fontWeight: 'bold' },
});

export default HomeHeader;
