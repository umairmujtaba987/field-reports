import { QueueItem } from '../../types/report';

const QUEUE_STORAGE_KEY = '@field_reports_upload_queue_v1';

let AsyncStorage: any = null;
try {
  // Only load native AsyncStorage when running in a React Native or browser context
  if (typeof (global as any).nativeCallSyncHook !== 'undefined' || typeof window !== 'undefined') {
    AsyncStorage =
      require('@react-native-async-storage/async-storage').default ||
      require('@react-native-async-storage/async-storage');
  }
} catch (e) {
  // Headless test or Node environment
}

export class QueueStorage {
  // In-memory persistent cache for headless tests or fallback
  private memoryCache: Map<string, QueueItem> = new Map();

  async loadQueue(): Promise<QueueItem[]> {
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      try {
        const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
        if (raw) {
          const items: QueueItem[] = JSON.parse(raw);
          this.memoryCache.clear();
          items.forEach((item) => this.memoryCache.set(item.clientReportId, item));
          return items;
        }
      } catch (err) {
        console.warn('[QueueStorage] Failed to read from AsyncStorage, using memory cache:', err);
      }
    }
    return Array.from(this.memoryCache.values());
  }

  async saveQueue(items: QueueItem[]): Promise<void> {
    this.memoryCache.clear();
    items.forEach((item) => this.memoryCache.set(item.clientReportId, item));

    if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
      try {
        await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
      } catch (err) {
        console.warn('[QueueStorage] Failed to write to AsyncStorage:', err);
      }
    }
  }

  async upsertItem(item: QueueItem): Promise<void> {
    const all = await this.loadQueue();
    const idx = all.findIndex((i) => i.clientReportId === item.clientReportId);
    if (idx >= 0) {
      all[idx] = item;
    } else {
      all.push(item);
    }
    await this.saveQueue(all);
  }

  async removeItem(clientReportId: string): Promise<void> {
    const all = await this.loadQueue();
    const filtered = all.filter((i) => i.clientReportId !== clientReportId);
    await this.saveQueue(filtered);
  }

  async clearAll(): Promise<void> {
    this.memoryCache.clear();
    if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
      try {
        await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
      } catch (err) {
        console.warn('[QueueStorage] Failed to clear AsyncStorage:', err);
      }
    }
  }
}

export const queueStorage = new QueueStorage();
