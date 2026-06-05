import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, List, Switch, Text } from 'react-native-paper';
import { NotificationPrefs } from '../../hooks/useSettingsLogic';

interface SmartNotificationsCardProps {
  prefs: NotificationPrefs;
  onUpdate: (key: keyof NotificationPrefs, value: boolean) => void;
}

const SmartNotificationsCard = ({ prefs, onUpdate }: SmartNotificationsCardProps) => {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleLarge" style={styles.cardTitle}>🤖 تنبيهات جيمي الذكية</Text>
        
        <List.Item
          title="تحذيرات الميزانية"
          description="تنبيه عند خطر تجاوز ميزانية الشهر"
          titleStyle={styles.listTitle}
          descriptionStyle={styles.listDesc}
          left={props => <List.Icon {...props} icon="finance" color="#f39c12" />}
          right={() => <Switch value={prefs.budget} onValueChange={v => onUpdate('budget', v)} color="#007acc" />}
        />

        <List.Item
          title="توقعات المخزون"
          description="تنبيه عند اقتراب نفاد صنف أساسي"
          titleStyle={styles.listTitle}
          descriptionStyle={styles.listDesc}
          left={props => <List.Icon {...props} icon="cart" color="#e74c3c" />}
          right={() => <Switch value={prefs.inventory} onValueChange={v => onUpdate('inventory', v)} color="#007acc" />}
        />

        <List.Item
          title="نصائح التوفير"
          description="اقتراحات ذكية لتقليل الهدر"
          titleStyle={styles.listTitle}
          descriptionStyle={styles.listDesc}
          left={props => <List.Icon {...props} icon="lightbulb-on-outline" color="#2ecc71" />}
          right={() => <Switch value={prefs.aiTips} onValueChange={v => onUpdate('aiTips', v)} color="#007acc" />}
        />
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 15, marginBottom: 20, backgroundColor: '#1C222E', borderRadius: 20, elevation: 4 },
  cardTitle: { color: '#fff', marginBottom: 10, fontWeight: 'bold' },
  listTitle: { color: '#fff', fontSize: 15 },
  listDesc: { color: '#8E94A5', fontSize: 11 },
});

export default SmartNotificationsCard;
