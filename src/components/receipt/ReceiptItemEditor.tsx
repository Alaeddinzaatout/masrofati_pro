import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, IconButton, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { EditableItem, ValidationIssue } from '../../types';

interface ReceiptItemEditorProps {
  items: EditableItem[];
  storeName: string;
  receiptDate: string;
  validationIssues: ValidationIssue[];
  loading: boolean;
  onUpdateItem: (index: number, field: keyof EditableItem, value: string) => void;
  onSplitItem: (index: number, parts: number) => void;
  onSaveAll: () => void;
  onCancel: () => void;
  onUpdateDate: (date: string) => void;
  onUpdateStore: (name: string) => void;
}

const SplitOption = ({ num, onPress }: { num: number; onPress: (n: number) => void }) => (
  <Pressable style={styles.splitOption} onPress={() => onPress(num)}>
    <Text style={styles.splitOptionText}>{num}</Text>
  </Pressable>
);

const ReceiptItemEditor = ({
  items,
  storeName,
  receiptDate,
  validationIssues,
  loading,
  onUpdateItem,
  onSplitItem,
  onSaveAll,
  onCancel,
  onUpdateDate,
  onUpdateStore,
}: ReceiptItemEditorProps) => {
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [splitItemIndex, setSplitItemIndex] = useState<number | null>(null);

  const openSplitModal = (index: number) => {
    setSplitItemIndex(index);
    setSplitModalVisible(true);
  };

  const handleSplitConfirm = (parts: number) => {
    if (splitItemIndex !== null) {
      onSplitItem(splitItemIndex, parts);
      setSplitModalVisible(false);
    }
  };

  const hasErrors = validationIssues.length > 0;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.cardHeaderTitle}>🛒 مراجعة الفاتورة</Text>
        <Text style={styles.cardHeaderSubtitle}>قام الذكاء الاصطناعي باستخراج البيانات، يمكنك تعديل أي خطأ.</Text>
        
        <View style={styles.globalFields}>
          <TextInput 
            label="اسم المحل" 
            value={storeName}
            onChangeText={onUpdateStore} 
            mode="outlined" 
            style={[styles.input, { flex: 1, marginRight: 10 }]} 
            textColor="#fff" 
            outlineColor="rgba(142,148,165,0.2)"
            activeOutlineColor="#007acc"
          />
          <TextInput 
            label="التاريخ" 
            value={receiptDate}
            onChangeText={onUpdateDate} 
            mode="outlined" 
            style={[styles.input, { flex: 0.8 }]} 
            textColor="#fff" 
            outlineColor="rgba(142,148,165,0.2)"
            activeOutlineColor="#007acc"
          />
        </View>

        {items.map((item, index) => {
          const itemIssues = validationIssues.filter(issue => issue.name === item.name || ((issue as any).index === index && !item.name));
          const isUnverified = itemIssues.length > 0;
          const hasNameError = !item.name || item.name === 'null' || item.name.trim() === '';
          const hasPriceError = parseFloat(item.price) <= 0;
          const hasQtyError = parseFloat(item.qty) <= 0;

          return (
            <View key={item._id || index} style={[styles.itemEditor, isUnverified && styles.unverifiedItem]}>
              <View style={styles.itemHeader}>
                <TextInput 
                  label={hasNameError ? "⚠️ ضع اسم الصنف" : "الصنف"}
                  value={item.name === 'null' ? '' : item.name} 
                  onChangeText={(text) => onUpdateItem(index, 'name', text)}
                  mode="outlined" 
                  style={[styles.input, { flex: 1 }]} 
                  textColor="#fff" 
                  error={hasNameError}
                  outlineColor={isUnverified ? "#e74c3c" : "rgba(142,148,165,0.2)"}
                  activeOutlineColor="#007acc"
                />
                <IconButton 
                  icon="call-split" 
                  iconColor="#007acc" 
                  containerColor="rgba(0,122,204,0.1)"
                  size={24}
                  onPress={() => openSplitModal(index)} 
                />
              </View>
              <View style={styles.grid}>
                <TextInput 
                  label="الإجمالي (د.ل)" 
                  value={item.price}
                  onChangeText={(text) => onUpdateItem(index, 'price', text)} 
                  mode="outlined"
                  keyboardType="numeric" 
                  style={[styles.input, styles.gridItem]} 
                  textColor="#2ecc71" 
                  error={hasPriceError}
                  outlineColor="rgba(142,148,165,0.2)"
                  activeOutlineColor="#2ecc71"
                />
                <TextInput 
                  label="الكمية" 
                  value={item.qty}
                  onChangeText={(text) => onUpdateItem(index, 'qty', text)} 
                  mode="outlined"
                  keyboardType="numeric" 
                  style={[styles.input, styles.gridItem]} 
                  textColor="#fff" 
                  error={hasQtyError}
                  outlineColor="rgba(142,148,165,0.2)"
                  activeOutlineColor="#007acc"
                />
                <TextInput 
                  label="الفئة" 
                  value={item.category}
                  onChangeText={(text) => onUpdateItem(index, 'category', text)} 
                  mode="outlined"
                  style={[styles.input, styles.gridItem]} 
                  textColor="#fff" 
                  outlineColor="rgba(142,148,165,0.2)"
                  activeOutlineColor="#007acc"
                />
              </View>
            </View>
          );
        })}
      </Card.Content>
      <View style={styles.actions}>
        <Button 
          mode="contained" 
          onPress={onSaveAll}
          buttonColor={hasErrors ? '#8E94A5' : '#2ecc71'}
          style={styles.saveBtn}
          labelStyle={styles.saveBtnText}
          disabled={hasErrors || loading}
          icon={hasErrors ? "alert" : "check"}
        >
          {hasErrors ? 'يجب تصحيح الأخطاء (الأحمر)' : loading ? 'جاري الحفظ...' : 'حفظ الفاتورة ✅'}
        </Button>
        <Button mode="text" onPress={onCancel} textColor="#e74c3c" style={{marginTop: 5}}>
          إلغاء الفاتورة
        </Button>
      </View>

      <Portal>
        <Modal 
          visible={splitModalVisible} 
          onDismiss={() => setSplitModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setSplitModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>🔀 تقسيم البند</Text>
              <Text style={styles.modalSubtitle}>إذا كان الصنف يمثل "كرتونة" أو مجموعة، كم عدد القطع بداخلها ليتم حساب سعر القطعة؟</Text>
              <View style={styles.splitGrid}>
                {[2, 3, 4, 6, 12].map((num) => (
                  <SplitOption key={num} num={num} onPress={handleSplitConfirm} />
                ))}
              </View>
              <Button mode="text" onPress={() => setSplitModalVisible(false)} style={{marginTop: 20}}>إلغاء</Button>
            </Pressable>
          </Pressable>
        </Modal>
      </Portal>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 15, backgroundColor: '#1C222E', borderRadius: 24, elevation: 6, marginBottom: 20 },
  cardHeaderTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  cardHeaderSubtitle: { color: '#8E94A5', fontSize: 13, marginBottom: 20 },
  globalFields: { flexDirection: 'row', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  input: { backgroundColor: '#0A0E17' },
  itemEditor: { marginBottom: 20, padding: 15, backgroundColor: '#0A0E17', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
  unverifiedItem: { backgroundColor: 'rgba(231, 76, 60, 0.05)', borderColor: 'rgba(231, 76, 60, 0.3)' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  grid: { flexDirection: 'row', gap: 10 },
  gridItem: { flex: 1 },
  actions: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  saveBtn: { borderRadius: 16, paddingVertical: 8 },
  saveBtnText: { fontSize: 18, fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', width: '100%' },
  modalContent: { width: '85%', backgroundColor: '#1C222E', borderRadius: 24, padding: 25, alignItems: 'center' },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  modalSubtitle: { color: '#8E94A5', marginBottom: 20, textAlign: 'center', lineHeight: 20 },
  splitGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  splitOption: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#007acc', justifyContent: 'center', alignItems: 'center' },
  splitOptionText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});

export default ReceiptItemEditor;
