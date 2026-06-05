import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB, Snackbar } from 'react-native-paper';
import PurchaseList from '../../src/components/home/PurchaseList';
import StatsSummary from '../../src/components/home/StatsSummary';
import AdvisorModal from '../../src/components/home/AdvisorModal';
import FilterHeader from '../../src/components/home/FilterHeader';
import HomeHeader from '../../src/components/home/HomeHeader';
import PurchaseFormModal from '../../src/components/home/PurchaseFormModal';
import IntelligenceCard from '../../src/components/home/IntelligenceCard';
import { useHomeLogic } from '../../src/hooks/useHomeLogic';

export default function HomeScreen() {
  const {
    form,
    setForm,
    modalVisible,
    setModalVisible,
    editItem,
    searchQuery,
    setSearchQuery,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    snackVisible,
    setSnackVisible,
    snackMessage,
    advisorAlert,
    advisorVisible,
    setAdvisorVisible,
    intelligenceSummary,
    filteredPurchases,
    stats,
    handleAddPurchase,
    handleEditItem,
    handleDeleteItem,
  } = useHomeLogic();

  return (
    <View style={styles.container}>
      <HomeHeader />

      <FilterHeader 
        searchQuery={searchQuery}
        selectedMonth={selectedMonth}
        availableMonths={availableMonths}
        onSearchChange={setSearchQuery}
        onMonthChange={setSelectedMonth}
      />

      <IntelligenceCard summary={intelligenceSummary} />

      <PurchaseList 
        data={filteredPurchases}
        onEdit={handleEditItem}
        onDelete={handleDeleteItem}
        searchQuery={searchQuery}
      />

      <StatsSummary 
        count={stats.count} 
        total={stats.total} 
        avgPrice={stats.avgPrice} 
      />

      <PurchaseFormModal 
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        form={form}
        onFormChange={setForm}
        onSubmit={handleAddPurchase}
        isEditing={!!editItem}
      />

      <AdvisorModal 
        visible={advisorVisible} 
        onDismiss={() => setAdvisorVisible(false)} 
        alert={advisorAlert} 
      />

      <FAB 
        icon="plus" 
        style={styles.fab} 
        onPress={() => setModalVisible(true)} 
        color="#fff" 
      />

      <Snackbar 
        visible={snackVisible} 
        onDismiss={() => setSnackVisible(false)} 
        action={{ label: 'حسناً', textColor: '#fff' }} 
        style={styles.snackbar}
      >
        {snackMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 90, backgroundColor: '#007acc', borderRadius: 16 },
  snackbar: { backgroundColor: '#1C222E', borderRadius: 12 },
});
