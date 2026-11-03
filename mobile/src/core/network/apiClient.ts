import { activeApiConfig } from '../../config/api';
import { QueueItem, ServerReport } from '../../types/report';

export class ApiClient {
  public async uploadReport(
    item: QueueItem,
    onProgress?: (progressPercent: number) => void
  ): Promise<ServerReport> {
    const url = `${activeApiConfig.baseUrl}/api/reports`;

    // 1. If XMLHttpRequest is available (React Native environment), use it for progress updates
    if (typeof XMLHttpRequest !== 'undefined') {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.timeout = activeApiConfig.timeoutMs;

        if (activeApiConfig.chaosDrop) xhr.setRequestHeader('x-chaos-drop', 'true');
        if (activeApiConfig.chaosHang) xhr.setRequestHeader('x-chaos-hang', 'true');
        if (activeApiConfig.chaosDelayMs && activeApiConfig.chaosDelayMs > 0) {
          xhr.setRequestHeader('x-chaos-delay', activeApiConfig.chaosDelayMs.toString());
        }
        if (activeApiConfig.chaosErrorCode) {
          xhr.setRequestHeader('x-chaos-error', activeApiConfig.chaosErrorCode.toString());
        }

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              onProgress(percent);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data: ServerReport = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (e) {
              reject(new Error('Invalid JSON response from server'));
            }
          } else {
            let errMsg = `Upload failed with status ${xhr.status}`;
            try {
              const errJson = JSON.parse(xhr.responseText);
              if (errJson.error) errMsg = errJson.error;
            } catch (_) {}
            reject(new Error(errMsg));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error: Connection refused or dropped mid-stream'));
        };

        xhr.ontimeout = () => {
          reject(new Error(`Network timeout: Server did not respond within ${activeApiConfig.timeoutMs / 1000}s`));
        };

        const formData = new FormData();
        formData.append('clientReportId', item.clientReportId);
        formData.append('description', item.description);

        for (const img of item.images) {
          formData.append('images', {
            uri: img.uri,
            name: img.fileName,
            type: img.type || 'image/jpeg',
          } as any);
        }

        xhr.send(formData);
      });
    }

    // 2. Node.js / Headless environment fallback using global fetch & FormData
    const formData = new FormData();
    formData.append('clientReportId', item.clientReportId);
    formData.append('description', item.description);

    for (const img of item.images) {
      formData.append('images', new Blob([Buffer.alloc(img.fileSize || 1024)], { type: img.type || 'image/jpeg' }), img.fileName);
    }

    const headers: Record<string, string> = {};
    if (activeApiConfig.chaosDrop) headers['x-chaos-drop'] = 'true';
    if (activeApiConfig.chaosHang) headers['x-chaos-hang'] = 'true';
    if (activeApiConfig.chaosDelayMs) headers['x-chaos-delay'] = activeApiConfig.chaosDelayMs.toString();
    if (activeApiConfig.chaosErrorCode) headers['x-chaos-error'] = activeApiConfig.chaosErrorCode.toString();

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Upload failed with status ${response.status}`);
    }

    if (onProgress) onProgress(100);
    return await response.json();
  }

  public async getReports(): Promise<ServerReport[]> {
    const url = `${activeApiConfig.baseUrl}/api/reports`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch reports: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.reports || [];
  }

  public async resetServer(): Promise<void> {
    const url = `${activeApiConfig.baseUrl}/api/reset`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
      throw new Error(`Failed to reset server: ${response.status}`);
    }
  }
}

export const apiClient = new ApiClient();
