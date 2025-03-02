/**
 * Mock implementation of the config module
 */

// Default mock config values
export const config = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'DEBUG',
  EXA_API_KEY: 'test-api-key',
  ENABLE_RESEARCH_CACHE: 'true',
  CACHE_DIRECTORY: './test-cache',
  API_RATE_LIMIT: '100',
  FEATURE_ENHANCED_RESEARCH: 'true',
  FEATURE_ADVANCED_EXTRACTION: 'true',
  FEATURE_EXPERIMENTAL_NLP: 'false'
};

// Mock feature flag checker
export const isFeatureEnabled = jest.fn().mockImplementation(
  (featureName) => {
    if (featureName === 'FEATURE_ENHANCED_RESEARCH') return true;
    if (featureName === 'FEATURE_ADVANCED_EXTRACTION') return true;
    if (featureName === 'FEATURE_EXPERIMENTAL_NLP') return false;
    return false;
  }
);