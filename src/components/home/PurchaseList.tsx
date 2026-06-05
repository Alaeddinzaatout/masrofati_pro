import React from 'react';
import { FlatList, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Purchase } from '../../types';
import PurchaseItem from './PurchaseItem';

interface PurchaseListProps {
  data: Purchase[];
  onEdit: (item: Purchase) => void;
  onDelete: (id: string) => void;
  searchQuery: string;
}

const PurchaseList = ({ data, onEdit, onDelete, searchQuery }: PurchaseListProps) => {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PurchaseItem 
          item={item} 
          onDelete={onDelete} 
          onEdit={onEdit} 
        />
      )}
      ListFooterComponent={<View style={{ height: 120 }} />}
      ListEmptyComponent={
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: '#8E94A5', fontSize: 16 }}>
            {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد مشتريات بعد'}
          </Text>
        </View>
      }
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
    />
  );
};

export default PurchaseList;
