import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Modal, Portal, Text, TextInput } from 'react-native-paper';

export interface PurchaseFormData {
  name: string;
  price: string;
  quantity: string;
  unit: string;
  category: string;
  store: string;
  date: string;
}

interface PurchaseFormModalProps {
  visible: boolean;
  onDismiss: () => void;
  form: PurchaseFormData;
  onFormChange: (data: PurchaseFormData) => void;
  onSubmit: () => void;
  isEditing: boolean;
}

const PurchaseFormModal = ({
  visible,
  onDismiss,
  form,
  onFormChange,
  onSubmit,
  isEditing,
}: PurchaseFormModalProps) => {
  const updateField = (field: keyof PurchaseFormData, value: string) => {
    onFormChange({ ...form, [field]: value });
  };

  const handleQtyChange = (amount: number) => {
    const current = parseInt(form.quantity) || 1;
    const next = Math.max(1, current + amount);
    updateField('quantity', next.toString());
  };

  const setQuickDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    updateField('date', d.toISOString().split('T')[0]);
  };

  const isToday = form.date === new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = form.date === yesterday.toISOString().split('T')[0];

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.bottomSheet}
      >
        <View style={styles.sheetHandle} />
        <Text variant="titleLarge" style={styles.modalTitle}>
          {isEditing ? '✏️ تعديل بيانات الصنف' : '➕ إضافة صنف جديد'}
        </Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          <TextInput
            label="اسم الصنف"
            mode="flat"
            value={form.name}
            onChangeText={(text) => updateField('name', text)}
            style={styles.input}
            textColor="#fff"
            theme={{ colors: { primary: '#007acc' } }}
          />

          <View style={styles.row}>
            <TextInput
              label="السعر (د.ل)"
              mode="flat"
              value={form.price}
              onChangeText={(text) => updateField('price', text)}
              style={[styles.input, { flex: 1, marginRight: 10 }]}
              keyboardType="numeric"
              textColor="#2ecc71"
              theme={{ colors: { primary: '#007acc' } }}
            />
            <View style={styles.qtyContainer}>
              <IconButton icon="minus" size={20} iconColor="#e74c3c" onPress={() => handleQtyChange(-1)} style={styles.qtyBtn} />
              <Text style={styles.qtyText}>{form.quantity}</Text>
              <IconButton icon="plus" size={20} iconColor="#2ecc71" onPress={() => handleQtyChange(1)} style={styles.qtyBtn} />
            </View>
          </View>

          <TextInput
            label="اسم المحل"
            mode="flat"
            value={form.store}
            onChangeText={(text) => updateField('store', text)}
            style={styles.input}
            textColor="#fff"
            theme={{ colors: { primary: '#007acc' } }}
          />

          <View style={{ marginBottom: 15 }}>
            <Text style={{ color: '#8E94A5', marginBottom: 8, fontSize: 12 }}>تاريخ الشراء:</Text>
            <View style={styles.dateRow}>
              <Button 
                mode={isToday ? "contained" : "outlined"} 
                onPress={() => setQuickDate(0)}
                style={styles.dateBtn}
                buttonColor={isToday ? '#007acc' : 'transparent'}
                textColor={isToday ? '#fff' : '#8E94A5'}
              >
                اليوم
              </Button>
              <Button 
                mode={isYesterday ? "contained" : "outlined"} 
                onPress={() => setQuickDate(1)}
                style={styles.dateBtn}
                buttonColor={isYesterday ? '#007acc' : 'transparent'}
                textColor={isYesterday ? '#fff' : '#8E94A5'}
              >
                أمس
              </Button>
            </View>
            <TextInput
              mode="flat"
              value={form.date}
              onChangeText={(text) => updateField('date', text)}
              style={[styles.input, { marginTop: 10 }]}
              placeholder="YYYY-MM-DD"
              textColor="#fff"
              dense
            />
          </View>

          <Button
            mode="contained"
            onPress={onSubmit}
            style={styles.modalButton}
            icon={isEditing ? "check-circle" : "plus-circle"}
          >
            {isEditing ? 'حفظ التعديلات' : 'إضافة إلى السجل'}
          </Button>
          <View style={{ height: 20 }} />
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  bottomSheet: {
    backgroundColor: '#1C222E',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#8E94A5',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { color: '#fff', marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  input: { marginBottom: 15, backgroundColor: '#0A0E17', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0E17', borderRadius: 12, height: 56, paddingHorizontal: 5 },
  qtyBtn: { margin: 0 },
  qtyText: { color: '#fff', fontSize: 18, fontWeight: 'bold', width: 30, textAlign: 'center' },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateBtn: { flex: 1, borderColor: '#8E94A5' },
  modalButton: { marginTop: 10, borderRadius: 12, height: 50, justifyContent: 'center', backgroundColor: '#007acc' },
});

export default PurchaseFormModal;
