export interface ReportImage {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  url: string;
}

export interface Report {
  id: string;
  clientReportId: string;
  description: string;
  images: ReportImage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChaosConfig {
  enabled: boolean;
  delayMs: number;
  failureRate: number; // 0.0 to 1.0
  dropRate: number;    // 0.0 to 1.0
  hangRate: number;    // 0.0 to 1.0
  errorCode: number;   // HTTP status code to return on error, e.g. 500 or 503
}

