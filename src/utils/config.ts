/**
 * Configuration Module
 *
 * Centralizes environment-based configuration settings
 */

import dotenv from 'dotenv';
import { Logger } from './logger.js';

// Load environment variables from .env file
dotenv.config();

// Environment-specific configuration
export enum Environment {
  DEVELOPMENT = 'development',
  TEST = 'test',
  PRODUCTION = 'production',
}

// Environment features
export interface FeatureFlags {
  researchIntegration: boolean;
  advancedStatistics: boolean;
  perspectiveGeneration: boolean;
  caching: boolean;
  advancedNlp: boolean;
  // Add other feature flags as needed
}

// Default feature flags based on environment
const DEFAULT_FEATURE_FLAGS: Record<Environment, FeatureFlags> = {
  [Environment.DEVELOPMENT]: {
    researchIntegration: true,
    advancedStatistics: true,
    perspectiveGeneration: true,
    caching: true,
    advancedNlp: true,
  },
  [Environment.TEST]: {
    researchIntegration: false, // Disabled by default in tests
    advancedStatistics: true,
    perspectiveGeneration: true,
    caching: false, // Disabled for tests to ensure consistent results
    advancedNlp: false, // Disabled by default for tests
  },
  [Environment.PRODUCTION]: {
    researchIntegration: false, // Disabled by default in production
    advancedStatistics: true,
    perspectiveGeneration: true,
    caching: true,
    advancedNlp: true,
  },
};

// Configuration object
export const config = {
  // Core settings
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '3000',
  HOST: process.env.HOST || 'localhost',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // API Keys - Expected to be in system environment variables
  EXA_API_KEY: process.env.EXA_API_KEY || '',

  // Feature flags from environment variables
  ENABLE_RESEARCH_INTEGRATION: process.env.ENABLE_RESEARCH_INTEGRATION || 'false',
  ENABLE_ADVANCED_STATISTICS: process.env.ENABLE_ADVANCED_STATISTICS || 'true',
  ENABLE_PERSPECTIVE_GENERATION: process.env.ENABLE_PERSPECTIVE_GENERATION || 'true',
  ENABLE_RESEARCH_CACHE: process.env.ENABLE_RESEARCH_CACHE || 'false',
  ENABLE_ADVANCED_NLP: process.env.ENABLE_ADVANCED_NLP || 'true',

  // Cache configuration
  CACHE_PERSISTENT: process.env.CACHE_PERSISTENT || 'true',
  CACHE_DIR: process.env.CACHE_DIR || './cache',
  CACHE_DEFAULT_TTL: process.env.CACHE_DEFAULT_TTL || '86400000', // 24 hours
  CACHE_CLEANUP_INTERVAL: process.env.CACHE_CLEANUP_INTERVAL || '3600000', // 1 hour

  // Feature-specific cache TTLs
  CACHE_TTL_SEARCH: process.env.CACHE_TTL_SEARCH || '3600000', // 1 hour
  CACHE_TTL_FACTS: process.env.CACHE_TTL_FACTS || '86400000', // 24 hours
  CACHE_TTL_VALIDATION: process.env.CACHE_TTL_VALIDATION || '43200000', // 12 hours
  CACHE_TTL_CROSS_DOMAIN: process.env.CACHE_TTL_CROSS_DOMAIN || '604800000', // 7 days
  
  // NLP configuration
  NLP_USE_EXA: process.env.NLP_USE_EXA || 'true',
  NLP_COREFERENCE_ENABLED: process.env.NLP_COREFERENCE_ENABLED || 'true',
  NLP_RELATIONSHIP_ENABLED: process.env.NLP_RELATIONSHIP_ENABLED || 'true',
  NLP_EXA_SEARCH_PARAMS: {
    numResults: Number(process.env.NLP_EXA_NUM_RESULTS) || 3,
    useWebResults: process.env.NLP_EXA_USE_WEB !== 'false',
    useNewsResults: process.env.NLP_EXA_USE_NEWS === 'true',
  },

  // Metrics server configuration
  METRICS_ENABLED: process.env.METRICS_ENABLED || 'true',
  METRICS_PORT: process.env.METRICS_PORT || '9090',
  METRICS_HOST: process.env.METRICS_HOST || '0.0.0.0',
};

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const environment = (config.NODE_ENV as Environment) || Environment.DEVELOPMENT;

  // Environment variable overrides take precedence
  if (feature === 'researchIntegration') {
    return config.ENABLE_RESEARCH_INTEGRATION === 'true';
  }

  if (feature === 'advancedStatistics') {
    return config.ENABLE_ADVANCED_STATISTICS === 'true';
  }

  if (feature === 'perspectiveGeneration') {
    return config.ENABLE_PERSPECTIVE_GENERATION === 'true';
  }

  if (feature === 'caching') {
    return config.ENABLE_RESEARCH_CACHE === 'true';
  }
  
  if (feature === 'advancedNlp') {
    return config.ENABLE_ADVANCED_NLP === 'true';
  }

  // Fallback to defaults
  return DEFAULT_FEATURE_FLAGS[environment][feature] || false;
}

// Log configuration on startup
Logger.debug('Configuration loaded', {
  environment: config.NODE_ENV,
  features: {
    researchIntegration: isFeatureEnabled('researchIntegration'),
    advancedStatistics: isFeatureEnabled('advancedStatistics'),
    perspectiveGeneration: isFeatureEnabled('perspectiveGeneration'),
    caching: isFeatureEnabled('caching'),
    advancedNlp: isFeatureEnabled('advancedNlp'),
  },
  cacheSettings: {
    persistent: config.CACHE_PERSISTENT,
    directory: config.CACHE_DIR,
    defaultTTL: config.CACHE_DEFAULT_TTL,
  },
  nlpSettings: {
    useExa: config.NLP_USE_EXA,
    coreferenceEnabled: config.NLP_COREFERENCE_ENABLED,
    relationshipEnabled: config.NLP_RELATIONSHIP_ENABLED,
  }
});
