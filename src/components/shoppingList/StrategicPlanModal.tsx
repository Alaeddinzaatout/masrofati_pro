import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Divider, Modal, Portal, Text } from 'react-native-paper';

interface StrategicPlanModalProps {
  visible: boolean;
  onDismiss: () => void;
  plan: any | null;
}

const StrategicPlanModal = ({ visible, onDismiss, plan }: StrategicPlanModalProps) => {
  if (!plan) return null;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text variant="headlineSmall" style={styles.title}>🎯 خطة التوفير الذكية</Text>
          <Text style={styles.subtitle}>بناءً على مشترياتك السابقة وأسعار السوق</Text>

          {/* الخيار الأول: المحل الموصى به للفاتورة كاملة */}
          <Card style={styles.recommendCard}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: '#fff', marginBottom: 5 }}>🏠 أفضل محل للكل</Text>
              <Text variant="headlineSmall" style={{ color: '#2ecc71', fontWeight: 'bold' }}>
                {plan.recommendedStore.name}
              </Text>
              <Text style={{ color: '#8E94A5', marginTop: 5 }}>
                التكلفة التقديرية: {plan.recommendedStore.estimatedTotal.toFixed(2)} د.ل
              </Text>
              {plan.recommendedStore.missingItems > 0 && (
                <Text style={{ color: '#f39c12', fontSize: 12 }}>
                  ⚠️ يفتقد لـ {plan.recommendedStore.missingItems} أصناف من قائمتك
                </Text>
              )}
            </Card.Content>
          </Card>

          {/* الخيار الثاني: خطة التقسيم للتوفير الأقصى */}
          <Card style={[styles.card, { marginTop: 20 }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: '#fff', marginBottom: 10 }}>🔀 خطة التوفير الأقصى</Text>
              <View style={styles.savingsBox}>
                <Text style={styles.savingsLabel}>بتقسيم مشترياتك يمكنك توفير:</Text>
                <Text style={styles.savingsValue}>{plan.optimizedSplit.potentialSavings.toFixed(2)} د.ل</Text>
              </View>

              <Divider style={{ marginVertical: 15, backgroundColor: '#2a3142' }} />

              {plan.optimizedSplit.items.map((item: any, idx: number) => (
                <View key={idx} style={styles.splitItem}>
                  <Text style={{ color: '#fff', flex: 1 }}>{item.productName}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#007acc', fontWeight: 'bold' }}>{item.bestStore}</Text>
                    <Text style={{ color: '#8E94A5', fontSize: 11 }}>{item.price.toFixed(2)} د.ل</Text>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>

          <Button mode="contained" onPress={onDismiss} style={styles.closeBtn} buttonColor="#007acc">
            فهمت، شكراً!
          </Button>
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: { backgroundColor: '#1C222E', margin: 20, borderRadius: 24, padding: 25, maxHeight: '85%' },
  title: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: '#8E94A5', textAlign: 'center', marginBottom: 20, fontSize: 12 },
  recommendCard: { backgroundColor: '#2a3142', borderRadius: 16, borderLeftWidth: 5, borderLeftColor: '#2ecc71' },
  card: { backgroundColor: '#0A0E17', borderRadius: 16 },
  savingsBox: { padding: 15, backgroundColor: 'rgba(46, 204, 113, 0.1)', borderRadius: 12, alignItems: 'center' },
  savingsLabel: { color: '#8E94A5', fontSize: 12 },
  savingsValue: { color: '#2ecc71', fontSize: 24, fontWeight: 'bold' },
  splitItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  closeBtn: { marginTop: 25, borderRadius: 12, height: 50, justifyContent: 'center' },
});

export default StrategicPlanModal;
