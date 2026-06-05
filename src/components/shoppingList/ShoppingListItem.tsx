import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Checkbox, IconButton, Text, Chip } from 'react-native-paper';
import { ShoppingItem, PriceData } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface ShoppingListItemProps {
  item: ShoppingItem;
  priceData?: PriceData;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

const ShoppingListItem = React.memo(({
  item,
  priceData,
  onDelete,
  onToggle,
}: ShoppingListItemProps) => {
  return (
    <Card style={[styles.itemCard, item.checked && styles.checkedCard]}>
      <View style={styles.itemRow}>
        <Checkbox
          status={item.checked ? 'checked' : 'unchecked'}
          onPress={() => onToggle(item.id)}
          color="#007acc"
          uncheckedColor="#8E94A5"
        />
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, item.checked && styles.checkedText]}>
            {item.name}
          </Text>
          <View style={styles.metaRow}>
            <Chip compact style={styles.qtyChip} textStyle={styles.qtyText}>
              {item.quantity} {item.unit}
            </Chip>
            <Text style={styles.itemCategory}>{item.category}</Text>
          </View>
          
          {priceData && !item.checked && (
            <View style={styles.priceRow}>
              <Ionicons 
                name={priceData.trend === 'down' ? 'trending-down' : priceData.trend === 'up' ? 'trending-up' : 'remove-outline'} 
                size={16} 
                color={priceData.trend === 'down' ? '#2ecc71' : priceData.trend === 'up' ? '#e74c3c' : '#8E94A5'} 
              />
              <Text
                style={[
                  styles.priceInfo,
                  {
                    color:
                      priceData.trend === 'down'
                        ? '#2ecc71'
                        : priceData.trend === 'up'
                        ? '#e74c3c'
                        : '#8E94A5',
                  },
                ]}
              >
                {priceData.latestPrice.toFixed(2)} د.ل <Text style={styles.storeName}>في {priceData.store}</Text>
              </Text>
            </View>
          )}
        </View>
        <IconButton
          icon="close-circle-outline"
          iconColor={item.checked ? "#8E94A5" : "#e74c3c"}
          size={24}
          onPress={() => onDelete(item.id)}
        />
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  itemCard: { 
    marginHorizontal: 15, 
    marginVertical: 6, 
    backgroundColor: '#1C222E', 
    borderRadius: 16, 
    elevation: 2 
  },
  checkedCard: { 
    opacity: 0.5, 
    backgroundColor: '#0A0E17',
    borderWidth: 1,
    borderColor: 'rgba(142, 148, 165, 0.1)'
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 8, paddingRight: 0 },
  itemInfo: { flex: 1, marginLeft: 8 },
  itemName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  checkedText: { textDecorationLine: 'line-through', color: '#8E94A5' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  qtyChip: { backgroundColor: 'rgba(0, 122, 204, 0.1)', height: 24 },
  qtyText: { color: '#007acc', fontSize: 10, fontWeight: 'bold' },
  itemCategory: { color: '#8E94A5', fontSize: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', gap: 4 },
  priceInfo: { fontSize: 12, fontWeight: 'bold' },
  storeName: { fontWeight: 'normal', fontSize: 10, opacity: 0.8 },
});

export default ShoppingListItem;
