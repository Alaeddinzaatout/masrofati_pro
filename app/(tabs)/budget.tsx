import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Snackbar, Text } from 'react-native-paper';
import { useBudgetLogic } from '../../src/hooks/useBudgetLogic';
import BudgetInputCard from '../../src/components/budget/BudgetInputCard';
import BudgetStatusCard from '../../src/components/budget/BudgetStatusCard';
import BudgetIntelligenceCard from '../../src/components/budget/BudgetIntelligenceCard';

export default function BudgetScreen() {
  const {
    budget,
    setBudget,
    isEditing,
    setIsEditing,
    stats,
    actions
  } = useBudgetLogic();

  const [snack, setSnack] = useState({ visible: false, message: '' });

  const handleSaveBudget = async (val: string) => {
    const success = await actions.saveBudget(val);
    if (success) {
      setSnack({ visible: true, message: isEditing ? 'تم تعديل الميزانية بنجاح' : 'تم حفظ الميزانية بنجاح' });
    }
  };

  const handleClearBudget = async () => {
    await actions.clearBudget();
    setSnack({ visible: true, message: 'تم مسح الميزانية' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 الميزانية الذكية</Text>
        <Text style={styles.headerSubtitle}>راقب مصاريفك، وتجنب الإفلاس بذكاء</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <BudgetStatusCard stats={stats} />

        <BudgetIntelligenceCard stats={stats} />

        <BudgetInputCard 
          budget={budget}
          savedBudget={stats.budget}
          isEditing={isEditing}
          onBudgetChange={setBudget}
          onSave={handleSaveBudget}
          onClear={handleClearBudget}
          onStartEditing={() => setIsEditing(true)}
          onCancelEditing={() => setIsEditing(false)}
        />

        <View style={{height: 40}} />
      </ScrollView>

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack({ ...snack, visible: false })}
        action={{ label: 'حسناً', textColor: '#fff' }}
        style={styles.snackbar}
      >
        {snack.message}
      </Snackbar>

      {stats.isOverBudget && (
        <Snackbar
          visible={true}
          onDismiss={() => {}}
          action={{ label: 'حسناً', textColor: '#fff' }}
          style={styles.snackbarError}
        >
          ⚠️ لقد تجاوزت ميزانيتك الشهرية!
        </Snackbar>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { padding: 25, paddingTop: 50, backgroundColor: '#1C222E', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5, zIndex: 10 },
  headerTitle: { color: '#007acc', fontWeight: 'bold', textAlign: 'center', fontSize: 24 },
  headerSubtitle: { color: '#8E94A5', textAlign: 'center', marginTop: 5 },
  scrollContent: { paddingVertical: 20 },
  snackbar: { backgroundColor: '#1C222E', borderRadius: 12 },
  snackbarError: { backgroundColor: '#e74c3c', borderRadius: 12, bottom: 80 },
});
