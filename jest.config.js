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
  ],
  testTimeout: 90000, // Increased timeout for API calls (90 seconds)
  verbose: true,      // Detailed output
  bail: false,        // Don't stop after first test failure
  maxWorkers: 4,      // Limit concurrent tests to avoid API rate limits
  forceExit: true,    // Force exit after tests complete
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts']
};