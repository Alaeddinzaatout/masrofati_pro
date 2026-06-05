import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';

interface WasteAnalysisCardProps {
  wasteAnalysis: any | null;
  loading: boolean;
  onAnalyze: () => void;
}

const WasteAnalysisCard = ({ wasteAnalysis, loading, onAnalyze }: WasteAnalysisCardProps) => {
  // استخراج القيم مع قيم افتراضية آمنة
  const wastePercent = wasteAnalysis?.wastePercent ?? wasteAnalysis?.overallWastePercent ?? 0;
  const essentialPercent = wasteAnalysis?.essentialPercent ?? (100 - wastePercent);
  const wasteBreakdown = wasteAnalysis?.wasteBreakdown ?? wasteAnalysis?.topWastedProducts ?? [];
  const advice = wasteAnalysis?.advice ?? '';
  const recommendations = wasteAnalysis?.recommendations ?? (advice ? [advice] : []);

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleLarge" style={styles.cardTitle}>♻️ تحليل الهدر</Text>
        <Text style={styles.cardDescription}>يصنف مشترياتك لأساسي وكمالي ويحسب نسبة الهدر</Text>
        <Button
          mode="contained"
          onPress={onAnalyze}
          loading={loading}
          icon="recycle"
          buttonColor="#2ecc71"
          style={styles.actionButton}
        >
          حلل الهدر الآن
        </Button>

        {wasteAnalysis && (
          <View style={{ marginTop: 20 }}>
            <View style={styles.wasteGauge}>
              <View style={[styles.wasteFill, {
                width: `${Math.min(wastePercent, 100)}%`,
                backgroundColor: wastePercent <= 15 ? '#2ecc71' :
                  wastePercent <= 30 ? '#f39c12' : '#e74c3c',
              }]} />
            </View>
            <Text style={styles.wastePercentText}>نسبة الهدر: {wastePercent}%</Text>

            <View style={styles.wasteStats}>
              <View style={styles.wasteStatItem}>
                <Text style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: 20 }}>{essentialPercent}%</Text>
                <Text style={styles.statLabel}>أساسي</Text>
              </View>
              <View style={styles.wasteStatItem}>
                <Text style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: 20 }}>{wastePercent}%</Text>
                <Text style={styles.statLabel}>هدر</Text>
              </View>
            </View>

            {wasteBreakdown.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 15 }}>الأصناف الأكثر هدراً:</Text>
                {wasteBreakdown.map((item: any, idx: number) => (
                  <View key={idx} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: '#8E94A5', fontSize: 13 }}>{item.name}</Text>
                      <Text style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: 13 }}>{(item.lostValue ?? item.amount ?? 0).toFixed(2)} د.ل</Text>
                    </View>
                    <View style={styles.itemBarBackground}>
                      <View style={[styles.itemBarFill, { width: `${Math.max(item.percentage ?? item.wastePercent ?? 5, 5)}%` }]} />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {wasteAnalysis.aiEnhanced ? (
              <View style={styles.roastBox}>
                <Text style={{ fontSize: 30, marginBottom: 5 }}>🔥</Text>
                <Text style={styles.roastText}>{wasteAnalysis.roast}</Text>
                <View style={styles.tipBox}>
                  <Text style={{ color: '#2ecc71', fontWeight: 'bold' }}>💡 بديل ذكي:</Text>
                  <Text style={{ color: '#fff', fontSize: 13, marginTop: 4 }}>{wasteAnalysis.substituteTip}</Text>
                </View>
              </View>
            ) : recommendations.length > 0 ? (
              <View style={styles.adviceBox}>
                <Text style={styles.adviceText}>{recommendations.join('\n')}</Text>
              </View>
            ) : null}
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 15, marginBottom: 20, backgroundColor: '#1C222E', borderRadius: 20, elevation: 4 },
  cardTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 10 },
  cardDescription: { color: '#8E94A5', marginBottom: 15 },
  actionButton: { borderRadius: 12, height: 48, justifyContent: 'center' },
  wasteGauge: { height: 12, backgroundColor: '#0A0E17', borderRadius: 6, overflow: 'hidden' },
  wasteFill: { height: '100%', borderRadius: 6 },
  wastePercentText: { textAlign: 'center', marginTop: 10, color: '#fff', fontWeight: 'bold' },
  wasteStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 15 },
  wasteStatItem: { alignItems: 'center' },
  statLabel: { color: '#8E94A5', fontSize: 12 },
  itemBarBackground: { height: 6, backgroundColor: '#0A0E17', borderRadius: 3 },
  itemBarFill: { height: '100%', backgroundColor: '#e74c3c', borderRadius: 3 },
  adviceBox: { padding: 15, backgroundColor: 'rgba(0, 122, 204, 0.1)', borderRadius: 12, marginTop: 15 },
  adviceText: { color: '#fff', lineHeight: 20, fontSize: 14 },
  roastBox: { padding: 20, backgroundColor: 'rgba(231, 76, 60, 0.1)', borderRadius: 16, marginTop: 20, borderWidth: 1, borderColor: 'rgba(231, 76, 60, 0.3)' },
  roastText: { color: '#fff', fontSize: 16, lineHeight: 24, fontStyle: 'italic', marginBottom: 15 },
  tipBox: { backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: 12, borderRadius: 10 },
});

export default WasteAnalysisCard;
