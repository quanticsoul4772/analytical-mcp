/**
 * Mock implementation of the Logger
 */

export const Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  initializeFromEnvironment: jest.fn(),
  setLogLevel: jest.fn(),
  getLogLevel: jest.fn().mockReturnValue('INFO')
};