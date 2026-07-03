import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Logger, LogLevel } from '../logger.js';

describe('Logger Utility', () => {
  // MCP servers use stdout for protocol communication, so the logger routes
  // every level (DEBUG/INFO/WARN/ERROR) to console.error (stderr).
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Ensure a known configuration for every test
    Logger.configure({ minLevel: LogLevel.DEBUG, includeTimestamp: true, includeStack: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();

    // Restore default logger configuration for other suites
    Logger.configure({ minLevel: LogLevel.INFO, includeTimestamp: true, includeStack: true });
  });

  const lastCallArg = (): string =>
    String(errorSpy.mock.calls[errorSpy.mock.calls.length - 1]![0]);

  describe('log method', () => {
    it('should log messages with appropriate level', () => {
      Logger.log(LogLevel.INFO, 'Test info message');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = lastCallArg();
      expect(loggedMessage).toContain('INFO:');
      expect(loggedMessage).toContain('Test info message');
    });

    it('should handle metadata correctly', () => {
      const meta = { user: 'test', action: 'login' };
      Logger.log(LogLevel.ERROR, 'Test error with metadata', meta);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = lastCallArg();
      expect(loggedMessage).toContain('ERROR:');
      expect(loggedMessage).toContain('Test error with metadata');
      expect(loggedMessage).toContain('"user": "test"');
      expect(loggedMessage).toContain('"action": "login"');
    });

    it('should include a timestamp prefix when configured', () => {
      Logger.log(LogLevel.INFO, 'Timestamped message');

      // ISO timestamp in square brackets, e.g. [2026-07-02T12:00:00.000Z]
      expect(lastCallArg()).toMatch(/^\[\d{4}-\d{2}-\d{2}T[\d:.]+Z\] INFO:/);
    });

    it('should omit the timestamp when disabled', () => {
      Logger.configure({ includeTimestamp: false });

      Logger.log(LogLevel.INFO, 'No timestamp message');

      expect(lastCallArg()).toMatch(/^INFO: No timestamp message/);
    });
  });

  describe('shorthand methods', () => {
    it('should call log with DEBUG level in debug method', () => {
      Logger.debug('Debug message');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = lastCallArg();
      expect(loggedMessage).toContain('DEBUG:');
      expect(loggedMessage).toContain('Debug message');
    });

    it('should call log with INFO level in info method', () => {
      Logger.info('Info message');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = lastCallArg();
      expect(loggedMessage).toContain('INFO:');
      expect(loggedMessage).toContain('Info message');
    });

    it('should call log with WARN level in warn method', () => {
      Logger.warn('Warning message');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = lastCallArg();
      expect(loggedMessage).toContain('WARN:');
      expect(loggedMessage).toContain('Warning message');
    });

    it('should call log with ERROR level in error method', () => {
      Logger.error('Error message');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = lastCallArg();
      expect(loggedMessage).toContain('ERROR:');
      expect(loggedMessage).toContain('Error message');
    });

    it('should handle errors in error method', () => {
      const testError = new Error('Test error');
      Logger.error('Error occurred', testError);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = lastCallArg();
      expect(loggedMessage).toContain('ERROR:');
      expect(loggedMessage).toContain('Error occurred');
      expect(loggedMessage).toContain('Test error');
    });
  });

  describe('configuration', () => {
    it('should respect minimum log level', () => {
      // Configure to only show ERROR logs
      Logger.configure({ minLevel: LogLevel.ERROR });

      Logger.debug('Debug message'); // Should be filtered out
      Logger.info('Info message'); // Should be filtered out
      Logger.warn('Warn message'); // Should be filtered out
      Logger.error('Error message'); // Should be logged

      // Only the ERROR call reaches the console
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(lastCallArg()).toContain('ERROR: Error message');
    });

    it('should log everything at DEBUG level', () => {
      Logger.configure({ minLevel: LogLevel.DEBUG });

      Logger.debug('Debug message');
      Logger.info('Info message');
      Logger.warn('Warn message');
      Logger.error('Error message');

      expect(errorSpy).toHaveBeenCalledTimes(4);
    });
  });
});
