/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        isolatedModules: true, // Faster compilation
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  testRegex: '(/__tests__/.*|/integration/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  coverageDirectory: './coverage',
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/integration/**', // Exclude integration tests from unit test coverage
  ],
  // Performance optimizations
  testTimeout: 30000,     // Reduced from 90s to 30s for unit tests
  verbose: false,         // Reduce output noise
  bail: false,
  maxWorkers: '50%',      // Use 50% of available cores
  forceExit: false,       // Let tests exit naturally to detect hanging processes
  detectOpenHandles: true, // Help identify memory leaks and hanging processes
  detectLeaks: true,      // Enable memory leak detection
  logHeapUsage: true,     // Log memory usage to help identify issues
  
  // Caching optimizations
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  
  // Test categorization
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            useESM: true,
            isolatedModules: true,
          },
        ],
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    },
    {
      displayName: 'integration', 
      testMatch: ['<rootDir>/src/integration/**/*.test.ts'],
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            useESM: true,
            isolatedModules: true,
          },
        ],
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
      maxWorkers: 1,      // Sequential execution for integration tests
    }
  ]
};