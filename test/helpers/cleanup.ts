/**
 * Test cleanup utilities
 * Ensures tests clean up resources properly
 */

import { jest } from '@jest/globals';

export class TestCleanup {
  private static cleanupTasks: Array<() => Promise<void> | void> = [];
  
  static addCleanupTask(task: () => Promise<void> | void) {
    this.cleanupTasks.push(task);
  }
  
  static async runCleanup() {
    for (const task of this.cleanupTasks) {
      try {
        await task();
      } catch (error) {
        console.warn('Cleanup task failed:', error);
      }
    }
    this.cleanupTasks.length = 0;
  }
  
  static setupGlobalCleanup() {
    // Clean up after all tests
    afterAll(async () => {
      await this.runCleanup();
    });
    
    // Clean up on process exit
    process.on('exit', () => {
      // Synchronous cleanup only
      this.cleanupTasks.forEach(task => {
        try {
          const result = task();
          if (result && typeof result.then === 'function') {
            console.warn('Async cleanup task ignored on process exit');
          }
        } catch (error) {
          console.warn('Exit cleanup failed:', error);
        }
      });
    });
  }
}

export const withTempDirectory = async (testFn: (tempDir: string) => Promise<void>) => {
  const tempDir = `/tmp/analytical-mcp-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  
  try {
    // Create temp directory
    await import('fs/promises').then(fs => fs.mkdir(tempDir, { recursive: true }));
    
    // Run test
    await testFn(tempDir);
  } finally {
    // Cleanup temp directory
    try {
      await import('fs/promises').then(fs => fs.rm(tempDir, { recursive: true, force: true }));
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
    }
  }
};

export const withMockEnvironment = (envVars: Record<string, string>) => {
  return (testFn: () => Promise<void> | void) => {
    return async () => {
      const originalEnv = { ...process.env };
      
      try {
        // Set test environment variables
        Object.assign(process.env, envVars);
        
        // Run test
        await testFn();
      } finally {
        // Restore original environment
        process.env = originalEnv;
      }
    };
  };
};

export const suppressLogsDuring = (testFn: () => Promise<void> | void) => {
  return async () => {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
    };
    
    try {
      // Suppress console output
      console.log = jest.fn();
      console.warn = jest.fn();
      console.error = jest.fn();
      console.info = jest.fn();
      
      // Run test
      await testFn();
    } finally {
      // Restore console
      Object.assign(console, originalConsole);
    }
  };
};

export const measureExecutionTime = async <T>(
  fn: () => Promise<T>,
  label?: string
): Promise<{ result: T; duration: number }> => {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  
  const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
  
  if (label) {
    console.log(`${label}: ${duration.toFixed(2)}ms`);
  }
  
  return { result, duration };
};

export const retryOnFailure = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  throw lastError!;
};

// Initialize global cleanup
TestCleanup.setupGlobalCleanup();