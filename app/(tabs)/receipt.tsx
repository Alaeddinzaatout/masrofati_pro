import React from 'react';
import { StyleSheet, View, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SegmentedButtons, Snackbar, Text, Avatar, Surface } from 'react-native-paper';
import { useReceiptLogic } from '../../src/hooks/useReceiptLogic';
import ValidationSummaryCard from '../../src/components/receipt/ValidationSummaryCard';
import ReceiptScanner from '../../src/components/receipt/ReceiptScanner';
import TextAnalysisInput from '../../src/components/receipt/TextAnalysisInput';
import ReceiptItemEditor from '../../src/components/receipt/ReceiptItemEditor';

export default function ReceiptScreen() {
  const {
    mode, setMode,
    image, imageSize,
    expenseText, setExpenseText,
    loading, optimizing,
    validationIssues, validationSummary, validationVisible,
    editableItems, receiptDate, setReceiptDate, storeName, setStoreName,
    snack, hideSnack,
    actions
  } = useReceiptLogic();

  const isProcessing = loading || optimizing;
  const showEditor = editableItems.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header & Mode Toggle */}
          <View style={styles.header}>
            <Text style={styles.title}>مسح الفواتير</Text>
            <SegmentedButtons
              value={mode}
              onValueChange={(value) => {
                setMode(value as any);
                actions.handleCancel();
              }}
              buttons={[
                { 
                  value: 'gemini', 
                  label: '📷 إيصال', 
                  labelStyle: styles.segmentLabel,
                },
                { 
                  value: 'cerebras', 
                  label: '✏️ نص', 
                  labelStyle: styles.segmentLabel,
                },
              ]}
              style={styles.segmentedButtons}
              theme={{ 
                colors: { 
                  secondaryContainer: '#007acc',
                  onSecondaryContainer: '#FFFFFF',
                  outline: 'transparent'
                } 
              }}
            />
          </View>

          {/* Center Content (Empty State or Editor) */}
          {!showEditor ? (
            <View style={styles.centerContent}>
              <Surface style={styles.iconCircle} elevation={2}>
                <Avatar.Icon 
                  size={80} 
                  icon={mode === 'gemini' ? "camera-iris" : "text-box-search-outline"} 
                  style={{ backgroundColor: 'transparent' }}
                  color="rgba(255,255,255,0.2)"
                />
              </Surface>
              <Text style={styles.welcomeTitle}>دع الذكاء الاصطناعي يقرأ فاتورتك</Text>
              <Text style={styles.welcomeSubtitle}>
                {mode === 'gemini' 
                  ? "صور الإيصال أو اختر صورة من المعرض للبدء" 
                  : "اكتب تفاصيل مشترياتك وسيقوم جيمي بتنظيمها"}
              </Text>
              
              {mode === 'cerebras' && (
                <View style={styles.textInputWrapper}>
                   <TextAnalysisInput 
                    value={expenseText}
                    onChangeText={setExpenseText}
                    onAnalyze={actions.handleAnalyzeText}
                    loading={loading}
                  />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.editorContent}>
              <ValidationSummaryCard 
                visible={validationVisible}
                issues={validationIssues}
                summary={validationSummary}
              />
              <ReceiptItemEditor 
                items={editableItems}
                storeName={storeName}
                receiptDate={receiptDate}
                validationIssues={validationIssues}
                loading={loading}
                onUpdateItem={actions.updateItem}
                onSplitItem={actions.handleSplitItem}
                onSaveAll={actions.handleSaveAll}
                onCancel={actions.handleCancel}
                onUpdateDate={setReceiptDate}
                onUpdateStore={setStoreName}
              />
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions Area (Only for Gemini mode when no editor) */}
        {mode === 'gemini' && !showEditor && (
          <Surface style={styles.bottomActions} elevation={4}>
            <View style={styles.actionButtonsRow}>
              <ReceiptScanner 
                image={image}
                imageSize={imageSize}
                isProcessing={isProcessing}
                optimizing={optimizing}
                onPickGallery={actions.pickFromGallery}
                onPickCamera={actions.pickFromCamera}
              />
            </View>
          </Surface>
        )}

        <Snackbar 
          visible={snack.visible} 
          onDismiss={hideSnack}
          style={snack.type === 'error' ? styles.snackbarError : styles.snackbarSuccess} 
          action={{ label: 'حسناً', textColor: '#fff' }}
        >
          {snack.message}
        </Snackbar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0E17' },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 120 },
  header: { padding: 20, paddingTop: 10 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 15, textAlign: 'right' },
  segmentedButtons: { 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 14,
    height: 48,
    padding: 2,
  },
  segmentLabel: { fontWeight: '700', fontSize: 13, color: '#fff' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, marginTop: 40 },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1C222E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  welcomeSubtitle: { color: '#8E94A5', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  textInputWrapper: { width: '100%', marginTop: 30 },
  editorContent: { paddingVertical: 10 },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1C222E',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingVertical: 25,
    paddingHorizontal: 20,
    minHeight: 100,
  },
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  snackbarError: { backgroundColor: '#FF453A', borderRadius: 16 },
  snackbarSuccess: { backgroundColor: '#32D74B', borderRadius: 16 },
});
