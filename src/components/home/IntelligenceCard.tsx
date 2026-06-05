import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Card, IconButton, Text } from 'react-native-paper';

interface IntelligenceSummary {
  safeToSpend: number;
  criticalItem: string | null;
  message: string;
  status: 'ok' | 'warning' | 'danger';
}

interface IntelligenceCardProps {
  summary: IntelligenceSummary | null;
}

const IntelligenceCard = ({ summary }: IntelligenceCardProps) => {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (!summary || dismissed) return null;

  const getStatusConfig = () => {
    switch (summary.status) {
      case 'danger':
        return {
          color: '#FF453A',
          bg: 'rgba(255, 69, 58, 0.15)',
          icon: 'shield-alert-outline',
          title: 'تحليل الميزانية'
        };
      case 'warning':
        return {
          color: '#FFD60A',
          bg: 'rgba(255, 214, 10, 0.15)',
          icon: 'lightning-bolt-outline',
          title: 'تنبيه ذكي'
        };
      default:
        return {
          color: '#32D74B',
          bg: 'rgba(50, 215, 75, 0.15)',
          icon: 'auto-fix',
          title: 'الوضع ممتاز'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => router.push('/budget')}
        style={styles.cardTouchable}
      >
        <Card style={styles.card}>
          <View style={[styles.gradientOverlay, { borderLeftColor: config.color }]} />
          <Card.Content style={styles.content}>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
                    <Avatar.Icon 
                      size={24} 
                      icon={config.icon} 
                      style={{ backgroundColor: 'transparent' }} 
                      color={config.color} 
                    />
                </View>
                <Text style={[styles.statusTitle, { color: config.color }]}>
                  {config.title}
                </Text>
              </View>
              <IconButton 
                icon="close-circle-outline" 
                iconColor="rgba(255,255,255,0.3)" 
                size={20} 
                onPress={() => setDismissed(true)}
                style={styles.closeButton}
              />
            </View>

            <View style={styles.mainInfo}>
              <Text style={styles.safeToSpendLabel}>متاح للصرف اليوم</Text>
              <View style={styles.valueRow}>
                  <Text style={[styles.safeToSpendValue, { color: '#fff' }]}>
                    {summary.safeToSpend.toFixed(2)}
                  </Text>
                  <Text style={styles.currency}> د.ل</Text>
              </View>
            </View>

            <View style={styles.adviceBox}>
              <Text style={styles.adviceText}>{summary.message}</Text>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  cardTouchable: {
    width: '100%',
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 28,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    borderLeftWidth: 6,
  },
  content: {
      paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
      padding: 4,
      borderRadius: 12,
  },
  statusTitle: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  closeButton: {
    margin: -8,
  },
  mainInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  safeToSpendLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  valueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
  },
  safeToSpendValue: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  currency: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '600',
  },
  criticalItemBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.2)',
  },
  criticalLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  criticalValue: {
    color: '#FF453A',
    fontWeight: '800',
    fontSize: 13,
  },
  adviceBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    borderRadius: 18,
  },
  adviceText: {
    color: '#E5E5EA',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
});

export default IntelligenceCard;
