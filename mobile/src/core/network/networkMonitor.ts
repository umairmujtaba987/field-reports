type NetworkChangeListener = (isConnected: boolean, is2G: boolean) => void;

let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo').default || require('@react-native-community/netinfo');
} catch (e) {
  // Headless test environment
}

export class NetworkMonitor {
  private listeners: Set<NetworkChangeListener> = new Set();
  private isConnected: boolean = true;
  private is2G: boolean = false;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (NetInfo && typeof NetInfo.addEventListener === 'function') {
      this.unsubscribe = NetInfo.addEventListener((state: any) => {
        const connected = Boolean(state.isConnected && state.isInternetReachable !== false);
        const cellularGeneration = state.details?.cellularGeneration;
        const isSlow = cellularGeneration === '2g';

        this.isConnected = connected;
        this.is2G = isSlow;
        this.notifyListeners();
      });
    }
  }

  public getStatus() {
    return {
      isConnected: this.isConnected,
      is2G: this.is2G,
    };
  }

  public subscribe(listener: NetworkChangeListener): () => void {
    this.listeners.add(listener);
    // Notify immediately with current state
    listener(this.isConnected, this.is2G);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.isConnected, this.is2G);
      } catch (e) {
        console.error('[NetworkMonitor] Error in listener callback:', e);
      }
    }
  }

  // Method for tests to simulate online/offline changes headlessly
  public setMockStatus(connected: boolean, is2g: boolean = false) {
    this.isConnected = connected;
    this.is2G = is2g;
    this.notifyListeners();
  }

  public destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.listeners.clear();
  }
}

export const networkMonitor = new NetworkMonitor();

