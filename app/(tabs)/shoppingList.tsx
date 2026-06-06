import React, { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Card, FAB, Snackbar, Text } from 'react-native-paper';
import AddShoppingItemModal from '../../src/components/shoppingList/AddShoppingItemModal';
import ShoppingListHeader from '../../src/components/shoppingList/ShoppingListHeader';
import ShoppingListItem from '../../src/components/shoppingList/ShoppingListItem';
import { SmartSuggestion, useShoppingLogic } from '../../src/hooks/useShoppingLogic';
import SmartSuggestionsModal from '../../src/components/shoppingList/SmartSuggestionsModal';

const SuggestionCard = ({ 
  suggestion, 
  onAdd 
}: { 
  suggestion: SmartSuggestion; 
  onAdd: (s: SmartSuggestion) => void 
}) => {
  const displayName = suggestion.name.length > 20 ? suggestion.name.substring(0, 17) + '...' : suggestion.name;
  const isUrgent = suggestion.type === 'urgent';
  
  return (
    <Card style={[styles.suggestionCard, isUrgent && styles.urgentCard]} mode="elevated">
      <Card.Content style={styles.suggestionContent}>
        <View style={styles.suggestionHeader}>
          <Avatar.Icon 
            size={36} 
            icon={isUrgent ? 'alert-circle' : 'home-heart'} 
            style={{ backgroundColor: isUrgent ? 'rgba(231, 76, 60, 0.15)' : 'rgba(0, 122, 204, 0.15)' }}
            color={isUrgent ? '#e74c3c' : '#3498db'}
          />
          <Text style={styles.suggestionTitle} numberOfLines={1}>{displayName}</Text>
        </View>
        <Text style={[styles.suggestionReason, isUrgent && { color: '#e74c3c' }]}>{suggestion.reason}</Text>
        <Text style={styles.suggestionQty}>نقترح: <Text style={styles.qtyHighlight}>{suggestion.suggestedQty}</Text></Text>
        <TouchableOpacity style={styles.addSmallBtn} onPress={() => onAdd(suggestion)}>
          <Text style={styles.addSmallBtnText}>+ سلة</Text>
        </TouchableOpacity>
      </Card.Content>
    </Card>
  );
};

export default function ShoppingListScreen() {
  const {
    items,
    suggestions,
    priceHistoryMap,
    loading,
    handlers
  } = useShoppingLogic();

  const [modalVisible, setModalVisible] = useState(false);
  const [smartModalVisible, setSmartModalVisible] = useState(false); 
  const [smartSearchQuery, setSmartSearchQuery] = useState(''); 
  const [snack, setSnack] = useState({ visible: false, message: '' });

  const itemsLeft = items.filter(i => !i.checked).length;

  const handleQuickAdd = (suggestion: SmartSuggestion) => {
    handlers.acceptSuggestion(suggestion.name);
    handlers.addItem(suggestion.name, suggestion.suggestedQty.toString(), 'حبة', 'أخرى');
    setSnack({ visible: true, message: `تمت إضافة ${suggestion.name} بنجاح ✅` });
  };

  return (
    <View style={styles.container}>
      <ShoppingListHeader 
        itemsLeft={itemsLeft}
        onOpenAI={() => setSmartModalVisible(true)} 
      />

      {/* شريط النواقص المتوقعة */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsWrapper}>
          <Text style={styles.sectionTitle}>💡 نواقص متوقعة بذكاء</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
          >
            {suggestions.map((s, idx) => (
              <SuggestionCard key={idx} suggestion={s} onAdd={handleQuickAdd} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* قائمة التسوق الفعلية */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ShoppingListItem
            item={item}
            onDelete={handlers.deleteItem}
            onToggle={(id) => handlers.toggleItem(id, !item.checked)}
            priceData={priceHistoryMap[item.name]}
          />
        )}
        ListHeaderComponent={<Text style={styles.sectionTitle}>🛒 سلة مشترياتك</Text>}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🛍️</Text>
            <Text style={styles.emptyText}>السلة فارغة حالياً</Text>
            <Text style={{color: '#8E94A5', marginTop: 10, textAlign: 'center'}}>أضف أصنافاً، أو دع مساعدك الذكي يقترح عليك!</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
      />

      <AddShoppingItemModal 
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        onAdd={handlers.addItem}
      />

      <SmartSuggestionsModal 
        visible={smartModalVisible}
        onDismiss={() => setSmartModalVisible(false)}
        suggestions={suggestions}
        searchQuery={smartSearchQuery}
        onSearchChange={setSmartSearchQuery}
        onAccept={(itemName: string) => {
          handlers.acceptSuggestion(itemName);
          handlers.addItem(itemName, '1', 'حبة', 'أخرى');
          setSnack({ visible: true, message: `تم إضافة ${itemName} لسلّتك ✅` });
        }}
        onReject={(itemName: string) => {
          handlers.rejectSuggestion(itemName);
          setSnack({ visible: true, message: `تم تجاهل ${itemName} ❌` });
        }}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        color="#fff"
      />

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack({ ...snack, visible: false })}
        duration={3000}
        style={styles.snackbar}
      >
        {snack.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  sectionTitle: { color: '#8E94A5', fontSize: 14, fontWeight: 'bold', marginVertical: 12, paddingHorizontal: 5, textAlign: 'left' },
  suggestionsWrapper: { paddingVertical: 10, backgroundColor: '#0D131F', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#1C222E' },
  suggestionsScroll: { paddingHorizontal: 16, gap: 12 },
  suggestionCard: { width: 140, backgroundColor: '#1C222E', borderRadius: 16, elevation: 3 },
  suggestionContent: { padding: 12, alignItems: 'center' },
  suggestionHeader: { alignItems: 'center', marginBottom: 5 },
  suggestionTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 8, textAlign: 'center' },
  suggestionReason: { color: '#8E94A5', fontSize: 10, marginTop: 4, textAlign: 'center', height: 30 },
  suggestionQty: { color: '#8E94A5', fontSize: 12, marginBottom: 10 },
  qtyHighlight: { color: '#fff', fontWeight: 'bold' },
  urgentCard: { borderColor: 'rgba(231, 76, 60, 0.3)', borderWidth: 1 },
  addSmallBtn: { backgroundColor: 'rgba(0, 122, 204, 0.1)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, width: '100%', alignItems: 'center' },
  addSmallBtnText: { color: '#007acc', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 15 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 20, backgroundColor: '#007acc', borderRadius: 16 },
  snackbar: { backgroundColor: '#1C222E', borderRadius: 10 },
});