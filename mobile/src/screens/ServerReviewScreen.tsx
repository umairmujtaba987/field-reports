import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ServerReport } from '../types/report';
import { apiClient } from '../core/network/apiClient';
import { uploadQueueManager } from '../core/queue/UploadQueueManager';

export const ServerReviewScreen: React.FC = () => {
  const [reports, setReports] = useState<ServerReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setError(null);
      const list = await apiClient.getReports();
      setReports(list);
    } catch (err: any) {
      setError(err?.message || 'Could not connect to server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const handleStartOver = () => {
    Alert.alert(
      'Start Over (Deliberate Reset)?',
      'This will wipe all reports and photos on the backend server and clear your local device queue. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await apiClient.resetServer();
              await uploadQueueManager.clearQueue();
              await fetchReports();
              Alert.alert('Reset Complete', 'All server reports and local queue items wiped.');
            } catch (err: any) {
              Alert.alert('Reset Failed', err?.message || 'Server error');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderReport = ({ item }: { item: ServerReport }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.reportId}>Server ID: #{item.id.slice(0, 8)}</Text>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>

      <Text style={styles.description}>{item.description}</Text>

      {/* Server Image Gallery */}
      <View style={styles.photoGrid}>
        {item.images.map((img) => (
          <View key={img.id} style={styles.photoCard}>
            <Image source={{ uri: img.url }} style={styles.photo} resizeMode="cover" />
            <Text style={styles.photoSize}>
              {(img.size / (1024 * 1024)).toFixed(2)} MB
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>Server Review</Text>
          <Text style={styles.subtitle}>Fetched directly from backend database</Text>
        </View>
        <TouchableOpacity style={styles.resetButton} onPress={handleStartOver}>
          <Text style={styles.resetButtonText}>⚠️ Reset All</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loadingText}>Fetching reports from server...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorEmoji}>🔌</Text>
          <Text style={styles.errorTitle}>Cannot Reach Server</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchReports}>
            <Text style={styles.retryText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>☁️</Text>
          <Text style={styles.emptyTitle}>No reports on server yet</Text>
          <Text style={styles.emptySubtitle}>
            Reports submitted in the Compose tab will appear here once uploaded.
          </Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderReport}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 11, color: '#64748B' },
  resetButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  resetButtonText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reportId: { fontSize: 12, fontWeight: '700', color: '#0284C7' },
  date: { fontSize: 11, color: '#94A3B8' },
  description: { fontSize: 14, fontWeight: '500', color: '#1E293B', marginBottom: 12 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoCard: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  photo: { width: '100%', height: '100%' },
  photoSize: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#FFFFFF',
    fontSize: 9,
    textAlign: 'center',
    borderRadius: 3,
  },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  errorEmoji: { fontSize: 40, marginBottom: 8 },
  errorTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  errorSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#0284C7', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center' },
});

