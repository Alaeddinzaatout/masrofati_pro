import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, TextInput, Text, IconButton } from 'react-native-paper';

interface ApiKeysCardProps {
  geminiKey: string;
  deepseekKey: string;
  testing: { gemini: boolean; deepseek: boolean };
  onSaveGemini: (key: string) => void;
  onTestGemini: (key: string) => void;
  onSaveDeepSeek: (key: string) => void;
  onTestDeepSeek: (key: string) => void;
}

const ApiKeysCard = ({
  geminiKey,
  deepseekKey,
  testing,
  onSaveGemini,
  onTestGemini,
  onSaveDeepSeek,
  onTestDeepSeek,
}: ApiKeysCardProps) => {
  const [gKey, setGKey] = useState(geminiKey);
  const [dKey, setDKey] = useState(deepseekKey);
  const [showG, setShowG] = useState(false);
  const [showD, setShowD] = useState(false);

  useEffect(() => {
    if (geminiKey) setGKey(geminiKey);
  }, [geminiKey]);

  useEffect(() => {
    if (deepseekKey) setDKey(deepseekKey);
  }, [deepseekKey]);

  const hasGKey = gKey.length > 10;
  const hasDKey = dKey.length > 10;

  return (
    <>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Text style={styles.cardTitle}>محرك Gemini (Google)</Text>
            <View style={[styles.statusDot, { backgroundColor: hasGKey ? '#2ecc71' : '#e74c3c' }]} />
          </View>
          <Text style={styles.cardSubtitle}>المسؤول عن قراءة الفواتير المعقدة والصور</Text>
          
          <TextInput
            label="مفتاح التشفير (API Key)"
            value={gKey}
            onChangeText={setGKey}
            mode="outlined"
            secureTextEntry={!showG}
            style={styles.input}
            textColor={hasGKey ? "#2ecc71" : "#fff"}
            outlineColor="rgba(255,255,255,0.1)"
            activeOutlineColor="#007acc"
            right={<TextInput.Icon icon={showG ? 'eye-off' : 'eye'} color="#8E94A5" onPress={() => setShowG(!showG)} />}
          />
          <View style={styles.buttonRow}>
            <Button mode="contained" onPress={() => onSaveGemini(gKey)} style={styles.flexButton} buttonColor="#007acc" icon="content-save">حفظ وربط</Button>
            <Button mode="contained-tonal" onPress={() => onTestGemini(gKey)} loading={testing.gemini} style={styles.testBtn} textColor="#007acc" buttonColor="rgba(0,122,204,0.1)" icon="shield-check">فحص</Button>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Text style={styles.cardTitle}>محرك DeepSeek (AI)</Text>
            <View style={[styles.statusDot, { backgroundColor: hasDKey ? '#2ecc71' : '#e74c3c' }]} />
          </View>
          <Text style={styles.cardSubtitle}>المسؤول عن التحليل المالي والنصوص الفائقة السرعة</Text>
          
          <TextInput
            label="مفتاح التشفير (API Key)"
            value={dKey}
            onChangeText={setDKey}
            mode="outlined"
            secureTextEntry={!showD}
            style={styles.input}
            textColor={hasDKey ? "#2ecc71" : "#fff"}
            outlineColor="rgba(255,255,255,0.1)"
            activeOutlineColor="#007acc"
            right={<TextInput.Icon icon={showD ? 'eye-off' : 'eye'} color="#8E94A5" onPress={() => setShowD(!showD)} />}
          />
          <View style={styles.buttonRow}>
            <Button mode="contained" onPress={() => onSaveDeepSeek(dKey)} style={styles.flexButton} buttonColor="#007acc" icon="content-save">حفظ وربط</Button>
            <Button mode="contained-tonal" onPress={() => onTestDeepSeek(dKey)} loading={testing.deepseek} style={styles.testBtn} textColor="#007acc" buttonColor="rgba(0,122,204,0.1)" icon="shield-check">فحص</Button>
          </View>
        </Card.Content>
      </Card>
    </>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 15, marginBottom: 20, backgroundColor: '#1C222E', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', elevation: 6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  cardTitle: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  cardSubtitle: { color: '#8E94A5', fontSize: 12, marginBottom: 15 },
  statusDot: { width: 10, height: 10, borderRadius: 5, elevation: 5 },
  input: { marginBottom: 15, backgroundColor: '#0A0E17' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  flexButton: { flex: 1, borderRadius: 12 },
  testBtn: { flex: 1, borderRadius: 12 },
});

export default ApiKeysCard;
