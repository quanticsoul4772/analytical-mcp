/**
 * Mock implementation for API helper functions
 */

import { APIError } from '../utils/errors.js';

export const executeApiRequest = jest.fn().mockImplementation(async (url, options, retryConfig) => {
  // Mock implementation can be customized in tests to return different responses
  // or throw specific errors
  return {
    status: 200,
    json: async () => ({ success: true, data: 'Mock API response' }),
    headers: new Map(),
    ok: true
  };
});

export const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];