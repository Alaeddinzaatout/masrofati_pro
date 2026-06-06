import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Snackbar, Text, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useReportsLogic } from '../../src/hooks/useReportsLogic';
import BadgesSavingsCard from '../../src/components/reports/BadgesSavingsCard';
import WasteAnalysisCard from '../../src/components/reports/WasteAnalysisCard';
import ReportsCharts from '../../src/components/reports/ReportsCharts';

export default function ReportsScreen() {
  const router = useRouter();
  const {
    badges,
    totalSavings,
    loading,
    wasteAnalysis,
    trendAnalysis,
    filteredSummary,
    monthlyChartData,
    handlers,
    snackbar,
    accountStatus,
    isAdmin,
  } = useReportsLogic();

  if (!isAdmin && accountStatus === 'expired') {
    return (
      <View style={styles.container}>
        <View style={styles.centerBox}>
          <Ionicons name="lock-closed" size={80} color="#e74c3c" />
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 20, textAlign: 'center' }}>
            التقارير مقفلة 🔒
          </Text>
          <Text style={{ color: '#8E94A5', textAlign: 'center', marginTop: 10, marginBottom: 30 }}>
            التحليل المالي المتقدم والتقارير حصرية للنسخة برو.
          </Text>
          <Button 
            mode="contained" 
            buttonColor="#FFD700" 
            textColor="#000"
            style={{ borderRadius: 12, paddingHorizontal: 20 }}
            onPress={() => router.push('/upgrade')}
          >
            الترقية للنسخة برو
          </Button>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BadgesSavingsCard badges={badges} totalSavings={totalSavings} />

      <WasteAnalysisCard 
        wasteAnalysis={wasteAnalysis}
        loading={loading.waste}
        onAnalyze={handlers.onAnalyzeWaste}
      />

      <ReportsCharts 
        monthlyChartData={monthlyChartData}
        trendAnalysis={trendAnalysis}
      />

      <Snackbar 
        visible={snackbar.visible} 
        onDismiss={snackbar.hide} 
        style={styles.snackbar} 
        action={{ label: 'حسناً', textColor: '#fff' }}
      >
        {snackbar.message}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0A0E17', paddingVertical: 20 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  snackbar: { backgroundColor: '#1C222E', borderRadius: 12 },
});
