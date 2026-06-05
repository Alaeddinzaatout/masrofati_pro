import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, TextInput, Text, IconButton } from 'react-native-paper';

interface ApiKeysCardProps {
  geminiKey: string;
  cerebrasKey: string;
  testing: { gemini: boolean; cerebras: boolean };
  onSaveGemini: (key: string) => void;
  onTestGemini: (key: string) => void;
  onSaveCerebras: (key: string) => void;
  onTestCerebras: (key: string) => void;
}

const ApiKeysCard = ({
  geminiKey,
  cerebrasKey,
  testing,
  onSaveGemini,
  onTestGemini,
  onSaveCerebras,
  onTestCerebras,
}: ApiKeysCardProps) => {
  const [gKey, setGKey] = useState(geminiKey);
  const [cKey, setCKey] = useState(cerebrasKey);
  const [showG, setShowG] = useState(false);
  const [showC, setShowC] = useState(false);

  useEffect(() => {
    if (geminiKey) setGKey(geminiKey);
  }, [geminiKey]);

  useEffect(() => {
    if (cerebrasKey) setCKey(cerebrasKey);
  }, [cerebrasKey]);

  const hasGKey = gKey.length > 10;
  const hasCKey = cKey.length > 10;

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
            <Text style={styles.cardTitle}>محرك Cerebras (Cloud)</Text>
            <View style={[styles.statusDot, { backgroundColor: hasCKey ? '#2ecc71' : '#e74c3c' }]} />
          </View>
          <Text style={styles.cardSubtitle}>المسؤول عن التحليل المالي والنصوص الفائقة السرعة</Text>
          
          <TextInput
            label="مفتاح التشفير (API Key)"
            value={cKey}
            onChangeText={setCKey}
            mode="outlined"
            secureTextEntry={!showC}
            style={styles.input}
            textColor={hasCKey ? "#2ecc71" : "#fff"}
            outlineColor="rgba(255,255,255,0.1)"
            activeOutlineColor="#007acc"
            right={<TextInput.Icon icon={showC ? 'eye-off' : 'eye'} color="#8E94A5" onPress={() => setShowC(!showC)} />}
          />
          <View style={styles.buttonRow}>
            <Button mode="contained" onPress={() => onSaveCerebras(cKey)} style={styles.flexButton} buttonColor="#007acc" icon="content-save">حفظ وربط</Button>
            <Button mode="contained-tonal" onPress={() => onTestCerebras(cKey)} loading={testing.cerebras} style={styles.testBtn} textColor="#007acc" buttonColor="rgba(0,122,204,0.1)" icon="shield-check">فحص</Button>
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
