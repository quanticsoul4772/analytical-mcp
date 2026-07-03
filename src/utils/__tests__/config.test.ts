import { describe, it, expect, jest, beforeEach, afterAll } from '@jest/globals';

// Mock dotenv as a no-op so the repo's .env file cannot repopulate variables the
// tests delete. Registered before any dynamic import of the config module.
import.meta.jest.unstable_mockModule('dotenv', () => {
  const configFn = jest.fn(() => ({ parsed: {} }));
  return {
    default: { config: configFn },
    config: configFn,
  };
});

// Environment variables the config module reads and these tests manipulate
const MANAGED_KEYS = [
  'NODE_ENV',
  'PORT',
  'HOST',
  'LOG_LEVEL',
  'EXA_API_KEY',
  'ENABLE_RESEARCH_INTEGRATION',
  'ENABLE_ADVANCED_STATISTICS',
  'ENABLE_PERSPECTIVE_GENERATION',
  'ENABLE_RESEARCH_CACHE',
  'ENABLE_ADVANCED_NLP',
  'CACHE_PERSISTENT',
  'CACHE_DIR',
  'NLP_EXA_NUM_RESULTS',
  'NLP_EXA_USE_WEB',
  'NLP_EXA_USE_NEWS',
  'METRICS_ENABLED',
  'METRICS_PORT',
  'METRICS_HOST',
];

const originalEnv: Record<string, string | undefined> = {};
for (const key of MANAGED_KEYS) {
  originalEnv[key] = process.env[key];
}

// The config module reads process.env at import time, so each test sets up the
// environment first and then imports a fresh copy of the module.
async function freshConfig(): Promise<typeof import('../config.js')> {
  jest.resetModules();
  return import('../config.js');
}

describe('Configuration Module', () => {
  beforeEach(() => {
    for (const key of MANAGED_KEYS) {
      delete process.env[key];
    }
  });

  afterAll(() => {
    for (const key of MANAGED_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  describe('Config Loading', () => {
    it('should apply default values when environment variables are not provided', async () => {
      const { config } = await freshConfig();

      expect(config.NODE_ENV).toBe('development');
      expect(config.PORT).toBe('3000');
      expect(config.HOST).toBe('localhost');
      expect(config.LOG_LEVEL).toBe('info');
      expect(config.EXA_API_KEY).toBe('');
      expect(config.ENABLE_RESEARCH_INTEGRATION).toBe('false');
      expect(config.ENABLE_ADVANCED_STATISTICS).toBe('true');
      expect(config.ENABLE_PERSPECTIVE_GENERATION).toBe('true');
      expect(config.ENABLE_RESEARCH_CACHE).toBe('false');
      expect(config.ENABLE_ADVANCED_NLP).toBe('true');
      expect(config.CACHE_PERSISTENT).toBe('true');
      expect(config.CACHE_DIR).toBe('./cache');
      expect(config.METRICS_ENABLED).toBe('true');
      expect(config.METRICS_PORT).toBe('9090');
      expect(config.METRICS_HOST).toBe('127.0.0.1');
    });

    it('should load values from environment variables when provided', async () => {
      process.env.NODE_ENV = 'production';
      process.env.PORT = '8080';
      process.env.HOST = 'api.example.com';
      process.env.LOG_LEVEL = 'ERROR';
      process.env.EXA_API_KEY = 'test-api-key';
      process.env.ENABLE_RESEARCH_INTEGRATION = 'true';

      const { config } = await freshConfig();

      expect(config.NODE_ENV).toBe('production');
      expect(config.PORT).toBe('8080');
      expect(config.HOST).toBe('api.example.com');
      expect(config.LOG_LEVEL).toBe('ERROR');
      expect(config.EXA_API_KEY).toBe('test-api-key');
      expect(config.ENABLE_RESEARCH_INTEGRATION).toBe('true');
    });

    it('should expose env-derived values as strings without conversion', async () => {
      process.env.PORT = '9999';
      process.env.ENABLE_RESEARCH_INTEGRATION = 'true';

      const { config } = await freshConfig();

      expect(config.PORT).toBe('9999');
      expect(typeof config.PORT).toBe('string');
      expect(typeof config.ENABLE_RESEARCH_INTEGRATION).toBe('string');
    });

    it('should derive NLP_EXA_SEARCH_PARAMS from environment variables', async () => {
      process.env.NLP_EXA_NUM_RESULTS = '7';
      process.env.NLP_EXA_USE_WEB = 'false';
      process.env.NLP_EXA_USE_NEWS = 'true';

      const { config } = await freshConfig();

      expect(config.NLP_EXA_SEARCH_PARAMS).toEqual({
        numResults: 7,
        useWebResults: false,
        useNewsResults: true,
      });
    });

    it('should apply NLP_EXA_SEARCH_PARAMS defaults when variables are unset', async () => {
      const { config } = await freshConfig();

      expect(config.NLP_EXA_SEARCH_PARAMS).toEqual({
        numResults: 3,
        useWebResults: true,
        useNewsResults: false,
      });
    });
  });

  describe('Metrics Port Validation', () => {
    it('should accept a valid METRICS_PORT', async () => {
      process.env.METRICS_PORT = '9191';

      const { config } = await freshConfig();

      expect(config.METRICS_PORT).toBe('9191');
    });

    it('should throw when METRICS_PORT is not a number', async () => {
      process.env.METRICS_PORT = 'not-a-number';

      await expect(freshConfig()).rejects.toThrow('Invalid metrics port: not-a-number');
    });

    it('should throw when METRICS_PORT is out of range', async () => {
      process.env.METRICS_PORT = '70000';

      await expect(freshConfig()).rejects.toThrow(
        'Invalid metrics port: 70000 (must be between 1 and 65535)'
      );
    });
  });

  describe('Environment Enum', () => {
    it('should expose the supported environments', async () => {
      const { Environment } = await freshConfig();

      expect(Environment.DEVELOPMENT).toBe('development');
      expect(Environment.TEST).toBe('test');
      expect(Environment.PRODUCTION).toBe('production');
    });
  });

  describe('isFeatureEnabled', () => {
    it('should enable researchIntegration only when the flag is set to true', async () => {
      process.env.ENABLE_RESEARCH_INTEGRATION = 'true';
      let { isFeatureEnabled } = await freshConfig();
      expect(isFeatureEnabled('researchIntegration')).toBe(true);

      process.env.ENABLE_RESEARCH_INTEGRATION = 'false';
      ({ isFeatureEnabled } = await freshConfig());
      expect(isFeatureEnabled('researchIntegration')).toBe(false);

      delete process.env.ENABLE_RESEARCH_INTEGRATION;
      ({ isFeatureEnabled } = await freshConfig());
      expect(isFeatureEnabled('researchIntegration')).toBe(false);
    });

    it('should require the exact string "true" to enable a feature flag', async () => {
      process.env.ENABLE_RESEARCH_INTEGRATION = 'TRUE';
      let { isFeatureEnabled } = await freshConfig();
      expect(isFeatureEnabled('researchIntegration')).toBe(false);

      process.env.ENABLE_RESEARCH_INTEGRATION = '1';
      ({ isFeatureEnabled } = await freshConfig());
      expect(isFeatureEnabled('researchIntegration')).toBe(false);
    });

    it('should tie the caching feature to ENABLE_RESEARCH_CACHE', async () => {
      process.env.ENABLE_RESEARCH_CACHE = 'true';
      let { isFeatureEnabled } = await freshConfig();
      expect(isFeatureEnabled('caching')).toBe(true);

      process.env.ENABLE_RESEARCH_CACHE = 'false';
      ({ isFeatureEnabled } = await freshConfig());
      expect(isFeatureEnabled('caching')).toBe(false);
    });

    it('should default advancedStatistics and perspectiveGeneration to enabled', async () => {
      const { isFeatureEnabled } = await freshConfig();

      expect(isFeatureEnabled('advancedStatistics')).toBe(true);
      expect(isFeatureEnabled('perspectiveGeneration')).toBe(true);
    });

    it('should handle unknown feature in isFeatureEnabled', async () => {
      const { isFeatureEnabled } = await freshConfig();

      // @ts-expect-error - Testing runtime behavior with invalid input
      expect(isFeatureEnabled('unknownFeature')).toBe(false);
    });
  });
});
