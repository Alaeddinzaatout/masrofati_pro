import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, ActivityIndicator } from 'react-native-paper';

interface ReceiptScannerProps {
  image: string | null;
  imageSize: string;
  isProcessing: boolean;
  optimizing: boolean;
  onPickGallery: () => void;
  onPickCamera: () => void;
}

const ReceiptScanner = ({
  image,
  imageSize,
  isProcessing,
  optimizing,
  onPickGallery,
  onPickCamera,
}: ReceiptScannerProps) => {
  return (
    <View style={styles.container}>
      {!image ? (
        <View style={styles.buttonRow}>
          <Button 
            mode="contained" 
            onPress={onPickGallery} 
            icon="image-multiple"
            style={[styles.actionButton, styles.galleryBtn]} 
            loading={isProcessing} 
            disabled={isProcessing}
            textColor="#fff"
            labelStyle={styles.btnLabel}
          >
            المعرض
          </Button>
          <Button 
            mode="contained" 
            onPress={onPickCamera} 
            icon="camera"
            style={[styles.actionButton, styles.cameraBtn]} 
            loading={isProcessing} 
            disabled={isProcessing}
            textColor="#fff"
            labelStyle={styles.btnLabel}
          >
            الكاميرا
          </Button>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <Image 
            source={{ uri: image }} 
            style={styles.image}
            cachePolicy="disk" 
            contentFit="contain" 
            transition={300} 
          />
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator color="#007acc" size="large" />
              <Text style={styles.processingText}>جاري قراءة البيانات...</Text>
            </View>
          )}
          {Boolean(imageSize) && !isProcessing && (
            <Text style={styles.imageSizeText}>
              حجم الملف: {imageSize}
            </Text>
          )}
        </View>
      )}

      {optimizing && !isProcessing && (
        <View style={styles.optimizingRow}>
          <ActivityIndicator size={16} color="#007acc" />
          <Text style={styles.optimizingText}>
            جاري تحسين جودة الصورة...
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  buttonRow: { flexDirection: 'row', gap: 15, width: '100%' },
  actionButton: { flex: 1, borderRadius: 16, height: 60, justifyContent: 'center' },
  galleryBtn: { backgroundColor: 'rgba(142, 148, 165, 0.15)' },
  cameraBtn: { backgroundColor: '#007acc' },
  btnLabel: { fontSize: 16, fontWeight: 'bold' },
  previewContainer: { 
    borderRadius: 24, 
    overflow: 'hidden', 
    backgroundColor: '#0A0E17', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 10,
    width: '100%',
    alignSelf: 'center'
  },
  image: { width: '100%', height: 250, borderRadius: 14 },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 14, 23, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  processingText: { color: '#fff', marginTop: 15, fontWeight: '700', fontSize: 15 },
  imageSizeText: { textAlign: 'center', color: '#8E94A5', fontSize: 11, marginTop: 8 },
  optimizingRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 15, 
    gap: 10 
  },
  optimizingText: { color: '#007acc', fontSize: 13, fontWeight: '600' },
});

export default ReceiptScanner;
