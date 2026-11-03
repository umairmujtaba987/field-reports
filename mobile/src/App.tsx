import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { ComposeScreen } from './screens/ComposeScreen';
import { QueueScreen } from './screens/QueueScreen';
import { ServerReviewScreen } from './screens/ServerReviewScreen';
import { uploadQueueManager } from './core/queue/UploadQueueManager';
import { QueueItem } from './types/report';

type Tab = 'compose' | 'queue' | 'review';

export const App = () => {
  const [activeTab, setActiveTab] = useState<Tab>('compose');
  const [queueCount, setQueueCount] = useState<number>(0);

  useEffect(() => {
    // 1. Initialize unattended queue worker on app launch (survives force-quit)
    uploadQueueManager.init();

    // 2. Track queue count for tab badge
    const unsub = uploadQueueManager.subscribe((items: QueueItem[]) => {
      const pending = items.filter((i) => i.status !== 'SUCCESS').length;
      setQueueCount(pending);
    });

    return () => unsub();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* App Header */}
      <View style={styles.header}>
        <Text style={styles.brandTitle}>FIELD REPORTS</Text>
        <Text style={styles.buildBadge}>2G Resilient • Offline-First</Text>
      </View>

      {/* Screen Body */}
      <View style={styles.body}>
        {activeTab === 'compose' && (
          <ComposeScreen onReportQueued={() => setActiveTab('queue')} />
        )}
        {activeTab === 'queue' && <QueueScreen />}
        {activeTab === 'review' && <ServerReviewScreen />}
      </View>

      {/* Bottom Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'compose' && styles.activeTabButton]}
          onPress={() => setActiveTab('compose')}
        >
          <Text style={[styles.tabText, activeTab === 'compose' && styles.activeTabText]}>
            📝 Compose
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'queue' && styles.activeTabButton]}
          onPress={() => setActiveTab('queue')}
        >
          <View style={styles.tabBadgeRow}>
            <Text style={[styles.tabText, activeTab === 'queue' && styles.activeTabText]}>
              ⏳ Queue
            </Text>
            {queueCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{queueCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'review' && styles.activeTabButton]}
          onPress={() => setActiveTab('review')}
        >
          <Text style={[styles.tabText, activeTab === 'review' && styles.activeTabText]}>
            🌐 Server Review
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#0F172A',
  },
  buildBadge: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  body: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTabButton: {
    borderTopWidth: 2,
    borderTopColor: '#0F172A',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  tabBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    backgroundColor: '#2563EB',
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default App;

