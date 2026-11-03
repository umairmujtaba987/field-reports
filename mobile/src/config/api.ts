// Platform-aware baseUrl resolution
// Defaulting to host machine's Wi-Fi IP for direct physical Android phone testing
export const DEFAULT_API_BASE = 'http://192.168.11.52:3000';

export interface ApiConfig {
  baseUrl: string;
  timeoutMs: number;
  chaosDrop?: boolean;
  chaosHang?: boolean;
  chaosDelayMs?: number;
  chaosErrorCode?: number;
}

export const activeApiConfig: ApiConfig = {
  baseUrl: DEFAULT_API_BASE,
  timeoutMs: 30000, // 30s timeout for 2G networks
};

export function setApiBaseUrl(url: string) {
  let cleaned = url.trim();
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  activeApiConfig.baseUrl = cleaned;
  console.log('[API CONFIG] Base URL updated to:', activeApiConfig.baseUrl);
}
