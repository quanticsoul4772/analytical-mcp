import { describe, it, expect, jest, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
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

jest.mock('../metrics_collector', () => ({
  metricsCollector: {
    formatJsonMetrics: jest.fn().mockReturnValue('{"mock": "json"}'),
    formatPrometheusMetrics: jest.fn().mockReturnValue('# Mock prometheus metrics'),
    getSummary: jest.fn().mockReturnValue({ requests: 0, errors: 0 }),
  },
}));

jest.mock('../config', () => ({
  config: {
    enableMetrics: true,
  },
}));

// Import after mocking
import { MetricsServer } from '../metrics_server.js';

describe('MetricsServer', () => {
  let metricsServer: MetricsServer;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (metricsServer && metricsServer.isRunning()) {
      await metricsServer.stop();
    }
    process.env = originalEnv;
  });

  describe('Rate Limiting Configuration', () => {
    it('should use default rate limit of 60 requests per minute', () => {
      delete process.env.METRICS_RATE_LIMIT;
      metricsServer = new MetricsServer();
      const config = metricsServer.getConfig();
      expect(config.rateLimit).toBe(60);
    });

    it('should use METRICS_RATE_LIMIT environment variable', () => {
      process.env.METRICS_RATE_LIMIT = '120';
      metricsServer = new MetricsServer();
      const config = metricsServer.getConfig();
      expect(config.rateLimit).toBe(120);
    });

    it('should use config parameter for rate limit', () => {
      metricsServer = new MetricsServer({ rateLimit: 30 });
      const config = metricsServer.getConfig();
      expect(config.rateLimit).toBe(30);
    });

    it('should prioritize environment variable over config parameter', () => {
      process.env.METRICS_RATE_LIMIT = '90';
      metricsServer = new MetricsServer({ rateLimit: 30 });
      const config = metricsServer.getConfig();
      expect(config.rateLimit).toBe(90);
    });
  });

  describe('Rate Limiting Functionality', () => {
    beforeEach(async () => {
      process.env.METRICS_ENABLED = 'true';
      process.env.METRICS_RATE_LIMIT = '2'; // Set low limit for testing
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

    it('should allow requests within rate limit', async () => {
      const port = metricsServer.getPort();
      expect(port).not.toBeNull();

      // First request should succeed
      const response1 = await makeRequest(port!, '/metrics');
      expect(response1.statusCode).toBe(200);
      expect(response1.headers['x-ratelimit-limit']).toBe('2');
      expect(response1.headers['x-ratelimit-remaining']).toBe('1');

      // Second request should succeed
      const response2 = await makeRequest(port!, '/metrics');
      expect(response2.statusCode).toBe(200);
      expect(response2.headers['x-ratelimit-remaining']).toBe('0');
    });

    it('should block requests exceeding rate limit with HTTP 429', async () => {
      const port = metricsServer.getPort();
      expect(port).not.toBeNull();

      // Make two requests to reach the limit
      await makeRequest(port!, '/metrics');
      await makeRequest(port!, '/metrics');

      // Third request should be blocked
      const response = await makeRequest(port!, '/metrics');
      expect(response.statusCode).toBe(429);
      expect(response.headers['x-ratelimit-limit']).toBe('2');
      expect(response.headers['x-ratelimit-remaining']).toBe('0');
      expect(response.headers['retry-after']).toBeDefined();
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Too Many Requests');
      expect(body.statusCode).toBe(429);
    });

    it('should include proper rate limit headers', async () => {
      const port = metricsServer.getPort();
      expect(port).not.toBeNull();

      const response = await makeRequest(port!, '/metrics');
      expect(response.statusCode).toBe(200);
      expect(response.headers['x-ratelimit-limit']).toBe('2');
      expect(response.headers['x-ratelimit-remaining']).toBe('1');
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
      
      // Parse the reset timestamp and verify it's in the future
      const resetTime = parseInt(response.headers['x-ratelimit-reset'] as string);
      expect(resetTime).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should reset rate limit after time window', async () => {
      const port = metricsServer.getPort();
      expect(port).not.toBeNull();

      // Make requests to reach the limit
      await makeRequest(port!, '/metrics');
      await makeRequest(port!, '/metrics');

      // Third request should be blocked
      const blockedResponse = await makeRequest(port!, '/metrics');
      expect(blockedResponse.statusCode).toBe(429);

      // Wait for rate limit window to reset (1 minute + small buffer)
      // For testing, we'll mock the time passage
      jest.useFakeTimers();
      jest.advanceTimersByTime(61 * 1000); // Advance by 61 seconds

      // New request should succeed after window reset
      const response = await makeRequest(port!, '/metrics');
      expect(response.statusCode).toBe(200);
      
      jest.useRealTimers();
    }, 10000);

    it('should handle different IP addresses separately', async () => {
      const port = metricsServer.getPort();
      expect(port).not.toBeNull();

      // Simulate requests from different IPs by setting X-Forwarded-For header
      const response1 = await makeRequest(port!, '/metrics', { 'X-Forwarded-For': '192.168.1.1' });
      expect(response1.statusCode).toBe(200);
      expect(response1.headers['x-ratelimit-remaining']).toBe('1');

      const response2 = await makeRequest(port!, '/metrics', { 'X-Forwarded-For': '192.168.1.2' });
      expect(response2.statusCode).toBe(200);
      expect(response2.headers['x-ratelimit-remaining']).toBe('1');
    });

    it('should not apply rate limiting to non-metrics endpoints', async () => {
      const port = metricsServer.getPort();
      expect(port).not.toBeNull();

      // Make requests to reach the limit on /metrics
      await makeRequest(port!, '/metrics');
      await makeRequest(port!, '/metrics');

      // Request to /health should still work
      const response = await makeRequest(port!, '/health');
      expect(response.statusCode).toBe(200);
    });
  });

  describe('Client IP Detection', () => {
    beforeEach(async () => {
      process.env.METRICS_ENABLED = 'true';
      metricsServer = new MetricsServer({
        port: 0,
        enabled: true,
      });
      await metricsServer.start();
    });

    it('should extract IP from X-Forwarded-For header', async () => {
      const port = metricsServer.getPort();
      expect(port).not.toBeNull();

      const response = await makeRequest(port!, '/metrics', { 
        'X-Forwarded-For': '203.0.113.1, 192.168.1.1, 10.0.0.1' 
      });
      expect(response.statusCode).toBe(200);
    });

    it('should extract IP from X-Real-IP header', async () => {
      const port = metricsServer.getPort();
      expect(port).not.toBeNull();

      const response = await makeRequest(port!, '/metrics', { 
        'X-Real-IP': '203.0.113.2' 
      });
      expect(response.statusCode).toBe(200);
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