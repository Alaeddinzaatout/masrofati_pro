import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, List, Switch, Text } from 'react-native-paper';

interface AppearanceCardProps {
  darkModePref: string;
  onToggle: () => void;
}

const AppearanceCard = ({ darkModePref, onToggle }: AppearanceCardProps) => {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleLarge" style={styles.cardTitle}>🎨 المظهر</Text>
        <List.Item
          title="الوضع الداكن"
          titleStyle={{ color: '#fff' }}
          descriptionStyle={{ color: '#8E94A5' }}
          description={darkModePref === 'dark' ? 'مفعل' : darkModePref === 'light' ? 'معطل' : 'تلقائي'}
          right={() => (
            <Switch 
              value={darkModePref === 'dark'} 
              onValueChange={onToggle} 
              color="#007acc" 
            />
          )}
        />
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 15, marginBottom: 20, backgroundColor: '#1C222E', borderRadius: 20, elevation: 4 },
  cardTitle: { color: '#fff', marginBottom: 20, fontWeight: 'bold' },
});

export default AppearanceCard;
