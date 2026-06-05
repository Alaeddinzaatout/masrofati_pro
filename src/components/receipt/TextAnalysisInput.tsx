import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

interface TextAnalysisInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onAnalyze: () => void;
  loading: boolean;
}

const TextAnalysisInput = ({ value, onChangeText, onAnalyze, loading }: TextAnalysisInputProps) => {
  return (
    <View style={styles.container}>
      <TextInput 
        placeholder="أدخل المصروفات (مثال: 2 كيلو لحم بـ 30 دينار)"
        value={value} 
        onChangeText={onChangeText} 
        mode="outlined"
        multiline 
        numberOfLines={6} 
        style={styles.textArea}
        textColor="#fff" 
        placeholderTextColor="rgba(255,255,255,0.3)" 
        outlineStyle={styles.outline}
        activeOutlineColor="#007acc"
      />
      <Button 
        mode="contained" 
        onPress={onAnalyze}
        loading={loading} 
        icon="sparkles"
        style={styles.analyzeButton} 
        buttonColor="#007acc"
        contentStyle={styles.btnContent}
        labelStyle={styles.btnLabel}
      >
        بدء التحليل الذكي
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', alignItems: 'center' },
  textArea: { 
    width: '100%',
    backgroundColor: '#1C222E', 
    marginBottom: 25,
    fontSize: 15,
    minHeight: 120,
  },
  outline: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  analyzeButton: { 
    width: '100%', 
    borderRadius: 16, 
    elevation: 4,
    shadowColor: '#007acc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  btnContent: { height: 56 },
  btnLabel: { fontSize: 16, fontWeight: 'bold' },
});

export default TextAnalysisInput;
