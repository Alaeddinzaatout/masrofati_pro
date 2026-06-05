import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { useReportsLogic } from '../../src/hooks/useReportsLogic';
import BadgesSavingsCard from '../../src/components/reports/BadgesSavingsCard';
import WasteAnalysisCard from '../../src/components/reports/WasteAnalysisCard';
import ReportsCharts from '../../src/components/reports/ReportsCharts';

export default function ReportsScreen() {
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
  } = useReportsLogic();

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
  snackbar: { backgroundColor: '#1C222E', borderRadius: 12 },
});
