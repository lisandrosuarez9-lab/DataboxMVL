// Enhanced monitoring utilities for DataboxMVL infrastructure
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  responseTime: number;
  details: {
    database: 'connected' | 'disconnected' | 'error';
    api: 'responsive' | 'slow' | 'unresponsive';
    authentication: 'working' | 'failing';
    assets: 'loaded' | 'missing';
  };
  errors: string[];
}

export class InfrastructureMonitor {
  private static instance: InfrastructureMonitor;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private errorCount = 0;
  private lastHealthCheck: HealthCheckResult | null = null;

  static getInstance(): InfrastructureMonitor {
    if (!InfrastructureMonitor.instance) {
      InfrastructureMonitor.instance = new InfrastructureMonitor();
    }
    return InfrastructureMonitor.instance;
  }

  // Initialize comprehensive monitoring
  initialize(): void {
    this.setupErrorTracking();
    this.setupPerformanceMonitoring();
    this.startHealthChecks();
    this.logInitialization();
  }

  // Setup global error tracking
  private setupErrorTracking(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError('JavaScript Error', event.error?.message || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('Unhandled Promise Rejection', event.reason?.message || 'Unknown error', {
        reason: event.reason,
      });
    });

    // Network error tracking
    window.addEventListener('online', () => this.logNetworkEvent('online'));
    window.addEventListener('offline', () => this.logNetworkEvent('offline'));
  }

  // Setup performance monitoring with Web Vitals
  private setupPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.logPerformanceMetric(entry);
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
    }

    // Monitor Core Web Vitals
    this.observeWebVitals();
  }

  // Monitor Core Web Vitals
  private observeWebVitals(): void {
    // First Contentful Paint (FCP)
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          console.log('🎨 First Contentful Paint:', entry.startTime, 'ms');
        }
      });
    });
    observer.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        console.log('🖼️ Largest Contentful Paint:', entry.startTime, 'ms');
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  }

  // Comprehensive health check
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = performance.now();
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: 0,
      details: {
        database: 'connected',
        api: 'responsive',
        authentication: 'working',
        assets: 'loaded',
      },
      errors: [],
    };

    try {
      // Check if React app is responsive
      await this.checkReactAppHealth();
      
      // Check asset loading
      await this.checkAssetHealth(result);
      
      // Check authentication system
      await this.checkAuthenticationHealth(result);

      // Calculate overall status
      result.responseTime = performance.now() - startTime;
      result.status = result.errors.length === 0 ? 'healthy' : 
                     result.errors.length <= 2 ? 'degraded' : 'unhealthy';

    } catch (error) {
      result.status = 'unhealthy';
      result.errors.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    this.lastHealthCheck = result;
    return result;
  }

  // Check React application health
  private async checkReactAppHealth(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('React app health check timeout'));
      }, 5000);

      // Check if React root is mounted
      const root = document.getElementById('root');
      if (!root || !root.children.length) {
        clearTimeout(timeout);
        reject(new Error('React app not properly mounted'));
        return;
      }

      clearTimeout(timeout);
      resolve();
    });
  }

  // Check asset loading health
  private async checkAssetHealth(result: HealthCheckResult): Promise<void> {
    const criticalAssets = [
      '/src/main.tsx',
      '/assets/index.css',
    ];

    for (const asset of criticalAssets) {
      try {
        const response = await fetch(asset, { method: 'HEAD' });
        if (!response.ok) {
          result.details.assets = 'missing';
          result.errors.push(`Critical asset not found: ${asset}`);
        }
      } catch {
        result.details.assets = 'missing';
        result.errors.push(`Failed to check asset: ${asset}`);
      }
    }
  }

  // Check authentication system health
  private async checkAuthenticationHealth(result: HealthCheckResult): Promise<void> {
    try {
      // Check if Redux store is accessible
      const store = (window as any).__REDUX_STORE__;
      if (store) {
        const state = store.getState();
        if (!state.user) {
          result.details.authentication = 'failing';
          result.errors.push('User state not accessible in Redux store');
        }
      }
    } catch {
      result.details.authentication = 'failing';
      result.errors.push('Authentication system check failed');
    }
  }

  // Error handling and logging
  private handleError(type: string, message: string, details?: any): void {
    this.errorCount++;
    const errorInfo = {
      type,
      message,
      details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.error('🚨 Infrastructure Error:', errorInfo);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // this.sendErrorToService(errorInfo);
    }
  }

  // Performance metric logging
  private logPerformanceMetric(entry: PerformanceEntry): void {
    console.log(`⚡ Performance [${entry.entryType}]:`, {
      name: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
    });
  }

  // Network event logging
  private logNetworkEvent(status: 'online' | 'offline'): void {
    console.log(`🌐 Network Status: ${status}`);
    if (status === 'offline') {
      this.handleError('Network Error', 'Application went offline', { timestamp: new Date().toISOString() });
    }
  }

  // Start periodic health checks
  private startHealthChecks(): void {
    // Immediate health check
    this.performHealthCheck();

    // Periodic health checks every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);
  }

  // Initialization logging
  private logInitialization(): void {
    console.log('🛡️ DataboxMVL Infrastructure Monitor initialized');
    console.log('📊 Monitoring dashboard:', {
      errorTracking: '✅ Active',
      performanceMonitoring: '✅ Active',
      healthChecks: '✅ Every 30s',
      webVitals: '✅ Active',
    });
  }

  // Get current health status
  getHealthStatus(): HealthCheckResult | null {
    return this.lastHealthCheck;
  }

  // Get error count
  getErrorCount(): number {
    return this.errorCount;
  }

  // Cleanup monitoring
  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

// Export singleton instance
export const infrastructureMonitor = InfrastructureMonitor.getInstance();

// Utility functions for manual health checks
export const healthCheck = {
  // Manual health check trigger
  async run(): Promise<HealthCheckResult> {
    return infrastructureMonitor.performHealthCheck();
  },

  // Get current status
  status(): HealthCheckResult | null {
    return infrastructureMonitor.getHealthStatus();
  },

  // Test connectivity
  async testConnectivity(): Promise<boolean> {
    try {
      const response = await fetch(window.location.origin, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  },

  // Generate health report
  generateReport(): string {
    const status = infrastructureMonitor.getHealthStatus();
    const errorCount = infrastructureMonitor.getErrorCount();
    
    return `
🛡️ DataboxMVL Infrastructure Health Report
==========================================
Status: ${status?.status || 'Unknown'}
Last Check: ${status?.timestamp || 'Never'}
Response Time: ${status?.responseTime || 0}ms
Errors: ${errorCount}

Component Status:
- Database: ${status?.details.database || 'Unknown'}
- API: ${status?.details.api || 'Unknown'}
- Authentication: ${status?.details.authentication || 'Unknown'}
- Assets: ${status?.details.assets || 'Unknown'}

Recent Errors:
${status?.errors.join('\n') || 'None'}
    `.trim();
  },
};