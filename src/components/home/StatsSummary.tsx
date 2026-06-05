import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface StatsSummaryProps {
  count: number;
  total: number;
  avgPrice: number;
}

const StatsSummary = ({ count, total, avgPrice }: StatsSummaryProps) => {
  return (
    <View style={styles.totalBar}>
      <Text style={styles.totalBarText}>
        💰 {count} صنف — {total.toFixed(2)} دينار
      </Text>
      {count > 0 && (
        <Text style={{ fontSize: 12, color: '#8E94A5' }}>
          متوسط {avgPrice.toFixed(2)} دينار للصنف
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  totalBar: { 
    padding: 20, 
    backgroundColor: '#1C222E', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0,
    elevation: 10
  },
  totalBarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
});

export default StatsSummary;
