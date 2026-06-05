import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

interface ShoppingListHeaderProps {
  itemsLeft: number;
  onOpenAI: () => void;
}

const ShoppingListHeader = ({ 
  itemsLeft, 
  onOpenAI, 
}: ShoppingListHeaderProps) => {
  return (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>قائمة الاحتياجات</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{itemsLeft}</Text>
        </View>
      </View>

      <IconButton 
        icon="auto-fix" 
        mode="contained"
        containerColor="rgba(0, 122, 204, 0.15)"
        iconColor="#007acc"
        size={24}
        onPress={onOpenAI}
        style={styles.aiButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#0A0E17',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  badge: {
    backgroundColor: '#007acc',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  aiButton: {
    borderRadius: 14,
  },
});

export default ShoppingListHeader;
