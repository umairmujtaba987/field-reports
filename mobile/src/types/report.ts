export interface LocalImage {
  id: string;
  uri: string;
  fileName: string;
  fileSize: number; // in bytes
  type: string;
  isCompressed?: boolean;
}

export type QueueItemStatus =
  | 'QUEUED'           // Saved to local disk, waiting to upload
  | 'COMPRESSING'      // Compressing large camera photos to <5MB
  | 'UPLOADING'        // Currently in flight to server
  | 'FAILED_RETRYING'  // Network died or server refused, scheduled for retry
  | 'SUCCESS';         // Landed on server confirmed

export interface QueueItem {
  clientReportId: string; // Persistent UUID (Idempotency key)
  description: string;
  images: LocalImage[];
  status: QueueItemStatus;
  progress: number;       // 0 to 100
  attempts: number;       // Number of upload attempts
  createdAt: string;
  updatedAt: string;
  lastError?: string;
  serverId?: string;      // Server-assigned ID upon successful upload
}

export interface ServerReportImage {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  url: string;
}

export interface ServerReport {
  id: string;
  clientReportId: string;
  description: string;
  images: ServerReportImage[];
  createdAt: string;
  updatedAt: string;
}

