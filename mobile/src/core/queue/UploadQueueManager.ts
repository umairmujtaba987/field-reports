import { QueueItem, LocalImage, QueueItemStatus } from '../../types/report';
import { queueStorage, QueueStorage } from './queueStorage';
import { compressImages } from '../images/compressor';
import { apiClient, ApiClient } from '../network/apiClient';
import { networkMonitor, NetworkMonitor } from '../network/networkMonitor';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type QueueListener = (items: QueueItem[]) => void;

export class UploadQueueManager {
  private queue: QueueItem[] = [];
  private isProcessing: boolean = false;
  private listeners: Set<QueueListener> = new Set();
  private storage: QueueStorage;
  private api: ApiClient;
  private net: NetworkMonitor;
  private retryTimeouts: Map<string, any> = new Map();

  constructor(
    storageInstance: QueueStorage = queueStorage,
    apiInstance: ApiClient = apiClient,
    netMonitorInstance: NetworkMonitor = networkMonitor
  ) {
    this.storage = storageInstance;
    this.api = apiInstance;
    this.net = netMonitorInstance;

    // Listen to network changes: resume queue automatically when back online
    this.net.subscribe((isConnected) => {
      if (isConnected) {
        console.log('[QueueManager] Network connected. Resuming queue processing...');
        this.triggerWorker();
      } else {
        console.log('[QueueManager] Network disconnected. Pausing active transfers.');
      }
    });
  }

  public async init(): Promise<void> {
    this.queue = await this.storage.loadQueue();

    // Clean up any items that were mid-flight when app was force-quit
    let modified = false;
    for (const item of this.queue) {
      if (item.status === 'UPLOADING' || item.status === 'COMPRESSING') {
        item.status = 'QUEUED';
        item.progress = 0;
        modified = true;
      }
    }
    if (modified) {
      await this.storage.saveQueue(this.queue);
    }

    this.notifyListeners();
    this.triggerWorker();
  }

  public getItems(): QueueItem[] {
    return [...this.queue];
  }

  public subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    listener(this.getItems());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const items = this.getItems();
    for (const l of this.listeners) {
      try {
        l(items);
      } catch (err) {
        console.error('[QueueManager] Listener error:', err);
      }
    }
  }

  /**
   * Enqueue a new report.
   * Validates bounds and persists immediately to disk before returning.
   */
  public async enqueue(
    description: string,
    images: LocalImage[]
  ): Promise<QueueItem> {
    if (!description || description.trim().length === 0) {
      throw new Error('Description is required and cannot be empty.');
    }
    if (!images || images.length < 1 || images.length > 5) {
      throw new Error(`Report must have between 1 and 5 images. Provided: ${images?.length || 0}`);
    }

    const clientReportId = generateUUID();
    const now = new Date().toISOString();

    const newItem: QueueItem = {
      clientReportId,
      description: description.trim(),
      images,
      status: 'QUEUED',
      progress: 0,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Immediately persist to disk (Survives force-quit)
    this.queue.unshift(newItem);
    await this.storage.saveQueue(this.queue);
    this.notifyListeners();

    // 2. Trigger worker
    this.triggerWorker();

    return newItem;
  }

  /**
   * Worker loop: processes pending items sequentially and unattended.
   */
  public async triggerWorker(): Promise<void> {
    if (this.isProcessing) return;

    const { isConnected } = this.net.getStatus();
    if (!isConnected) {
      console.log('[QueueManager] Offline. Waiting for network connection.');
      return;
    }

    // Find next actionable item (QUEUED or FAILED_RETRYING)
    const nextItem = this.queue.find(
      (item) => item.status === 'QUEUED' || item.status === 'FAILED_RETRYING'
    );

    if (!nextItem) {
      return;
    }

    this.isProcessing = true;
    try {
      await this.processItem(nextItem);
    } finally {
      this.isProcessing = false;
      // Loop to next item in queue
      this.triggerWorker();
    }
  }

  private async processItem(item: QueueItem): Promise<void> {
    try {
      // 1. Image Compression Stage
      const needsCompression = item.images.some((img) => !img.isCompressed && img.fileSize > 4.8 * 1024 * 1024);
      if (needsCompression) {
        this.updateItemState(item.clientReportId, { status: 'COMPRESSING' });
        item.images = await compressImages(item.images);
      }

      // 2. Uploading Stage
      this.updateItemState(item.clientReportId, {
        status: 'UPLOADING',
        progress: 0,
        attempts: item.attempts + 1,
      });

      const serverReport = await this.api.uploadReport(item, (percent) => {
        this.updateItemProgress(item.clientReportId, percent);
      });

      // 3. Success Stage: Landed on server
      this.updateItemState(item.clientReportId, {
        status: 'SUCCESS',
        progress: 100,
        serverId: serverReport.id,
        lastError: undefined,
      });

      console.log(`[QueueManager] Report ${item.clientReportId} successfully uploaded.`);
    } catch (err: any) {
      const errMsg = err?.message || 'Upload failed';
      console.warn(`[QueueManager] Report ${item.clientReportId} attempt failed: ${errMsg}`);

      this.updateItemState(item.clientReportId, {
        status: 'FAILED_RETRYING',
        lastError: errMsg,
      });

      // Exponential backoff retry: 2s, 4s, 8s, 16s, max 30s
      const delay = Math.min(2000 * Math.pow(1.5, item.attempts), 30000);
      console.log(`[QueueManager] Scheduling retry in ${delay}ms...`);

      if (this.retryTimeouts.has(item.clientReportId)) {
        clearTimeout(this.retryTimeouts.get(item.clientReportId));
      }

      const timer = setTimeout(() => {
        this.retryTimeouts.delete(item.clientReportId);
        this.triggerWorker();
      }, delay);
      this.retryTimeouts.set(item.clientReportId, timer);
    }
  }

  private async updateItemState(clientReportId: string, updates: Partial<QueueItem>) {
    const item = this.queue.find((i) => i.clientReportId === clientReportId);
    if (!item) return;

    Object.assign(item, updates, { updatedAt: new Date().toISOString() });
    await this.storage.saveQueue(this.queue);
    this.notifyListeners();
  }

  private updateItemProgress(clientReportId: string, progress: number) {
    const item = this.queue.find((i) => i.clientReportId === clientReportId);
    if (item && item.status === 'UPLOADING') {
      item.progress = progress;
      this.notifyListeners();
    }
  }

  public async retryNow(clientReportId: string): Promise<void> {
    const item = this.queue.find((i) => i.clientReportId === clientReportId);
    if (item) {
      item.status = 'QUEUED';
      item.progress = 0;
      await this.storage.saveQueue(this.queue);
      this.notifyListeners();
      this.triggerWorker();
    }
  }

  public async clearQueue(): Promise<void> {
    for (const timer of this.retryTimeouts.values()) {
      clearTimeout(timer);
    }
    this.retryTimeouts.clear();
    this.queue = [];
    await this.storage.clearAll();
    this.notifyListeners();
  }
}

export const uploadQueueManager = new UploadQueueManager();
