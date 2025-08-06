import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock the logger to prevent setup issues
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};

// Mock metricsCollector
const mockMetricsCollector = {
  formatJsonMetrics: jest.fn().mockReturnValue('{"test": "metrics"}'),
  formatPrometheusMetrics: jest.fn().mockReturnValue('# Test metrics\ntest_metric 1'),
  getSummary: jest.fn().mockReturnValue({ requests: 0, errors: 0 }),
};

// Mock config
const mockConfig = {
  enableMetrics: true,
};

// Use dynamic imports to avoid the jest module resolution issues
describe('MetricsServer Rate Limiting', () => {
  let MetricsServer: any;
  let metricsServer: any;
  
  beforeEach(async () => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Mock modules using jest.doMock
    jest.doMock('../logger.js', () => ({ Logger: mockLogger }));
    jest.doMock('../metrics_collector.js', () => ({ metricsCollector: mockMetricsCollector }));
    jest.doMock('../config.js', () => ({ config: mockConfig }));
    
    // Import the module after mocking
    const module = await import('../metrics_server.js');
    MetricsServer = module.MetricsServer;
  });

  afterEach(async () => {
    if (metricsServer && metricsServer.isRunning()) {
      await metricsServer.stop();
    }
    jest.resetModules();
  });

  describe('Rate Limiting Configuration', () => {
    it('should configure rate limit from environment variable', () => {
      process.env.METRICS_RATE_LIMIT = '30';
      metricsServer = new MetricsServer();
      const config = metricsServer.getConfig();
      expect(config.rateLimit).toBe(30);
      delete process.env.METRICS_RATE_LIMIT;
    });

    it('should use default rate limit when not configured', () => {
      delete process.env.METRICS_RATE_LIMIT;
      metricsServer = new MetricsServer();
      const config = metricsServer.getConfig();
      expect(config.rateLimit).toBe(60);
    });

    it('should prioritize environment variable over constructor config', () => {
      process.env.METRICS_RATE_LIMIT = '100';
      metricsServer = new MetricsServer({ rateLimit: 50 });
      const config = metricsServer.getConfig();
      expect(config.rateLimit).toBe(100);
      delete process.env.METRICS_RATE_LIMIT;
    });
  });

  describe('Rate Limiting Logic', () => {
    beforeEach(() => {
      process.env.METRICS_ENABLED = 'true';
      process.env.METRICS_RATE_LIMIT = '2'; // Low limit for testing
      metricsServer = new MetricsServer({ enabled: true, port: 0 });
    });

    afterEach(() => {
      delete process.env.METRICS_ENABLED;
      delete process.env.METRICS_RATE_LIMIT;
    });

    it('should allow requests within the rate limit', () => {
      // Test the rate limiting logic directly
      const ip = '192.168.1.1';
      
      // First request should be allowed
      const allowed1 = metricsServer['checkRateLimit'](ip);
      expect(allowed1).toBe(true);
      
      // Second request should be allowed (within limit of 2)
      const allowed2 = metricsServer['checkRateLimit'](ip);
      expect(allowed2).toBe(true);
    });

    it('should block requests exceeding the rate limit', () => {
      const ip = '192.168.1.2';
      
      // Use up the rate limit
      metricsServer['checkRateLimit'](ip);
      metricsServer['checkRateLimit'](ip);
      
      // Third request should be blocked
      const blocked = metricsServer['checkRateLimit'](ip);
      expect(blocked).toBe(false);
    });

    it('should handle different IPs separately', () => {
      const ip1 = '192.168.1.3';
      const ip2 = '192.168.1.4';
      
      // Use up rate limit for first IP
      metricsServer['checkRateLimit'](ip1);
      metricsServer['checkRateLimit'](ip1);
      
      // Third request from first IP should be blocked
      expect(metricsServer['checkRateLimit'](ip1)).toBe(false);
      
      // But requests from second IP should still be allowed
      expect(metricsServer['checkRateLimit'](ip2)).toBe(true);
    });

    it('should extract client IP from X-Forwarded-For header', () => {
      const mockReq = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 192.168.1.1, 10.0.0.1'
        },
        socket: { remoteAddress: '127.0.0.1' }
      };
      
      const ip = metricsServer['getClientIP'](mockReq);
      expect(ip).toBe('203.0.113.1');
    });

    it('should extract client IP from X-Real-IP header', () => {
      const mockReq = {
        headers: {
          'x-real-ip': '203.0.113.2'
        },
        socket: { remoteAddress: '127.0.0.1' }
      };
      
      const ip = metricsServer['getClientIP'](mockReq);
      expect(ip).toBe('203.0.113.2');
    });

    it('should fall back to socket remote address', () => {
      const mockReq = {
        headers: {},
        socket: { remoteAddress: '127.0.0.1' }
      };
      
      const ip = metricsServer['getClientIP'](mockReq);
      expect(ip).toBe('127.0.0.1');
    });

    it('should clean up expired rate limit entries', () => {
      const ip = '192.168.1.5';
      
      // Add an entry
      metricsServer['checkRateLimit'](ip);
      expect(metricsServer['rateLimitMap'].has(ip)).toBe(true);
      
      // Simulate time passage by manually setting an expired reset time
      const entry = metricsServer['rateLimitMap'].get(ip);
      entry.resetTime = Date.now() - 1000; // 1 second ago
      
      // Cleanup should remove the expired entry
      metricsServer['cleanupRateLimitMap'](Date.now());
      expect(metricsServer['rateLimitMap'].has(ip)).toBe(false);
    });
  });
});