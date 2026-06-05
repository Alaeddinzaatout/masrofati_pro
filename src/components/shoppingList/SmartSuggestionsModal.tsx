import React from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { Button, Card, Chip, Divider, Modal, Portal, Searchbar, Text } from 'react-native-paper';
import { SmartSuggestion } from '../../hooks/useShoppingLogic';

interface SmartSuggestionsModalProps {
  visible: boolean;
  onDismiss: () => void;
  suggestions: SmartSuggestion[];
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onAccept: (name: string) => void;
  onReject: (name: string) => void;
}

const getSuggestionColor = (type: SmartSuggestion['type']) => {
  switch (type) {
    case 'urgent': return '#e74c3c';
    case 'seasonal': return '#f39c12';
    case 'smart': return '#3498db';
    default: return '#8E94A5';
  }
};

const SmartSuggestionsModal = ({
  visible,
  onDismiss,
  suggestions,
  searchQuery,
  onSearchChange,
  onAccept,
  onReject
}: SmartSuggestionsModalProps) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <View style={{ padding: 25 }}>
          <Text variant="titleLarge" style={styles.modalTitle}>
            🤖 مساعد جيمي الذكي المتقدم
          </Text>
          <Text style={styles.modalSubtitle}>
            يتعلم من عاداتك ويتنبأ باحتياجاتك
          </Text>

          <Searchbar
            placeholder="بحث في تاريخك..."
            value={searchQuery}
            onChangeText={onSearchChange}
            style={styles.searchbar}
            inputStyle={{ color: '#fff' }}
            iconColor="#007acc"
          />
        </View>

        <FlatList
          data={suggestions}
          keyExtractor={(item, index) => item.name + index}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <Card style={[styles.smartCard, { borderRightColor: getSuggestionColor(item.type) }]}>
              <View style={styles.smartCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.smartName}>{item.name}</Text>
                      <Chip 
                        compact 
                        textStyle={{ fontSize: 10, color: '#fff' }}
                        style={{ backgroundColor: getSuggestionColor(item.type) }}
                      >
                        {item.type === 'urgent' ? '🔴 عاجل' : 
                         item.type === 'seasonal' ? '📅 موسمي' : '💡 ذكي'}
                      </Chip>
                    </View>

                    <Text style={styles.smartReason}>{item.reason}</Text>

                    <View style={styles.smartStats}>
                      {item.currentStock !== undefined && (
                        <Text style={[styles.smartStat, { color: item.currentStock < 0.5 ? '#e74c3c' : '#2ecc71' }]}>
                          📦 المخزون: {item.currentStock.toFixed(1)}
                        </Text>
                      )}
                      {item.predictedRunOut && (
                        <Text style={styles.smartStat}>📅 يكفي لـ {item.predictedRunOut}</Text>
                      )}
                    </View>

                    <View style={styles.confidenceBar}>
                      <View style={[styles.confidenceFill, { width: `${Math.min(item.confidence * 100, 100)}%` }]} />
                    </View>
                    <Text style={styles.confidenceText}>
                      نسبة التأكد: {Math.round(item.confidence * 100)}%
                    </Text>
                  </View>
                </View>

              <Divider style={styles.divider} />

              <View style={styles.smartActions}>
                <Button
                  mode="outlined"
                  icon="close"
                  onPress={() => onReject(item.name)}
                  textColor="#e74c3c"
                  style={styles.actionBtnReject}
                  compact
                >
                  ليس الآن
                </Button>
                <Button
                  mode="contained"
                  icon="plus"
                  onPress={() => onAccept(item.name)}
                  buttonColor="#2ecc71"
                  style={styles.actionBtnAccept}
                  compact
                >
                  أضف
                </Button>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <View style={{ padding: 20 }}>
              <Text style={{ color: '#8E94A5', textAlign: 'center' }}>
                {searchQuery ? 'لا توجد نتائج' : 'استمر في تسجيل مشترياتك ليتعلم جيمي نمط استهلاكك 💡'}
              </Text>
            </View>
          }
        />
        <Button onPress={onDismiss} textColor="#8E94A5">إغلاق</Button>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: { backgroundColor: '#1C222E', margin: 20, borderRadius: 24, maxHeight: '90%', paddingBottom: 15 },
  modalTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  modalSubtitle: { color: '#8E94A5', textAlign: 'center', marginBottom: 15, fontSize: 12 },
  searchbar: { backgroundColor: '#0A0E17', borderRadius: 12, elevation: 0 },
  smartCard: { backgroundColor: '#0A0E17', borderRadius: 16, marginBottom: 12, padding: 16, borderRightWidth: 4 },
  smartCardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  smartName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  smartReason: { color: '#8E94A5', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  smartStats: { flexDirection: 'row', gap: 15, marginTop: 10 },
  smartStat: { fontSize: 11, fontWeight: 'bold' },
  confidenceBar: { height: 4, backgroundColor: '#2a3142', borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  confidenceFill: { height: '100%', backgroundColor: '#2ecc71', borderRadius: 2 },
  confidenceText: { color: '#8E94A5', fontSize: 10, marginTop: 4, textAlign: 'right' },
  divider: { backgroundColor: '#2a3142', marginVertical: 10 },
  smartActions: { flexDirection: 'row', gap: 10 },
  actionBtnReject: { flex: 1, borderColor: '#e74c3c' },
  actionBtnAccept: { flex: 1 }
});

export default SmartSuggestionsModal;
