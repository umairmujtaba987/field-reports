import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { QueueItemStatus } from '../types/report';

interface Props {
  status: QueueItemStatus;
  progress?: number;
}

export const StatusBadge: React.FC<Props> = ({ status, progress = 0 }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'QUEUED':
        return {
          bg: '#F3F4F6',
          text: '#374151',
          label: 'Saved Locally • Queued',
        };
      case 'COMPRESSING':
        return {
          bg: '#FEF3C7',
          text: '#92400E',
          label: 'Optimizing Photos (<5MB)...',
        };
      case 'UPLOADING':
        return {
          bg: '#DBEAFE',
          text: '#1E40AF',
          label: `Uploading (${progress}%)`,
        };
      case 'FAILED_RETRYING':
        return {
          bg: '#FEE2E2',
          text: '#991B1B',
          label: 'Interrupted • Retrying unattended',
        };
      case 'SUCCESS':
        return {
          bg: '#D1FAE5',
          text: '#065F46',
          label: 'Confirmed on Server',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

