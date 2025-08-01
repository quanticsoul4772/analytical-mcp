import { jest } from '@jest/globals';

export const createMockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
});

export const createMockCache = () => ({
  get: jest.fn(),
  set: jest.fn(),
  has: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  size: jest.fn(() => 0),
});

export const createMockRateLimiter = () => ({
  checkLimit: jest.fn().mockResolvedValue(true),
  getRemainingRequests: jest.fn().mockReturnValue(100),
  getResetTime: jest.fn().mockReturnValue(Date.now() + 3600000),
});

export const waitForNextTick = () => new Promise(resolve => process.nextTick(resolve));

export const waitForTimeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const expectWithTimeout = async <T>(
  fn: () => Promise<T>,
  timeout: number = 5000
): Promise<T> => {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout)
    ),
  ]);
};

export const mockConsole = () => {
  const originalConsole = { ...console };
  const mockMethods = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(() => {
    Object.assign(console, mockMethods);
  });

  afterEach(() => {
    Object.assign(console, originalConsole);
  });

  return mockMethods;
};

export const createDataFactory = <T>(template: T) => {
  return (overrides: Partial<T> = {}): T => ({
    ...template,
    ...overrides,
  });
};

export const expectToThrowAsync = async (fn: () => Promise<any>, expectedError?: string | RegExp) => {
  try {
    await fn();
    throw new Error('Expected function to throw');
  } catch (error: any) {
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect(error.message).toContain(expectedError);
      } else {
        expect(error.message).toMatch(expectedError);
      }
    }
    return error;
  }
};

export const suppressConsoleOutput = () => {
  const originalMethods = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  beforeAll(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.info = jest.fn();
  });

  afterAll(() => {
    Object.assign(console, originalMethods);
  });
};

export const captureConsoleOutput = () => {
  const outputs: { level: string; args: any[] }[] = [];
  const originalMethods = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  beforeEach(() => {
    outputs.length = 0;
    console.log = (...args: any[]) => outputs.push({ level: 'log', args });
    console.warn = (...args: any[]) => outputs.push({ level: 'warn', args });
    console.error = (...args: any[]) => outputs.push({ level: 'error', args });
    console.info = (...args: any[]) => outputs.push({ level: 'info', args });
  });

  afterEach(() => {
    Object.assign(console, originalMethods);
  });

  return {
    getOutputs: () => outputs,
    getOutputsByLevel: (level: string) => outputs.filter(o => o.level === level),
    clearOutputs: () => { outputs.length = 0; },
  };
};