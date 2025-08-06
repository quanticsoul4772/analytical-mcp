import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import http from 'http';

// Save original environment to restore it later
const originalEnv = process.env;

// Mock dependencies before importing the main module
jest.mock('../logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  },
}));

// Mock metrics collector with controllable response size
const mockMetricsCollector = {
  formatJsonMetrics: jest.fn(),
  formatPrometheusMetrics: jest.fn(),
  getSummary: jest.fn().mockReturnValue({ requests: 0, errors: 0 }),
};

jest.mock('../metrics_collector', () => ({
  metricsCollector: mockMetricsCollector,
}));

jest.mock('../config', () => ({
  config: {
    enableMetrics: true,
  },
}));

// Import after mocking
import { MetricsServer } from '../metrics_server.js';

describe('MetricsServer Content Length Limits', () => {
  let metricsServer: MetricsServer;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockMetricsCollector.formatJsonMetrics.mockReturnValue('{"mock": "json"}');
    mockMetricsCollector.formatPrometheusMetrics.mockReturnValue('# Mock prometheus metrics');
  });

  afterEach(async () => {
    if (metricsServer && metricsServer.isRunning()) {
      await metricsServer.stop();
    }
    process.env = originalEnv;
  });

  describe('Content Size Limit Configuration', () => {
    it('should use default limit of 1MB when not specified', () => {
      metricsServer = new MetricsServer();
      const config = metricsServer.getConfig();
      expect(config.maxMetricsBytes).toBe(1048576); // 1MB in bytes
    });

    it('should use MAX_METRICS_BYTES environment variable', () => {
      process.env.MAX_METRICS_BYTES = '2097152'; // 2MB
      metricsServer = new MetricsServer();
      const config = metricsServer.getConfig();
      expect(config.maxMetricsBytes).toBe(2097152);
    });

    it('should use config parameter for max bytes', () => {
      metricsServer = new MetricsServer({ maxMetricsBytes: 512000 }); // 500KB
      const config = metricsServer.getConfig();
      expect(config.maxMetricsBytes).toBe(512000);
    });

    it('should prioritize environment variable over config parameter', () => {
      process.env.MAX_METRICS_BYTES = '3145728'; // 3MB
      metricsServer = new MetricsServer({ maxMetricsBytes: 512000 }); // 500KB
      const config = metricsServer.getConfig();
      expect(config.maxMetricsBytes).toBe(3145728);
    });
  });

  describe('Content Size Enforcement', () => {
    beforeEach(async () => {
      process.env.METRICS_ENABLED = 'true';
      process.env.MAX_METRICS_BYTES = '100'; // Set very small limit for testing
      metricsServer = new MetricsServer({
        port: 0, // Use dynamic port
        enabled: true,
      });
      await metricsServer.start();
    });

    afterEach(async () => {
      if (metricsServer && metricsServer.isRunning()) {
        await metricsServer.stop();
      }
    });

    it('should allow metrics responses within size limit', async () => {
      const port = metricsServer.getPort();
      expect(port).not.toBeNull();

      // Mock small response that fits within limit
      mockMetricsCollector.formatPrometheusMetrics.mockReturnValue('small');
      
      const response = await makeRequest(port!, '/metrics');
      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('small');
    });

    it('should block Prometheus metrics response exceeding size limit with HTTP 413', async () => {
      const port = metricsServer.getPort();
      expect(port).not.toBeNull();

      // Mock large response that exceeds limit (over 100 bytes)
      const largeResponse = 'x'.repeat(200); // 200 bytes
      mockMetricsCollector.formatPrometheusMetrics.mockReturnValue(largeResponse);
      
      const response = await makeRequest(port!, '/metrics');
      expect(response.statusCode).toBe(413);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Payload Too Large');
      expect(body.statusCode).toBe(413);
      expect(response.headers['content-type']).toBe('application/json');
    });

    it('should block JSON metrics response exceeding size limit with HTTP 413', async () => {
      const port = metricsServer.getPort();
      expect(port).not.toBeNull();

      // Mock large JSON response that exceeds limit
      const largeJsonResponse = JSON.stringify({ data: 'x'.repeat(200) }); // Over 200 bytes
      mockMetricsCollector.formatJsonMetrics.mockReturnValue(largeJsonResponse);
      
      const response = await makeRequest(port!, '/metrics?format=json');
      expect(response.statusCode).toBe(413);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Payload Too Large');
      expect(body.statusCode).toBe(413);
    });

    it('should include timestamp in error response', async () => {
      const port = metricsServer.getPort();
      expect(port).not.toBeNull();

      // Mock large response
      mockMetricsCollector.formatPrometheusMetrics.mockReturnValue('x'.repeat(200));
      
      const beforeRequest = Date.now();
      const response = await makeRequest(port!, '/metrics');
      const afterRequest = Date.now();
      
      expect(response.statusCode).toBe(413);
      
      const body = JSON.parse(response.body);
      const responseTime = new Date(body.timestamp).getTime();
      expect(responseTime).toBeGreaterThanOrEqual(beforeRequest);
      expect(responseTime).toBeLessThanOrEqual(afterRequest);
    });

    it('should not affect health endpoint', async () => {
      const port = metricsServer.getPort();
      expect(port).not.toBeNull();

      // Mock large metrics response
      mockMetricsCollector.formatPrometheusMetrics.mockReturnValue('x'.repeat(200));
      
      // Health endpoint should still work normally
      const response = await makeRequest(port!, '/health');
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/json');
    });

    it('should properly calculate byte length for multi-byte characters', async () => {
      const port = metricsServer.getPort();
      expect(port).not.toBeNull();

      // Mock response with multi-byte characters that exceeds limit when counted by bytes
      const responseWithUnicode = '🔥'.repeat(30); // Each emoji is 4 bytes, so 120 bytes total
      mockMetricsCollector.formatPrometheusMetrics.mockReturnValue(responseWithUnicode);
      
      const response = await makeRequest(port!, '/metrics');
      expect(response.statusCode).toBe(413);
    });
  });

  describe('Content Size Edge Cases', () => {
    it('should handle exactly at size limit', async () => {
      process.env.METRICS_ENABLED = 'true';
      process.env.MAX_METRICS_BYTES = '10'; // Exactly 10 bytes
      metricsServer = new MetricsServer({
        port: 0,
        enabled: true,
      });
      await metricsServer.start();

      try {
        const port = metricsServer.getPort();
        expect(port).not.toBeNull();

        // Mock response that's exactly at the limit
        mockMetricsCollector.formatPrometheusMetrics.mockReturnValue('1234567890'); // Exactly 10 bytes
        
        const response = await makeRequest(port!, '/metrics');
        expect(response.statusCode).toBe(200);
        expect(response.body).toBe('1234567890');
      } finally {
        await metricsServer.stop();
      }
    });

    it('should handle empty metrics response', async () => {
      process.env.METRICS_ENABLED = 'true';
      process.env.MAX_METRICS_BYTES = '100';
      metricsServer = new MetricsServer({
        port: 0,
        enabled: true,
      });
      await metricsServer.start();

      try {
        const port = metricsServer.getPort();
        expect(port).not.toBeNull();

        // Mock empty response
        mockMetricsCollector.formatPrometheusMetrics.mockReturnValue('');
        
        const response = await makeRequest(port!, '/metrics');
        expect(response.statusCode).toBe(200);
        expect(response.body).toBe('');
        expect(response.headers['content-length']).toBe('0');
      } finally {
        await metricsServer.stop();
      }
    });
  });
});

/**
 * Helper function to make HTTP requests for testing
 */
function makeRequest(
  port: number, 
  path: string, 
  headers: Record<string, string> = {}
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method: 'GET',
      headers,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers as Record<string, string>,
          body,
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}