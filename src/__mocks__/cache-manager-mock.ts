/**
 * Mock implementation of the cache manager
 */

export const cacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  has: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  preload: jest.fn().mockResolvedValue(0),
  save: jest.fn(),
  getStats: jest.fn().mockReturnValue({
    size: 0,
    hits: 0,
    misses: 0,
    hitRate: 0
  })
};