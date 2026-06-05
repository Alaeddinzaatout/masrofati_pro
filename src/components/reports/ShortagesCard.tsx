import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';

export interface ShortageItem {
  productName: string;
  isCritical: boolean;
  advice: string;
}

interface ShortagesCardProps {
  shortages: ShortageItem[];
  loading: boolean;
  onPredict: () => void;
}

const ShortagesCard = ({ shortages, loading, onPredict }: ShortagesCardProps) => {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleLarge" style={styles.cardTitle}>📦 الأصناف التي أوشكت</Text>
        <Button
          mode="contained"
          onPress={onPredict}
          loading={loading}
          icon="alert-decagram-outline"
          buttonColor="#f39c12"
          style={styles.actionButton}
        >
          توقع النقص
        </Button>

        {shortages.map((item, index) => (
          <View key={index} style={[styles.shortageItem, { backgroundColor: item.isCritical ? 'rgba(231, 76, 60, 0.1)' : 'rgba(243, 156, 18, 0.1)' }]}>
            <View style={styles.headerRow}>
              <Text style={{ fontWeight: 'bold', color: '#fff', fontSize: 16 }}>{item.productName}</Text>
              <Text style={{ color: item.isCritical ? '#e74c3c' : '#f39c12', fontWeight: 'bold' }}>
                {item.isCritical ? 'حرج' : 'قريباً'}
              </Text>
            </View>
            <Text style={{ color: '#8E94A5', fontSize: 12, marginTop: 5 }}>{item.advice}</Text>
          </View>
        ))}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 15, marginBottom: 20, backgroundColor: '#1C222E', borderRadius: 20, elevation: 4 },
  cardTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 10 },
  actionButton: { borderRadius: 12, height: 48, justifyContent: 'center' },
  shortageItem: { padding: 15, borderRadius: 16, marginBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

export default ShortagesCard;
