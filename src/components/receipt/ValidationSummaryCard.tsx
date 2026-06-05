import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { ValidationIssue as ValidationIssueType } from '../../types';

interface ValidationSummaryCardProps {
  visible: boolean;
  issues: ValidationIssueType[];
  summary: string;
}

const ValidationIssue = ({ issue }: { issue: ValidationIssueType }) => (
  <View style={[styles.issueRow, {
    backgroundColor: issue.severity === 'error'
      ? 'rgba(231, 76, 60, 0.1)'
      : 'rgba(243, 156, 18, 0.1)'
  }]}>
    <Text style={[styles.issueName, {
      color: issue.severity === 'error' ? '#e74c3c' : '#f39c12'
    }]}>
      {issue.severity === 'error' ? '🔴' : '🟡'} {issue.name}
    </Text>
    <Text style={styles.issueMessage}>{issue.message}</Text>
  </View>
);

const ValidationSummaryCard = ({ visible, issues, summary }: ValidationSummaryCardProps) => {
  if (!visible || issues.length === 0) return null;

  return (
    <Card style={[styles.card, styles.validationCard]}>
      <Card.Content>
        <Text style={styles.validationTitle}>🔍 {summary}</Text>
        {issues.map((issue, idx) => (
          <ValidationIssue key={idx} issue={issue} />
        ))}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { margin: 15, backgroundColor: '#1C222E', borderRadius: 20, elevation: 4 },
  validationCard: { borderLeftWidth: 4, borderLeftColor: '#f39c12' },
  validationTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 10 },
  issueRow: { padding: 12, borderRadius: 12, marginBottom: 8 },
  issueName: { fontWeight: 'bold', fontSize: 14 },
  issueMessage: { color: '#8E94A5', fontSize: 12, marginTop: 4 },
});

export default ValidationSummaryCard;
