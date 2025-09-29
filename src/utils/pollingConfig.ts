/**
 * Data Freshness and Polling Configuration
 * 
 * Implements deterministic polling defaults and optional Supabase realtime subscriptions
 * as per frontend mandate requirements.
 */

// Polling intervals in milliseconds (configurable in UI dev settings)
export const POLLING_INTERVALS = {
  KPIs: 30 * 1000,        // 30 seconds
  GRAPHS: 60 * 1000,      // 60 seconds  
  PERSONAS: 15 * 1000,    // 15 seconds for persona table
  AUDIT: 15 * 1000,       // 15 seconds for audit table
  CONNECTIVITY: 30 * 1000  // 30 seconds for connectivity checks
} as const;

// Polling configuration interface
export interface PollingConfig {
  kpis: number;
  graphs: number;
  personas: number;
  audit: number;
  connectivity: number;
}

// Default polling configuration
export const DEFAULT_POLLING_CONFIG: PollingConfig = {
  kpis: POLLING_INTERVALS.KPIs,
  graphs: POLLING_INTERVALS.GRAPHS,
  personas: POLLING_INTERVALS.PERSONAS,
  audit: POLLING_INTERVALS.AUDIT,
  connectivity: POLLING_INTERVALS.CONNECTIVITY
};

// Polling manager class
export class PollingManager {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private config: PollingConfig = { ...DEFAULT_POLLING_CONFIG };

  constructor(config?: Partial<PollingConfig>) {
    if (config) {
      this.updateConfig(config);
    }
  }

  // Update polling configuration
  updateConfig(newConfig: Partial<PollingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔄 Updated polling configuration:', this.config);
  }

  // Start polling for a specific data type
  startPolling(
    type: keyof PollingConfig,
    callback: () => Promise<void> | void,
    immediate = true
  ): void {
    // Clear existing interval if any
    this.stopPolling(type);

    // Execute immediately if requested
    if (immediate) {
      try {
        const result = callback();
        if (result instanceof Promise) {
          result.catch(error => console.error(`Immediate polling callback failed for ${type}:`, error));
        }
      } catch (error) {
        console.error(`Immediate polling callback failed for ${type}:`, error);
      }
    }

    // Set up recurring interval
    const intervalId = setInterval(async () => {
      try {
        const result = callback();
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        console.error(`Polling callback failed for ${type}:`, error);
      }
    }, this.config[type]);

    this.intervals.set(type, intervalId);
    console.log(`🔄 Started polling for ${type} every ${this.config[type]}ms`);
  }

  // Stop polling for a specific data type
  stopPolling(type: keyof PollingConfig): void {
    const intervalId = this.intervals.get(type);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(type);
      console.log(`⏹️ Stopped polling for ${type}`);
    }
  }

  // Stop all polling
  stopAllPolling(): void {
    this.intervals.forEach((intervalId, type) => {
      clearInterval(intervalId);
      console.log(`⏹️ Stopped polling for ${type}`);
    });
    this.intervals.clear();
  }

  // Get current config
  getConfig(): PollingConfig {
    return { ...this.config };
  }

  // Get active polling types
  getActivePolling(): string[] {
    return Array.from(this.intervals.keys());
  }
}

// Realtime subscription manager (optional feature)
export class RealtimeSubscriptionManager {
  private subscriptions: Map<string, any> = new Map();
  private fallbackPolling: PollingManager;
  private connected = false;

  constructor(pollingManager: PollingManager) {
    this.fallbackPolling = pollingManager;
  }

  // Subscribe to Supabase realtime channels (if available)
  async subscribeToChannel(
    channelName: string,
    table: string,
    callback: () => void,
    fallbackPollingType?: keyof PollingConfig
  ): Promise<boolean> {
    try {
      // Check if we're in an environment with Supabase client available
      const supabase = (window as any).supabase;
      
      if (!supabase) {
        console.warn('Supabase client not available, using polling fallback');
        if (fallbackPollingType) {
          this.fallbackPolling.startPolling(fallbackPollingType, callback);
        }
        return false;
      }

      // Create subscription
      const subscription = supabase
        .channel(channelName)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: table 
          }, 
          (payload: any) => {
            console.log(`📡 Realtime update for ${table}:`, payload);
            callback();
          }
        )
        .subscribe((status: string) => {
          console.log(`📡 Subscription status for ${channelName}:`, status);
          
          if (status === 'SUBSCRIBED') {
            this.connected = true;
            // Stop fallback polling since realtime is working
            if (fallbackPollingType) {
              this.fallbackPolling.stopPolling(fallbackPollingType);
            }
          } else if (status === 'CLOSED' || status === 'TIMED_OUT') {
            this.connected = false;
            console.warn(`📡 Realtime connection lost for ${channelName}, starting fallback polling`);
            
            // Start fallback polling with exponential backoff
            if (fallbackPollingType) {
              this.startFallbackPolling(fallbackPollingType, callback);
            }
          }
        });

      this.subscriptions.set(channelName, subscription);
      return true;
    } catch (error) {
      console.error(`Failed to subscribe to ${channelName}:`, error);
      
      // Start fallback polling on error
      if (fallbackPollingType) {
        this.fallbackPolling.startPolling(fallbackPollingType, callback);
      }
      
      return false;
    }
  }

  // Start fallback polling with exponential backoff reconnection
  private startFallbackPolling(
    type: keyof PollingConfig,
    callback: () => void,
    retryAttempt = 0
  ): void {
    // Start immediate fallback polling
    this.fallbackPolling.startPolling(type, callback);

    // Attempt to reconnect with exponential backoff
    const reconnectDelay = Math.min(1000 * Math.pow(2, retryAttempt), 30000); // Max 30 seconds
    
    setTimeout(() => {
      if (!this.connected && retryAttempt < 5) {
        console.log(`📡 Attempting to reconnect realtime (attempt ${retryAttempt + 1})`);
        
        // Try to reestablish connection
        // This would need to be implemented based on the specific subscription
        this.startFallbackPolling(type, callback, retryAttempt + 1);
      }
    }, reconnectDelay);
  }

  // Unsubscribe from a channel
  unsubscribe(channelName: string): void {
    const subscription = this.subscriptions.get(channelName);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(channelName);
      console.log(`📡 Unsubscribed from ${channelName}`);
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll(): void {
    this.subscriptions.forEach((subscription, channelName) => {
      subscription.unsubscribe();
      console.log(`📡 Unsubscribed from ${channelName}`);
    });
    this.subscriptions.clear();
  }

  // Get connection status
  isConnected(): boolean {
    return this.connected;
  }

  // Get active subscriptions
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// Export singleton instances
export const pollingManager = new PollingManager();
export const realtimeManager = new RealtimeSubscriptionManager(pollingManager);

// Utility function to set up complete data freshness system
export function setupDataFreshness(config?: Partial<PollingConfig>): {
  polling: PollingManager;
  realtime: RealtimeSubscriptionManager;
} {
  if (config) {
    pollingManager.updateConfig(config);
  }

  return {
    polling: pollingManager,
    realtime: realtimeManager
  };
}

export default {
  POLLING_INTERVALS,
  DEFAULT_POLLING_CONFIG,
  PollingManager,
  RealtimeSubscriptionManager,
  pollingManager,
  realtimeManager,
  setupDataFreshness
};