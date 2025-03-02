import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Logger, LogLevel } from '../logger.js';

describe('Logger Utility', () => {
  // Save original console methods
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  
  // Mock console methods
  beforeEach(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });
  
  // Restore original console methods
  afterEach(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('log method', () => {
    it('should log messages with appropriate level', () => {
      Logger.log(LogLevel.INFO, 'Test info message');
      expect(console.log).toHaveBeenCalled();
      expect((console.log as jest.Mock).mock.calls[0][0]).toContain('INFO:');
      expect((console.log as jest.Mock).mock.calls[0][0]).toContain('Test info message');
    });
    
    it('should handle metadata correctly', () => {
      const meta = { user: 'test', action: 'login' };
      Logger.log(LogLevel.ERROR, 'Test error with metadata', meta);
      
      expect(console.error).toHaveBeenCalled();
      const loggedMessage = (console.error as jest.Mock).mock.calls[0][0];
      expect(loggedMessage).toContain('ERROR:');
      expect(loggedMessage).toContain('Test error with metadata');
      expect(loggedMessage).toContain('"user": "test"');
      expect(loggedMessage).toContain('"action": "login"');
    });
  });

  describe('shorthand methods', () => {
    it('should call log with DEBUG level in debug method', () => {
      Logger.debug('Debug message');
      expect(console.log).toHaveBeenCalled();
      expect((console.log as jest.Mock).mock.calls[0][0]).toContain('DEBUG:');
    });
    
    it('should call log with INFO level in info method', () => {
      Logger.info('Info message');
      expect(console.log).toHaveBeenCalled();
      expect((console.log as jest.Mock).mock.calls[0][0]).toContain('INFO:');
    });
    
    it('should call log with WARN level in warn method', () => {
      Logger.warn('Warning message');
      expect(console.warn).toHaveBeenCalled();
      expect((console.warn as jest.Mock).mock.calls[0][0]).toContain('WARN:');
    });
    
    it('should call log with ERROR level in error method', () => {
      Logger.error('Error message');
      expect(console.error).toHaveBeenCalled();
      expect((console.error as jest.Mock).mock.calls[0][0]).toContain('ERROR:');
    });
    
    it('should handle errors in error method', () => {
      const testError = new Error('Test error');
      Logger.error('Error occurred', testError);
      
      expect(console.error).toHaveBeenCalled();
      const loggedMessage = (console.error as jest.Mock).mock.calls[0][0];
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
      Logger.info('Info message');   // Should be filtered out
      Logger.warn('Warn message');   // Should be filtered out
      Logger.error('Error message'); // Should be logged
      
      expect(console.log).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
      
      // Reset configuration for other tests
      Logger.configure({ minLevel: LogLevel.DEBUG });
    });
  });
});
