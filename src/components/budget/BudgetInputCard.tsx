import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, TextInput, Text } from 'react-native-paper';

interface BudgetInputCardProps {
  budget: string;
  savedBudget: number;
  isEditing: boolean;
  onBudgetChange: (text: string) => void;
  onSave: (newBudget: string) => void;
  onClear: () => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
}

const BudgetInputCard = ({
  budget,
  savedBudget,
  isEditing,
  onBudgetChange,
  onSave,
  onClear,
  onStartEditing,
  onCancelEditing,
}: BudgetInputCardProps) => {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleLarge" style={styles.cardTitle}>🎯 الميزانية الشهرية</Text>
        
        {savedBudget > 0 && !isEditing ? (
          <View>
            <Text style={styles.currentBudgetText}>
              ميزانيتك الحالية: {savedBudget.toFixed(2)} د.ل
            </Text>
            <View style={styles.buttonRow}>
              <Button 
                mode="contained" 
                onPress={onStartEditing} 
                icon="pencil-outline"
                style={styles.actionButton}
                buttonColor="#007acc"
              >
                تعديل
              </Button>
              <Button 
                mode="outlined" 
                onPress={onClear} 
                icon="trash-can-outline"
                textColor="#e74c3c"
                style={[styles.actionButton, { borderColor: '#e74c3c' }]}
              >
                مسح
              </Button>
            </View>
          </View>
        ) : (
          <View>
            <TextInput
              label={isEditing ? "الميزانية الجديدة" : "أدخل ميزانيتك الشهرية"}
              value={budget}
              onChangeText={onBudgetChange}
              mode="flat"
              keyboardType="numeric"
              style={styles.input}
              textColor="#fff"
            />
            <Button mode="contained" onPress={() => onSave(budget)} style={styles.saveButton} buttonColor="#007acc">
              {isEditing ? 'حفظ التعديل' : 'حفظ الميزانية'}
            </Button>
            {isEditing && (
              <Button 
                mode="text" 
                onPress={onCancelEditing} 
                style={{ marginTop: 10 }}
                textColor="#8E94A5"
              >
                إلغاء التعديل
              </Button>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 15, marginBottom: 20, backgroundColor: '#1C222E', borderRadius: 20, elevation: 4 },
  cardTitle: { color: '#fff', marginBottom: 20, fontWeight: 'bold' },
  currentBudgetText: { textAlign: 'center', fontSize: 20, marginBottom: 20, color: '#007acc', fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1, borderRadius: 12 },
  input: { marginBottom: 15, backgroundColor: '#0A0E17', borderRadius: 12 },
  saveButton: { borderRadius: 12, height: 50, justifyContent: 'center' },
});

export default BudgetInputCard;
