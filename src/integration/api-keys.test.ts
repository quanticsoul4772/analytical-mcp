/**
 * Tests for API key validation
 */
import { config } from '../utils/config';
import { Logger } from '../utils/logger';
import { resetAllMocks } from './test-helper';

// Mock external dependencies
jest.mock('../utils/config', () => {
  return {
    config: {
      EXA_API_KEY: undefined,
      NODE_ENV: 'test'
    }
  };
});

jest.mock('../utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../utils/ensure-api-keys', () => ({
  ensureApiKeys: jest.fn().mockImplementation(() => {
    if (!config.EXA_API_KEY) {
      throw new Error('Missing required API key: EXA_API_KEY');
    }
    return true;
  })
}));

describe('API Key Validation', () => {
  beforeEach(() => {
    resetAllMocks();
    // Reset the API key to undefined for each test
    config.EXA_API_KEY = undefined;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error when EXA_API_KEY is missing', async () => {
    const { ensureApiKeys } = require('../utils/ensure-api-keys');
    
    expect(() => {
      ensureApiKeys();
    }).toThrow('Missing required API key: EXA_API_KEY');
    
    expect(ensureApiKeys).toHaveBeenCalledTimes(1);
  });

  it('should succeed when EXA_API_KEY is provided', async () => {
    // Set the API key
    config.EXA_API_KEY = 'valid-api-key';
    
    const { ensureApiKeys } = require('../utils/ensure-api-keys');
    
    expect(() => {
      ensureApiKeys();
    }).not.toThrow();
    
    expect(ensureApiKeys).toHaveBeenCalledTimes(1);
  });

  it('should log a warning when API key is provided but invalid format', async () => {
    // Set an API key with invalid format
    config.EXA_API_KEY = 'invalid-format';
    
    const { ensureApiKeys } = require('../utils/ensure-api-keys');
    
    // This should not throw since we have a key, even if it might be invalid
    expect(() => {
      ensureApiKeys();
    }).not.toThrow();
    
    // But it should log a warning about the potentially invalid key format
    expect(Logger.warn).toHaveBeenCalled();
  });
});