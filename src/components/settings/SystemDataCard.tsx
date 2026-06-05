import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';

interface SystemDataCardProps {
  onCheckUpdates: () => void;
  onExport: () => void;
  onDeleteAccount: () => void;
}

const SystemDataCard = ({ onCheckUpdates, onExport, onDeleteAccount }: SystemDataCardProps) => {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.cardTitle}>النظام والبيانات</Text>
        <Button 
          mode="contained-tonal" 
          icon="cloud-download" 
          onPress={onCheckUpdates} 
          style={styles.wideButton} 
          buttonColor="rgba(0,122,204,0.1)"
          textColor="#007acc"
        >
          التحقق من التحديثات
        </Button>
        <Button 
          mode="contained-tonal" 
          icon="file-delimited" 
          onPress={onExport} 
          style={styles.wideButton} 
          buttonColor="rgba(46, 204, 113, 0.1)"
          textColor="#2ecc71"
        >
          تصدير البيانات (CSV)
        </Button>
        <View style={styles.dangerZone}>
          <Text style={styles.dangerText}>منطقة الخطر</Text>
          <Button 
            mode="outlined" 
            icon="delete-forever" 
            onPress={onDeleteAccount} 
            style={[styles.wideButton, { borderColor: 'rgba(231, 76, 60, 0.5)' }]} 
            textColor="#e74c3c"
          >
            حذف الحساب والبيانات نهائياً
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 15, marginBottom: 20, backgroundColor: '#1C222E', borderRadius: 24, elevation: 4 },
  cardTitle: { color: '#fff', fontSize: 18, marginBottom: 20, fontWeight: 'bold' },
  wideButton: { marginBottom: 12, borderRadius: 16, height: 50, justifyContent: 'center' },
  dangerZone: { marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(231, 76, 60, 0.2)', paddingTop: 15 },
  dangerText: { color: '#e74c3c', fontSize: 12, marginBottom: 10, fontWeight: 'bold', textAlign: 'center' }
});

export default SystemDataCard;
