import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Card, Text } from 'react-native-paper';

interface ReportsChartsProps {
  monthlyChartData: { labels: string[], datasets: { data: number[] }[] };
  trendAnalysis?: { alarm: string, insight: string, isWarning: boolean } | null;
}

const screenWidth = Dimensions.get('window').width - 30;

const chartConfig = {
  backgroundColor: '#1C222E',
  backgroundGradientFrom: '#1C222E',
  backgroundGradientTo: '#1C222E',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0, 122, 204, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(142, 148, 165, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#007acc',
  },
};

const ReportsCharts = ({
  monthlyChartData,
  trendAnalysis,
}: ReportsChartsProps) => {
  return (
    <>
      {/* ====== 📈 التوجه المالي آخر 6 أشهر ====== */}
      {monthlyChartData.labels.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>📈 التوجه المالي (6 أشهر)</Text>
            <BarChart
              data={monthlyChartData}
              width={screenWidth}
              height={220}
              chartConfig={chartConfig}
              style={styles.barChart}
              yAxisLabel=""
              yAxisSuffix=""
            />
            
            {/* 🤖 التحليل الاستباقي (Burn-Rate & Seasonality) */}
            {trendAnalysis && (
              <View style={[styles.aiBox, trendAnalysis.isWarning ? styles.aiBoxWarning : styles.aiBoxSafe]}>
                <Text style={{ fontSize: 24, marginBottom: 5 }}>
                  {trendAnalysis.isWarning ? '🚨' : '🔮'}
                </Text>
                <Text style={[styles.aiAlarmText, trendAnalysis.isWarning ? {color: '#e74c3c'} : {color: '#2ecc71'}]}>
                  {trendAnalysis.alarm}
                </Text>
                <Text style={styles.aiInsightText}>
                  {trendAnalysis.insight}
                </Text>
              </View>
            )}
            
          </Card.Content>
        </Card>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 15, marginBottom: 20, backgroundColor: '#1C222E', borderRadius: 20, elevation: 4 },
  cardTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 10 },
  barChart: { borderRadius: 16, marginTop: 15 },
  aiBox: { padding: 15, borderRadius: 12, marginTop: 20, borderWidth: 1 },
  aiBoxWarning: { backgroundColor: 'rgba(231, 76, 60, 0.1)', borderColor: 'rgba(231, 76, 60, 0.3)' },
  aiBoxSafe: { backgroundColor: 'rgba(46, 204, 113, 0.1)', borderColor: 'rgba(46, 204, 113, 0.3)' },
  aiAlarmText: { fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  aiInsightText: { color: '#fff', lineHeight: 22, fontSize: 13 },
});

export default ReportsCharts;
