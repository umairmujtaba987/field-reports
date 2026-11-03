import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { ComposeScreen } from './screens/ComposeScreen';
import { QueueScreen } from './screens/QueueScreen';
import { ServerReviewScreen } from './screens/ServerReviewScreen';
import { uploadQueueManager } from './core/queue/UploadQueueManager';
import { activeApiConfig, setApiBaseUrl } from './config/api';
import { QueueItem } from './types/report';

type Tab = 'compose' | 'queue' | 'review';

export const App = () => {
  const [activeTab, setActiveTab] = useState<Tab>('compose');
  const [queueCount, setQueueCount] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>(activeApiConfig.baseUrl);

  useEffect(() => {
    uploadQueueManager.init();

    const unsub = uploadQueueManager.subscribe((items: QueueItem[]) => {
      const pending = items.filter((i) => i.status !== 'SUCCESS').length;
      setQueueCount(pending);
    });

    return () => unsub();
  }, []);

  const handleSaveUrl = () => {
    if (!serverUrl.trim()) {
      Alert.alert('Invalid URL', 'Please enter a valid server URL');
      return;
    }
    setApiBaseUrl(serverUrl.trim());
    setShowSettings(false);
    Alert.alert('Server Connected', `Server URL set to:\n${activeApiConfig.baseUrl}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* App Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>FIELD REPORTS</Text>
          <Text style={styles.buildBadge}>2G Resilient • Offline-First</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.settingsIcon}>⚙️ Server IP</Text>
        </TouchableOpacity>
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

      {/* Server Settings Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Backend Server Connection</Text>
            <Text style={styles.modalSub}>
              Enter your computer's IP address (both phone and computer must be on same Wi-Fi):
            </Text>

            <TextInput
              style={styles.modalInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.11.52:3000"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.quickButtons}>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => setServerUrl('http://192.168.11.52:3000')}
              >
                <Text style={styles.quickChipText}>Wi-Fi (192.168.11.52)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => setServerUrl('http://10.0.2.2:3000')}
              >
                <Text style={styles.quickChipText}>Emulator (10.0.2.2)</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowSettings(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveUrl}>
                <Text style={styles.modalSaveText}>Save Connection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  settingsButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  settingsIcon: { fontSize: 11, fontWeight: '600', color: '#334155' },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    elevation: 5,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#64748B', marginBottom: 14, lineHeight: 18 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 10,
  },
  quickButtons: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  quickChip: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  quickChipText: { fontSize: 11, color: '#475569', fontWeight: '500' },
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancel: { paddingVertical: 8, paddingHorizontal: 12 },
  modalCancelText: { color: '#64748B', fontWeight: '600' },
  modalSave: { backgroundColor: '#0284C7', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  modalSaveText: { color: '#FFFFFF', fontWeight: '700' },
});

export default App;
