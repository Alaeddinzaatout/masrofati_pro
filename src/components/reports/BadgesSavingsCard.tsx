import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { Badge } from '../../types';

interface BadgesSavingsCardProps {
  badges: Badge[];
  totalSavings: number;
}

const BadgesSavingsCard = ({ badges, totalSavings }: BadgesSavingsCardProps) => {
  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.headerRow}>
          <View>
            <Text variant="titleLarge" style={styles.cardTitle}>🏆 إنجازاتي</Text>
            <Text style={styles.savingsText}>
              إجمالي التوفير: {totalSavings.toFixed(2)} د.ل
            </Text>
          </View>
          <View style={styles.badgeCount}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              {earnedCount}/{badges.length}
            </Text>
          </View>
        </View>

        <View style={styles.badgesGrid}>
          {badges.slice(0, 6).map((badge) => (
            <View key={badge.id} style={[styles.badgeItem, { opacity: badge.earned ? 1 : 0.3 }]}>
              <Text style={{ fontSize: 32 }}>{badge.icon}</Text>
              <Text style={[styles.badgeTitle, { color: badge.earned ? '#007acc' : '#8E94A5' }]}>
                {badge.title.split(' ')[0]}
              </Text>
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { 
    marginHorizontal: 15, 
    marginBottom: 20, 
    backgroundColor: '#1C222E', 
    borderRadius: 20, 
    elevation: 4 
  },
  cardTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  savingsText: { color: '#2ecc71', fontWeight: 'bold', fontSize: 16 },
  badgeCount: { backgroundColor: '#007acc', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20, justifyContent: 'space-between' },
  badgeItem: { alignItems: 'center', width: '30%', marginBottom: 15 },
  badgeTitle: { fontSize: 11, marginTop: 5, fontWeight: 'bold' },
});

export default BadgesSavingsCard;
