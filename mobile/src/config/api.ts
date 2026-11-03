// Platform-aware baseUrl resolution with graceful Node.js / headless fallback
let isAndroid = true;
try {
  const RN = require('react-native');
  if (RN && RN.Platform) {
    isAndroid = RN.Platform.OS === 'android';
  }
} catch (_) {
  // Node / headless testing environment
}

// In Android emulator, 10.0.2.2 maps to the host machine's localhost
export const DEFAULT_API_BASE = isAndroid
  ? 'http://10.0.2.2:3000'
  : 'http://localhost:3000';

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
