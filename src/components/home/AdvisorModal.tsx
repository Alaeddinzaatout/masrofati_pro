import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text } from 'react-native-paper';

interface BestDeal {
  store: string;
  unitPrice: number;
}

interface AdvisorAlert {
  message: string;
  bestDeal?: BestDeal | null;
}

interface AdvisorModalProps {
  visible: boolean;
  onDismiss: () => void;
  alert: AdvisorAlert | null;
}

const AdvisorModal = ({ visible, onDismiss, alert }: AdvisorModalProps) => {
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.advisorModal}>
        {alert && (
          <>
            <Text style={styles.emoji}>💡</Text>
            <Text variant="titleLarge" style={styles.title}>
              {alert.message}
            </Text>
            {alert.bestDeal && (
              <View style={styles.bestDealContainer}>
                <Text style={styles.bestDealLabel}>
                  🏆 أفضل صفقة:
                </Text>
                <Text style={styles.bestDealText}>
                  {alert.bestDeal.store} — {alert.bestDeal.unitPrice} د.ل
                </Text>
              </View>
            )}
            <Button 
              mode="contained" 
              onPress={onDismiss} 
              style={styles.button} 
              buttonColor="#2ecc71"
            >
              تمام، شكراً!
            </Button>
          </>
        )}
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  advisorModal: { backgroundColor: '#1C222E', padding: 30, margin: 20, borderRadius: 24 },
  emoji: { fontSize: 40, textAlign: 'center', marginBottom: 10 },
  title: { textAlign: 'center', marginBottom: 10, color: '#2ecc71' },
  bestDealContainer: { padding: 15, backgroundColor: 'rgba(46, 204, 113, 0.1)', borderRadius: 12, marginTop: 10 },
  bestDealLabel: { fontWeight: 'bold', textAlign: 'center', marginBottom: 5, color: '#fff' },
  bestDealText: { textAlign: 'center', color: '#2ecc71', fontSize: 16 },
  button: { marginTop: 15, borderRadius: 12 },
});

export default AdvisorModal;
