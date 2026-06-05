import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Card, IconButton, Text } from 'react-native-paper';
import { Purchase } from '../../types';

interface PurchaseItemProps {
  item: Purchase;
  onDelete: (id: string) => void;
  onEdit: (item: Purchase) => void;
}

const PurchaseItem = React.memo(({ item, onDelete, onEdit }: PurchaseItemProps) => {
  // 🛡️ حماية ذكية: جلب سعر القطعة الجديد، أو حسابه تلقائياً للأصناف القديمة جداً
  const actualUnitPrice = (item as any).unitPrice ? (item as any).unitPrice : (item.price / (item.quantity || 1));

  return (
    <Card style={styles.itemCard} mode="elevated">
      <Card.Title
        title={item.name}
        titleStyle={styles.itemTitle}
        subtitle={`${item.store} • ${item.date || '-'}`}
        subtitleStyle={styles.itemSubtitle}
        left={(props) => <Avatar.Icon {...props} icon="cart-outline" size={40} style={styles.avatar} color="#0A84FF" />}
        right={() => (
          <View style={styles.actionButtons}>
            <IconButton
              icon="pencil-circle"
              iconColor="#0A84FF"
              size={28}
              onPress={() => onEdit(item)}
            />
            <IconButton
              icon="delete-circle"
              iconColor="rgba(255, 69, 58, 0.8)"
              size={28}
              onPress={() => onDelete(item.id)}
            />
          </View>
        )}
      />
      <Card.Content>
        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={styles.statBox}>
            <Text style={styles.label}>السعر</Text>
            {/* 👈 هنا نعرضوا سعر القطعة الصح اللي حسبناه فوق */}
            <Text style={styles.priceText}>{actualUnitPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.label}>الكمية</Text>
            <Text style={styles.qtyText}>x{item.quantity}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.label}>الإجمالي</Text>
            {/* 👈 هنا نعرضوا الإجمالي الصافي بدون أي ضرب أو فلسفة زايدة */}
            <Text style={styles.totalText}>{item.price.toFixed(2)} <Text style={styles.currency}>د.ل</Text></Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
});

const styles = StyleSheet.create({
  itemCard: { 
    marginHorizontal: 16, 
    marginVertical: 10, 
    backgroundColor: '#121214', 
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)',
    elevation: 4 
  },
  itemTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  itemSubtitle: { color: '#8E8E93', fontSize: 12 },
  avatar: { backgroundColor: 'rgba(10, 132, 255, 0.1)' },
  actionButtons: { flexDirection: 'row', marginRight: 8 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  statBox: { alignItems: 'flex-start' },
  label: { color: '#8E8E93', fontSize: 10, marginBottom: 2, textTransform: 'uppercase' },
  priceText: { color: '#32D74B', fontWeight: '700', fontSize: 15 },
  qtyText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  totalText: { color: '#0A84FF', fontWeight: '800', fontSize: 17 },
  currency: { fontSize: 10, fontWeight: '400' }
});

export default PurchaseItem;