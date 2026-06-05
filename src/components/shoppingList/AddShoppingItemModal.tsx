import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text, TextInput } from 'react-native-paper';

interface AddShoppingItemModalProps {
  visible: boolean;
  onDismiss: () => void;
  onAdd: (name: string, quantity: string, unit: string, category: string, note: string) => Promise<void>;
}

const AddShoppingItemModal = ({ visible, onDismiss, onAdd }: AddShoppingItemModalProps) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('حبة');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      // For simplicity, we default to 'أخرى' for category, 
      // or we could add a category picker. 
      // In the original code, it called categorizeProduct inside addItem.
      // Our hook's addItem expects category.
      await onAdd(name.trim(), quantity, unit, 'أخرى', note.trim());
      setName('');
      setQuantity('1');
      setUnit('حبة');
      setNote('');
      onDismiss();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <Text variant="titleLarge" style={styles.modalTitle}>➕ صنف جديد</Text>
        <TextInput
          label="الاسم"
          value={name}
          onChangeText={setName}
          mode="flat"
          style={styles.input}
          textColor="#fff"
        />
        <View style={styles.row}>
          <TextInput
            label="الكمية"
            value={quantity}
            onChangeText={setQuantity}
            mode="flat"
            keyboardType="numeric"
            style={[styles.input, { flex: 1 }]}
            textColor="#fff"
          />
          <TextInput
            label="الوحدة"
            value={unit}
            onChangeText={setUnit}
            mode="flat"
            style={[styles.input, { flex: 1 }]}
            textColor="#fff"
          />
        </View>
        <TextInput
          label="ملاحظة (اختياري)"
          value={note}
          onChangeText={setNote}
          mode="flat"
          style={styles.input}
          textColor="#fff"
        />
        <Button
          mode="contained"
          onPress={handleAdd}
          loading={loading}
          style={styles.modalButton}
          buttonColor="#007acc"
          disabled={!name.trim()}
        >
          إضافة للقائمة
        </Button>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: { backgroundColor: '#1C222E', padding: 25, margin: 20, borderRadius: 24 },
  modalTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#0A0E17', borderRadius: 12, marginBottom: 15 },
  row: { flexDirection: 'row', gap: 10 },
  modalButton: { borderRadius: 12, height: 50, justifyContent: 'center' },
});

export default AddShoppingItemModal;
