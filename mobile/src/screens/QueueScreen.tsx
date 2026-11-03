import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { QueueItem } from '../types/report';
import { uploadQueueManager } from '../core/queue/UploadQueueManager';
import { networkMonitor } from '../core/network/networkMonitor';
import { StatusBadge } from '../components/StatusBadge';

export const QueueScreen: React.FC = () => {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [is2G, setIs2G] = useState<boolean>(false);

  useEffect(() => {
    // Subscribe to live queue changes
    const unsubQueue = uploadQueueManager.subscribe(setItems);

    // Subscribe to network connectivity
    const unsubNet = networkMonitor.subscribe((connected, slow) => {
      setIsOnline(connected);
      setIs2G(slow);
    });

    return () => {
      unsubQueue();
      unsubNet();
    };
  }, []);

  const handleRetry = (clientReportId: string) => {
    uploadQueueManager.retryNow(clientReportId);
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Local Queue?',
      'This will remove all locally stored queue records from the device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => uploadQueueManager.clearQueue() },
      ]
    );
  };

  const renderItem = ({ item }: { item: QueueItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <StatusBadge status={item.status} progress={item.progress} />
        <Text style={styles.timestamp}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      {/* Upload progress bar if currently uploading */}
      {item.status === 'UPLOADING' && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
        </View>
      )}

      {/* Error reason if retry scheduled */}
      {item.status === 'FAILED_RETRYING' && item.lastError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {item.lastError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => handleRetry(item.clientReportId)}
          >
            <Text style={styles.retryButtonText}>Retry Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Thumbnail previews */}
      <View style={styles.thumbRow}>
        {item.images.map((img, i) => (
          <Image key={img.id || i} source={{ uri: img.uri }} style={styles.thumb} />
        ))}
        <Text style={styles.imageCountText}>
          {item.images.length} {item.images.length === 1 ? 'photo' : 'photos'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Network Status Header */}
      <View style={[styles.networkBanner, !isOnline ? styles.bannerOffline : styles.bannerOnline]}>
        <Text style={styles.bannerText}>
          {!isOnline
            ? '🔴 Device Offline — Reports are safely queued on disk'
            : is2G
            ? '🟡 Connected via 2G (High Latency) — Uploads in progress'
            : '🟢 Network Online — Ready for sync'}
        </Text>
      </View>

      <View style={styles.headerRow}>
        <Text style={styles.heading}>Local Delivery Queue</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearText}>Clear Queue</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyTitle}>Queue is empty</Text>
          <Text style={styles.emptySubtitle}>
            All composed reports have landed safely on the server.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.clientReportId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  networkBanner: { paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' },
  bannerOnline: { backgroundColor: '#ECFDF5' },
  bannerOffline: { backgroundColor: '#FEF2F2' },
  bannerText: { fontSize: 12, fontWeight: '600', color: '#1E293B' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  clearText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  listContent: { padding: 16, paddingTop: 0 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timestamp: { fontSize: 12, color: '#94A3B8' },
  description: { fontSize: 14, fontWeight: '500', color: '#1E293B', marginBottom: 10 },
  progressContainer: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: { height: '100%', backgroundColor: '#2563EB' },
  errorBox: {
    backgroundColor: '#FFF1F2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: { fontSize: 12, color: '#991B1B', flex: 1 },
  retryButton: { backgroundColor: '#DC2626', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  retryButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  thumbRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  thumb: { width: 36, height: 36, borderRadius: 6, backgroundColor: '#E2E8F0' },
  imageCountText: { fontSize: 12, color: '#64748B', marginLeft: 6 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});

