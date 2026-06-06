import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
import { Card, Text, Divider, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { auth } from '../../firebase/config';
import { aiManager } from '../../services/aiServiceManager';
import { checkAccess, recordUsage, showQuotaAlert, checkAndIncrementDailyQuota } from '../../services/subscription';
import { BudgetStats } from '../../types';

interface BudgetIntelligenceCardProps {
  stats: BudgetStats;
}

const BudgetIntelligenceCard = ({ stats }: BudgetIntelligenceCardProps) => {
  const router = useRouter();
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAiAdvice = async () => {
    if (stats.budget <= 0) return;

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // 1. كوتا يومية (حماية API)
    const quota = await checkAndIncrementDailyQuota(uid, 'cop');
    if (!quota.allowed) {
      setAiMessage("👮‍♂️ يا مواطن، راجعت ميزانيتك بما فيه الكفاية اليوم وعطيتك الخلاصة! طبّق النصائح اللي قلتلك عليها، وسكر محفظتك، وتفضل راجعني بكرة!");
      return;
    }

    // 2. كوتا تجريبية (لو لسه ما اشتركش)
    const access = await checkAccess(uid, 'question');
    if (!access.allowed) {
      showQuotaAlert(router);
      return;
    }

    setLoading(true);
    try {
      const systemPrompt = `أنت "شرطي الميزانية" الليبي الفكاهي والمرح.
مهمتك تحليل ميزانية المستخدم بذكاء وروح فكاهية عالية جداً وبلهجة ليبية دارجة (طرابلسية، بنغازية، شرقية، إلخ).
- إذا كان الصرف ممتازاً: امدحه بطريقة "فركسة" ومرحة (مثلاً: يا بطل، ميزانيتك ماشية زي الساعة، استمر وتوا تشري اللمبورغيني!).
- إذا كان الصرف زائداً: نبهه بأسلوب ساخر ومضحك (Sarcastic) بدون تجريح أو سب (مثلاً: يا غالي، أنت تصرف كأنك وارث بئر نفط! نقص من القهاوي والشوكلاتة راهي الميزانية بدت تعرج).
- استخدم أمثال شعبية ليبية عن الفلوس بطريقة مضحكة.
- الرد يجب أن يكون جملتين فقط، مرحاً، ومحفزاً.
أرجع الرد كـ JSON فقط: {"message": "الرسالة..."}`;

      const userPrompt = `الميزانية: ${stats.budget}. الصرف: ${stats.spent}. المتبقي: ${stats.remaining}.
معدل الحرق اليومي: ${stats.dailyBurnRate}.
المتوقع نهاية الشهر: ${stats.projectedMonthEnd}.
الحد الآمن اليومي: ${stats.safeToSpendDaily}.`;

      const result = await aiManager.askGenericText(systemPrompt, userPrompt);
      if (result && result.message) {
        setAiMessage(result.message);
        // Deduct trial usage after successful response
        await recordUsage(uid, 'question');
      }
    } catch (e) {
      console.warn('Budget AI failed');
      setAiMessage('الشرطي راقد توا، حاول مرة ثانية!');
    } finally {
      setLoading(false);
    }
  };

  if (stats.budget <= 0) return null;

  const isWarning = stats.projectedMonthEnd > stats.budget;

  return (
    <Card style={[styles.card, isWarning && styles.warningCard]}>
      <Card.Content>
        <Text style={styles.cardTitle}>رادار الإفلاس 🔮</Text>

        <View style={styles.intelRow}>
          <View style={styles.intelItem}>
            <Text style={styles.intelLabel}>سرعة الصرف (يومياً)</Text>
            <Text style={styles.intelValue}>{stats.dailyBurnRate.toFixed(1)} <Text style={styles.currency}>د.ل</Text></Text>
          </View>
          <View style={[styles.intelItem, { alignItems: 'flex-end' }]}>
            <Text style={styles.intelLabel}>المتوقع نهاية الشهر</Text>
            <Text style={[styles.intelValue, isWarning && { color: '#e74c3c' }]}>
              {stats.projectedMonthEnd.toFixed(0)} <Text style={[styles.currency, isWarning && { color: '#e74c3c' }]}>د.ل</Text>
            </Text>
          </View>
        </View>

        <View style={styles.safeBox}>
          <Text style={styles.safeLabel}>المسموح صرفه يومياً حتى نهاية الشهر</Text>
          <Text style={styles.safeValue}>{stats.safeToSpendDaily.toFixed(1)} <Text style={{fontSize: 14, fontWeight: 'normal'}}>د.ل</Text></Text>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.aiBox}>
          <Text style={{ fontSize: 24, marginBottom: 5 }}>{isWarning ? '👮‍♂️' : '👼'}</Text>
          {loading ? (
             <ActivityIndicator size="small" color="#007acc" style={{ marginTop: 10 }} />
          ) : aiMessage ? (
             <Text style={[styles.aiText, isWarning && { color: '#e74c3c' }]}>
               {aiMessage}
             </Text>
          ) : (
             <View style={{ alignItems: 'center' }}>
               <Text style={[styles.aiText, { marginBottom: 10 }]}>
                 {isWarning ? 'راك تفلس يا غالي، نقص السرعة!' : 'أمورك طيبة، استمر في هذا النمط.'}
               </Text>
               <Button mode="outlined" onPress={fetchAiAdvice} textColor="#007acc" style={{ borderColor: '#007acc' }}>
                 اسأل شرطي الميزانية
               </Button>
             </View>
          )}
        </View>

      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 15, marginBottom: 20, backgroundColor: '#1C222E', borderRadius: 24, elevation: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  warningCard: { borderColor: 'rgba(231, 76, 60, 0.3)' },
  cardTitle: { color: '#8E94A5', fontSize: 14, fontWeight: 'bold', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  intelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  intelItem: { flex: 1 },
  intelLabel: { color: '#8E94A5', fontSize: 11, marginBottom: 4 },
  intelValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  currency: { fontSize: 12, fontWeight: 'normal', color: '#8E94A5' },
  divider: { backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 15 },
  safeBox: { padding: 15, backgroundColor: 'rgba(0, 122, 204, 0.1)', borderRadius: 16, alignItems: 'center', marginBottom: 15 },
  safeLabel: { color: '#8E94A5', fontSize: 12, textAlign: 'center', marginBottom: 5 },
  safeValue: { color: '#007acc', fontSize: 28, fontWeight: 'bold' },
  aiBox: { alignItems: 'center', paddingHorizontal: 10 },
  aiText: { color: '#fff', fontSize: 14, lineHeight: 22, textAlign: 'center', fontStyle: 'italic' },
});

export default BudgetIntelligenceCard;
