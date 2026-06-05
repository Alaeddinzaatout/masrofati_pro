import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Searchbar, Text } from 'react-native-paper';
import { StorePrice } from '../../types';

interface PriceRadarCardProps {
  priceRadar: {
    results: StorePrice[];
    trend: any | null;
  };
  searchProductInput: string;
  onSearchInputChange: (text: string) => void;
  loading: boolean;
  onSearch: () => void;
}

const PriceRadarCard = ({
  priceRadar,
  searchProductInput,
  onSearchInputChange,
  loading,
  onSearch,
}: PriceRadarCardProps) => {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleLarge" style={styles.cardTitle}>🛒 رادار الأسعار</Text>
        <Searchbar
          placeholder="ابحث عن صنف..."
          placeholderTextColor="#8E94A5"
          value={searchProductInput}
          onChangeText={onSearchInputChange}
          onSubmitEditing={onSearch}
          style={styles.searchbar}
          inputStyle={{ color: '#fff' }}
          iconColor="#007acc"
        />
        <Button
          mode="contained"
          onPress={onSearch}
          loading={loading}
          icon="store-search"
          buttonColor="#007acc"
          style={styles.actionButton}
        >
          بحث عن أرخص محل
        </Button>

        {priceRadar.results && (
          <View style={{ marginTop: 20 }}>
            {priceRadar.results.length === 0 ? (
              <View style={styles.adviceBox}>
                <Text style={{ color: '#f39c12', textAlign: 'center', fontWeight: 'bold' }}>
                  لم يتم العثور على أسعار 🕵️‍♂️
                </Text>
                <Text style={{ color: '#8E94A5', textAlign: 'center', marginTop: 5 }}>
                  هذا الصنف لم يتم تسجيله في أي محل حتى الآن.
                </Text>
              </View>
            ) : (
              <>
                {priceRadar.trend && (
                  <View style={[styles.adviceBox, { marginBottom: 15, backgroundColor: priceRadar.trend.trend === 'rising' ? 'rgba(231, 76, 60, 0.1)' : 'rgba(46, 204, 113, 0.1)' }]}>
                    <Text style={{ color: priceRadar.trend.trend === 'rising' ? '#e74c3c' : '#2ecc71', fontWeight: 'bold' }}>
                      {priceRadar.trend.trend === 'rising' ? '📈 ارتفاع في السعر' : '📉 انخفاض في السعر'}
                    </Text>
                    <Text style={styles.adviceText}>{priceRadar.trend.advice}</Text>
                    {priceRadar.trend.predictedPrice && (
                      <Text style={{ color: '#8E94A5', fontSize: 12, marginTop: 5 }}>
                        السعر المتوقع: {priceRadar.trend.predictedPrice.toFixed(2)} د.ل
                      </Text>
                    )}
                  </View>
                )}
                {priceRadar.results.map((store, index) => {
                  const daysAgo = store.date ? Math.floor((new Date().getTime() - new Date(store.date).getTime()) / (1000 * 3600 * 24)) : 0;
                  const timeText = daysAgo === 0 ? 'اليوم' : daysAgo === 1 ? 'أمس' : `منذ ${daysAgo} أيام`;
                  return (
                  <View key={index} style={styles.priceRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>{store.store}</Text>
                      <Text style={{ color: '#8E94A5', fontSize: 11, marginTop: 2 }}>
                        ⏱️ آخر تحديث: {timeText}
                      </Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 15, color: index === 0 ? '#2ecc71' : '#007acc' }}>
                        {store.unitPrice.toFixed(2)} د.ل
                      </Text>
                      <Text style={{ color: '#8E94A5', fontSize: 10 }}>للقطعة</Text>
                    </View>
                  </View>
                )})}
              </>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 15, marginBottom: 20, backgroundColor: '#1C222E', borderRadius: 20, elevation: 4 },
  cardTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 10 },
  actionButton: { borderRadius: 12, height: 48, justifyContent: 'center' },
  searchbar: { backgroundColor: '#0A0E17', borderRadius: 12, elevation: 0, marginBottom: 15 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(142, 148, 165, 0.1)' },
  adviceBox: { padding: 15, backgroundColor: 'rgba(0, 122, 204, 0.1)', borderRadius: 12, marginTop: 15 },
  adviceText: { color: '#fff', lineHeight: 20, fontSize: 14 },
});

export default PriceRadarCard;
