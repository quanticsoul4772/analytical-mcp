/**
 * Configuration Manager
 *
 * Centralized environment variable management with validation
 */

import { z } from 'zod';
import { Logger } from './logger.js';
import { ConfigurationError } from './errors.js';
import dotenv from 'dotenv';

// Initialize environment variables from .env file
try {
  const result = dotenv.config();
  if (result.error) {
    Logger.warn('Error loading .env file. Using system environment variables.', result.error);
  } else {
    Logger.debug('Loaded environment variables from .env file');
  }
} catch (error) {
  Logger.warn('Failed to load .env file', error);
}

// Define schema for environment variables
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Server configuration
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .optional()
    .default('3000'),
  HOST: z.string().optional().default('localhost'),
  LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).optional().default('INFO'),

  // API Keys
  EXA_API_KEY: z.string().optional(),

  // Feature flags
  ENABLE_RESEARCH_INTEGRATION: z
    .string()
    .transform((val) => val.toLowerCase() === 'true')
    .pipe(z.boolean())
    .optional()
    .default('false'),
});

// Export environment configuration type
export type EnvConfig = z.infer<typeof envSchema>;

// Validate and load environment variables
function loadConfig(): EnvConfig {
  try {
    // Validate environment variables
    const config = envSchema.parse(process.env);

    // Log missing optional values at debug level
    if (!config.EXA_API_KEY) {
      Logger.debug('EXA_API_KEY is not set. Research integration features will be limited.');
    }

    // Log active configuration (without sensitive values)
    Logger.debug('Environment configuration loaded', {
      NODE_ENV: config.NODE_ENV,
      PORT: config.PORT,
      HOST: config.HOST,
      LOG_LEVEL: config.LOG_LEVEL,
      ENABLE_RESEARCH_INTEGRATION: config.ENABLE_RESEARCH_INTEGRATION,
      // Don't log API keys!
      EXA_API_KEY: config.EXA_API_KEY ? '[CONFIGURED]' : '[NOT SET]',
    });

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      Logger.error('Environment configuration validation failed', error, {
        issues: error.issues,
      });
      throw new ConfigurationError(`Invalid environment configuration: ${error.message}`);
    }

    Logger.error('Failed to load environment configuration', error);
    throw new ConfigurationError('Failed to load environment configuration');
  }
}

// Create and export singleton configuration
export const config = loadConfig();

// Helper function to get configuration value with type checking
export function getConfig<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
  return config[key];
}

// Helper to check if a feature is enabled
export function isFeatureEnabled(feature: 'researchIntegration'): boolean {
  switch (feature) {
    case 'researchIntegration':
      return config.ENABLE_RESEARCH_INTEGRATION && !!config.EXA_API_KEY;
    default:
      return false;
  }
}
