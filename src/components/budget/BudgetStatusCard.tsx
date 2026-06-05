import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, ProgressBar, Text } from 'react-native-paper';
import { BudgetStats } from '../../types';

interface BudgetStatusCardProps {
  stats: BudgetStats;
}

const BudgetStatusCard = ({ stats }: BudgetStatusCardProps) => {
  if (stats.budget <= 0) return null;

  const isWarning = stats.progress > 0.8 && stats.progress <= 1;
  const isDanger = stats.progress > 1;

  const getProgressColor = () => {
    if (isDanger) return '#e74c3c';
    if (isWarning) return '#f39c12';
    return '#2ecc71';
  };

  const getGlowStyle = () => {
    if (isDanger) return { shadowColor: '#e74c3c', shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 };
    if (isWarning) return { shadowColor: '#f39c12', shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 };
    return { shadowColor: '#2ecc71', shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 };
  };

  return (
    <Card style={[styles.card, getGlowStyle()]}>
      <Card.Content>
        <Text style={styles.cardTitle}>حالة الميزانية الحالية</Text>
        
        <View style={styles.amountRow}>
          <View>
            <Text style={styles.label}>المصروف</Text>
            <Text style={[styles.amount, { color: getProgressColor() }]}>
              {stats.spent.toFixed(2)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.label}>من أصل</Text>
            <Text style={styles.totalAmount}>{stats.budget.toFixed(2)} د.ل</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <ProgressBar 
            progress={Math.min(stats.progress, 1)} 
            color={getProgressColor()} 
            style={styles.progressBar} 
          />
          <View style={styles.progressLabels}>
            <Text style={styles.percentText}>{(stats.progress * 100).toFixed(0)}%</Text>
            <Text style={[styles.remainingText, stats.isOverBudget && { color: '#e74c3c' }]}>
              {stats.isOverBudget 
                ? `تجاوزت بـ ${Math.abs(stats.remaining).toFixed(2)} د.ل` 
                : `المتبقي: ${stats.remaining.toFixed(2)} د.ل`}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 15, marginBottom: 20, backgroundColor: '#1C222E', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardTitle: { color: '#8E94A5', fontSize: 14, fontWeight: 'bold', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  label: { color: '#8E94A5', fontSize: 12, marginBottom: 5 },
  amount: { fontSize: 36, fontWeight: 'bold' },
  totalAmount: { color: '#fff', fontSize: 20, fontWeight: 'bold', opacity: 0.8 },
  progressContainer: { marginTop: 10 },
  progressBar: { height: 12, borderRadius: 6, backgroundColor: '#0A0E17' },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  percentText: { color: '#fff', fontWeight: 'bold' },
  remainingText: { color: '#8E94A5', fontWeight: 'bold' },
});

export default BudgetStatusCard;
