/**
 * Metrics HTTP Server
 * 
 * Provides HTTP endpoint for exposing metrics in Prometheus and JSON formats.
 * Runs alongside the main MCP server to provide observability.
 */

import http from 'http';
import { URL } from 'url';
import { Logger } from './logger.js';
import { metricsCollector } from './metrics_collector.js';
import { config } from './config.js';

/**
 * Configuration for the metrics server
 */
export interface MetricsServerConfig {
  port: number;
  host: string;
  enabled: boolean;
  rateLimit?: number;
  trustedProxies?: string[];
}

/**
 * Rate limit tracking for IP addresses
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * HTTP server for metrics endpoint
 */
export class MetricsServer {
  private server: http.Server | null = null;
  private config: MetricsServerConfig;
  private rateLimitMap: Map<string, RateLimitEntry> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<MetricsServerConfig>) {
    this.config = {
      port: parseInt(process.env.METRICS_PORT || config?.port?.toString() || '9090', 10),
      host: process.env.METRICS_HOST || config?.host || '127.0.0.1',
      enabled: process.env.METRICS_ENABLED === 'true' || config?.enabled === true,
      rateLimit: parseInt(process.env.METRICS_RATE_LIMIT || config?.rateLimit?.toString() || '60', 10),
      trustedProxies: config?.trustedProxies || [],
    };

    Logger.debug('MetricsServer configured', {
      port: this.config.port,
      host: this.config.host,
      enabled: this.config.enabled,
      rateLimit: this.config.rateLimit,
    });
  }

  /**
   * Start the metrics server
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      Logger.info('Metrics server is disabled');
      return;
    }

    if (this.server) {
      Logger.warn('Metrics server is already running');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer(this.handleRequest.bind(this));

      this.server.on('error', (error: Error) => {
        Logger.error('Metrics server error', error);
        reject(error);
      });

      this.server.listen(this.config.port, this.config.host, () => {
        Logger.info(`Metrics server started on http://${this.config.host}:${this.config.port}`);
        this.startPeriodicCleanup();
        resolve();
      });
    });
  }

  /**
   * Stop the metrics server
   */
  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    return new Promise((resolve) => {
      this.server!.close(() => {
        Logger.info('Metrics server stopped');
        this.stopPeriodicCleanup();
        this.server = null;
        resolve();
      });
    });
  }

  /**
   * Get server configuration
   */
  getConfig(): MetricsServerConfig {
    return { ...this.config };
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.server !== null && this.server.listening;
  }

  /**
   * Get the actual port the server is listening on
   * This is useful when port is set to 0 (dynamic port allocation)
   */
  getPort(): number | null {
    if (!this.server || !this.server.listening) {
      return null;
    }
    
    const address = this.server.address();
    if (address && typeof address === 'object' && 'port' in address) {
      return address.port;
    }
    
    return null;
  }

  /**
   * Check rate limit for IP address
   */
  private checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    
    // Clean up expired entries
    this.cleanupRateLimitMap(now);
    
    const entry = this.rateLimitMap.get(ip);
    
    if (!entry) {
      // First request from this IP
      this.rateLimitMap.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }
    
    if (now > entry.resetTime) {
      // Reset window
      entry.count = 1;
      entry.resetTime = now + windowMs;
      return true;
    }
    
    if (entry.count >= this.config.rateLimit!) {
      return false; // Rate limit exceeded
    }
    
    entry.count++;
    return true;
  }

  /**
   * Clean up expired rate limit entries to prevent memory leaks
   */
  private cleanupRateLimitMap(now: number): void {
    for (const [ip, entry] of this.rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitMap.delete(ip);
      }
    }
  }

  /**
   * Start periodic cleanup of expired rate limit entries
   */
  private startPeriodicCleanup(): void {
    // Clean up expired entries every 5 minutes
    this.cleanupTimer = setInterval(() => {
      this.cleanupRateLimitMap(Date.now());
    }, 5 * 60 * 1000);
  }

  /**
   * Stop periodic cleanup timer
   */
  private stopPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Handle HTTP requests
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const startTime = Date.now();

    try {
      // Parse URL
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const path = url.pathname;
      const format = url.searchParams.get('format') || 'prometheus';

      Logger.debug('Metrics request received', {
        method: req.method,
        path,
        format,
        userAgent: req.headers['user-agent'],
      });

      // Set CORS headers
      this.setCORSHeaders(res);

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Only allow GET requests
      if (req.method !== 'GET') {
        this.sendError(res, 405, 'Method Not Allowed');
        return;
      }

      // Route requests
      switch (path) {
        case '/metrics':
          this.handleMetricsRequestWithRateLimit(req, res, format);
          break;
        case '/health':
          this.handleHealthRequest(res);
          break;
        case '/':
          this.handleRootRequest(res);
          break;
        default:
          this.sendError(res, 404, 'Not Found');
          break;
      }

      // Log request completion
      const duration = Date.now() - startTime;
      Logger.debug('Metrics request completed', { path, duration });

    } catch (error) {
      Logger.error('Error handling metrics request', error);
      this.sendError(res, 500, 'Internal Server Error');
    }
  }

  /**
   * Handle /metrics endpoint with rate limiting
   */
  private handleMetricsRequestWithRateLimit(req: http.IncomingMessage, res: http.ServerResponse, format: string): void {
    // Extract client IP address
    const clientIP = this.getClientIP(req);
    
    // Check rate limit
    if (!this.checkRateLimit(clientIP)) {
      const resetTime = this.getRateLimitResetTime(clientIP);
      
      Logger.warn(`Rate limit exceeded for IP ${clientIP} on /metrics endpoint`);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.config.rateLimit!.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
      res.setHeader('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString());
      
      this.sendError(res, 429, 'Too Many Requests');
      return;
    }
    
    // Add rate limit headers for successful requests
    const entry = this.rateLimitMap.get(clientIP);
    if (entry) {
      res.setHeader('X-RateLimit-Limit', this.config.rateLimit!.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.rateLimit! - entry.count).toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());
    }
    
    this.handleMetricsRequest(res, format);
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(req: http.IncomingMessage): string {
    const socketIP = req.socket.remoteAddress || 'unknown';
    
    // Only trust proxy headers if the request is coming from a trusted proxy
    if (this.config.trustedProxies && this.config.trustedProxies.length > 0) {
      const isTrustedProxy = this.config.trustedProxies.includes(socketIP);
      
      if (isTrustedProxy) {
        // Check for forwarded headers first (for proxy/load balancer scenarios)
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
          // Take the first IP in the chain
          const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
          return ips.split(',')[0].trim();
        }
        
        const realIP = req.headers['x-real-ip'];
        if (realIP && !Array.isArray(realIP)) {
          return realIP;
        }
      }
    }
    
    // Fall back to socket remote address
    return socketIP;
  }

  /**
   * Get rate limit reset time for IP
   */
  private getRateLimitResetTime(ip: string): number {
    const entry = this.rateLimitMap.get(ip);
    return entry ? entry.resetTime : Date.now() + 60000;
  }

  /**
   * Handle /metrics endpoint
   */
  private handleMetricsRequest(res: http.ServerResponse, format: string): void {
    try {
      let content: string;
      let contentType: string;

      switch (format.toLowerCase()) {
        case 'json':
          content = metricsCollector.formatJsonMetrics();
          contentType = 'application/json';
          break;
        case 'prometheus':
        default:
          content = metricsCollector.formatPrometheusMetrics();
          contentType = 'text/plain; version=0.0.4';
          break;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': Buffer.byteLength(content),
      });
      res.end(content);

    } catch (error) {
      Logger.error('Error generating metrics', error);
      this.sendError(res, 500, 'Error generating metrics');
    }
  }

  /**
   * Handle /health endpoint
   */
  private handleHealthRequest(res: http.ServerResponse): void {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      summary: metricsCollector.getSummary(),
    };

    const content = JSON.stringify(health, null, 2);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(content),
    });
    res.end(content);
  }

  /**
   * Handle root endpoint
   */
  private handleRootRequest(res: http.ServerResponse): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Analytical MCP Metrics Server</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        .endpoint { margin: 20px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
        .code { font-family: monospace; background: #e8e8e8; padding: 2px 4px; border-radius: 3px; }
        a { color: #0066cc; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>Analytical MCP Metrics Server</h1>
    <p>This server provides observability metrics for the Analytical MCP server.</p>
    
    <div class="endpoint">
        <h3>Available Endpoints:</h3>
        <ul>
            <li><a href="/metrics">/metrics</a> - Circuit breaker and cache metrics (Prometheus format)</li>
            <li><a href="/metrics?format=json">/metrics?format=json</a> - Metrics in JSON format</li>
            <li><a href="/health">/health</a> - Health check endpoint</li>
        </ul>
    </div>

    <div class="endpoint">
        <h3>Usage Examples:</h3>
        <p><span class="code">curl http://localhost:${this.config.port}/metrics</span></p>
        <p><span class="code">curl http://localhost:${this.config.port}/metrics?format=json</span></p>
        <p><span class="code">curl http://localhost:${this.config.port}/health</span></p>
    </div>

    <div class="endpoint">
        <h3>Current Status:</h3>
        <p>Server: Running</p>
        <p>Port: ${this.config.port}</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
    </div>
</body>
</html>`;

    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Content-Length': Buffer.byteLength(html),
    });
    res.end(html);
  }

  /**
   * Send error response
   */
  private sendError(res: http.ServerResponse, statusCode: number, message: string): void {
    const error = {
      error: message,
      statusCode,
      timestamp: new Date().toISOString(),
    };

    const content = JSON.stringify(error, null, 2);
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(content),
    });
    res.end(content);
  }

  /**
   * Set CORS headers
   */
  private setCORSHeaders(res: http.ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

// Export singleton instance
export const metricsServer = new MetricsServer();