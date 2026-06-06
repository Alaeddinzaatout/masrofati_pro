import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB, Snackbar, Button, Text } from 'react-native-paper';
import PurchaseList from '../../src/components/home/PurchaseList';
import StatsSummary from '../../src/components/home/StatsSummary';
import AdvisorModal from '../../src/components/home/AdvisorModal';
import FilterHeader from '../../src/components/home/FilterHeader';
import HomeHeader from '../../src/components/home/HomeHeader';
import PurchaseFormModal from '../../src/components/home/PurchaseFormModal';
import IntelligenceCard from '../../src/components/home/IntelligenceCard';
import { useHomeLogic } from '../../src/hooks/useHomeLogic';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
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
    accountStatus,
    daysLeft,
    isAdmin,
    filteredPurchases,
    stats,
    handleAddPurchase,
    handleEditItem,
    handleDeleteItem,
  } = useHomeLogic();

  return (
    <View style={styles.container}>
      <HomeHeader />

      {isAdmin && (
        <View style={{ backgroundColor: 'rgba(0, 122, 204, 0.1)', marginHorizontal: 15, marginTop: 10, padding: 10, borderRadius: 12, borderRightWidth: 4, borderRightColor: '#007acc', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#007acc', fontSize: 13, fontWeight: 'bold' }}>👑 حساب الإدارة (Admin)</Text>
        </View>
      )}

      {!isAdmin && accountStatus === 'trial' && (
        <View style={{ backgroundColor: '#1C222E', marginHorizontal: 15, marginTop: 10, padding: 10, borderRadius: 12, borderRightWidth: 4, borderRightColor: '#3498db', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>⏳ تجربة مجانية: {daysLeft} أيام متبقية</Text>
          <Button mode="text" compact onPress={() => router.push('/upgrade')} labelStyle={{ fontSize: 11, color: '#FFD700' }}>ترقية ✨</Button>
        </View>
      )}

      {!isAdmin && accountStatus === 'pro' && (
        <View style={{ backgroundColor: 'rgba(255, 215, 0, 0.1)', marginHorizontal: 15, marginTop: 10, padding: 8, borderRadius: 12, borderRightWidth: 4, borderRightColor: '#FFD700', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: 'bold' }}>👑 النسخة برو: {daysLeft} أيام متبقية</Text>
        </View>
      )}

      {!isAdmin && accountStatus === 'expired' && (
        <View style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', marginHorizontal: 15, marginTop: 10, padding: 10, borderRadius: 12, borderRightWidth: 4, borderRightColor: '#e74c3c', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#e74c3c', fontSize: 13, fontWeight: 'bold' }}>❌ انتهى الاشتراك</Text>
          <Button mode="contained" compact buttonColor="#FFD700" textColor="#000" onPress={() => router.push('/upgrade')} labelStyle={{ fontSize: 11 }}>تجديد 🚀</Button>
        </View>
      )}

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
