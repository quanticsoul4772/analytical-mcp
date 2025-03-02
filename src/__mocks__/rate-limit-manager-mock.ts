/**
 * Mock implementation of the rate limit manager
 */

export const rateLimitManager = {
  checkRateLimit: jest.fn().mockResolvedValue(true),
  recordApiCall: jest.fn(),
  getRateLimitStatus: jest.fn().mockReturnValue({
    remaining: 100,
    resetAt: Date.now() + 3600000,
    totalLimit: 1000
  }),
  resetRateLimits: jest.fn()
};