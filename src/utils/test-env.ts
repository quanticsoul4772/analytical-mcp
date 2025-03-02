/**
 * Test Environment Utilities
 *
 * Provides functions to load and configure test-specific environment variables
 */

import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

/**
 * Loads test-specific environment variables from .env.test file
 * Falls back to .env file if .env.test doesn't exist
 */
export function loadTestEnv(): void {
  const testEnvPath = path.resolve(process.cwd(), '.env.test');
  const defaultEnvPath = path.resolve(process.cwd(), '.env');

  // First try to load test-specific environment
  if (fs.existsSync(testEnvPath)) {
    config({ path: testEnvPath });
    console.log('Loaded test environment variables from .env.test');
  }
  // Fall back to default environment
  else if (fs.existsSync(defaultEnvPath)) {
    config({ path: defaultEnvPath });
    console.log('Loaded default environment variables from .env');
  } else {
    console.warn('No environment file found. Using process environment variables only.');
  }
}

/**
 * Validates that required environment variables are set
 * @param requiredVars List of required environment variable names
 * @returns Object with missing variables if any
 */
export function validateRequiredEnvVars(requiredVars: string[]): {
  valid: boolean;
  missing: string[];
} {
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Gets an environment variable with fallback
 * @param name Environment variable name
 * @param defaultValue Default value if not set
 * @returns The environment variable value or default
 */
export function getEnvVar(name: string, defaultValue: string = ''): string {
  return process.env[name] || defaultValue;
}

/**
 * Verifies API environment variables are properly set for testing
 * Throws detailed error messages if configuration is missing
 */
export function verifyApiTestConfiguration(): void {
  // Check for required API keys
  const requiredVars = ['EXA_API_KEY'];
  const { valid, missing } = validateRequiredEnvVars(requiredVars);

  if (!valid) {
    const missingList = missing.join(', ');
    throw new Error(
      `Missing required environment variables for API testing: ${missingList}.\n` +
        `Please set these variables in your .env.test file or environment.\n` +
        `For EXA_API_KEY, get a test key from https://exa.ai`
    );
  }
}
