import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Searchbar, Menu, Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

interface FilterHeaderProps {
  searchQuery: string;
  selectedMonth: string;
  availableMonths: string[];
  onSearchChange: (text: string) => void;
  onMonthChange: (month: string) => void;
}

const FilterHeader = ({
  searchQuery,
  selectedMonth,
  availableMonths,
  onSearchChange,
  onMonthChange,
}: FilterHeaderProps) => {
  const [menuVisible, setMenuVisible] = useState(false);

  // تنسيق التاريخ للعرض
  const formatMonthLabel = (monthStr: string) => {
    const [y, m] = monthStr.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleDateString('ar-LY', { month: 'long', year: 'numeric' });
  };

  const isCurrentMonth = () => {
    const now = new Date();
    const currentStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return selectedMonth === currentStr;
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="ابحث باسم الصنف أو المحل..."
        placeholderTextColor="#8E94A5"
        onChangeText={onSearchChange}
        value={searchQuery}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
        iconColor="#007acc"
      />

      <View style={styles.archiveRow}>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button 
              mode={isCurrentMonth() ? "contained" : "outlined"}
              onPress={() => setMenuVisible(true)}
              style={styles.archiveBtn}
              textColor={isCurrentMonth() ? "#fff" : "#007acc"}
              buttonColor={isCurrentMonth() ? "#007acc" : "transparent"}
              icon={() => <Ionicons name="calendar-outline" size={18} color={isCurrentMonth() ? "#fff" : "#007acc"} />}
            >
              <Text style={{fontWeight: 'bold', color: isCurrentMonth() ? "#fff" : "#007acc"}}>
                {isCurrentMonth() ? 'هذا الشهر' : formatMonthLabel(selectedMonth)}
              </Text>
            </Button>
          }
          contentStyle={{ backgroundColor: '#1C222E', borderRadius: 12, padding: 0 }}
        >
          <View style={styles.menuHeader}>
            <Text style={{color: '#8E94A5', fontSize: 12, fontWeight: 'bold'}}>أرشيف المصروفات</Text>
          </View>
          {availableMonths?.map((m) => (
            <Menu.Item
              key={m}
              onPress={() => {
                onMonthChange(m);
                setMenuVisible(false);
              }}
              title={formatMonthLabel(m)}
              titleStyle={{ 
                color: m === selectedMonth ? '#fff' : '#8E94A5', 
                textAlign: 'center',
                fontWeight: m === selectedMonth ? 'bold' : 'normal'
              }}
              style={m === selectedMonth ? { backgroundColor: '#007acc' } : {}}
            />
          ))}
        </Menu>

        {!isCurrentMonth() && (
           <Button 
             mode="text" 
             textColor="#e74c3c" 
             onPress={() => {
               const now = new Date();
               onMonthChange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
             }}
             compact
           >
             العودة للحالي
           </Button>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 5,
  },
  searchbar: {
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
    backgroundColor: '#1C222E',
    borderRadius: 16,
    elevation: 0,
  },
  searchInput: {
    color: '#fff',
  },
  archiveRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
    marginBottom: 10,
  },
  archiveBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007acc',
  },
  menuHeader: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(142,148,165,0.1)',
    alignItems: 'center',
    marginBottom: 5,
  }
});

export default FilterHeader;
