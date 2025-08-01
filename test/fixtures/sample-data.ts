export const sampleDatasets = {
  simple: {
    data: [
      { x: 1, y: 2, category: 'A' },
      { x: 2, y: 4, category: 'A' },
      { x: 3, y: 6, category: 'B' },
      { x: 4, y: 8, category: 'B' },
    ],
    expected: {
      correlation: 1.0,
      mean: { x: 2.5, y: 5 },
      categories: ['A', 'B'],
    },
  },
  
  complex: {
    data: [
      { id: 1, value: 10.5, timestamp: '2024-01-01', metadata: { source: 'api' } },
      { id: 2, value: 15.2, timestamp: '2024-01-02', metadata: { source: 'manual' } },
      { id: 3, value: 8.7, timestamp: '2024-01-03', metadata: { source: 'api' } },
      { id: 4, value: 12.1, timestamp: '2024-01-04', metadata: { source: 'api' } },
    ],
    expected: {
      average: 11.625,
      apiSourceCount: 3,
      manualSourceCount: 1,
    },
  },

  regression: {
    linear: {
      x: [1, 2, 3, 4, 5],
      y: [2, 4, 6, 8, 10],
      expected: { slope: 2, intercept: 0, r2: 1.0 },
    },
    polynomial: {
      x: [1, 2, 3, 4, 5],
      y: [1, 4, 9, 16, 25],
      expected: { degree: 2, r2: 1.0 },
    },
  },
};

export const sampleTexts = {
  simpleAnalysis: "This is a simple text for testing analysis capabilities.",
  complexAnalysis: `
    The market analysis reveals significant trends in consumer behavior. 
    First, there's a 25% increase in online purchases. 
    Second, mobile commerce has grown by 40% year-over-year.
    Finally, customer satisfaction scores have improved to 4.2/5.0.
  `,
  logicalFallacies: `
    Everyone uses this product, so it must be good. 
    If we don't act now, everything will be ruined.
    The CEO is successful in business, so he must be right about climate change.
  `,
  factExtraction: `
    Apple Inc. reported revenue of $394.3 billion in fiscal year 2022.
    The company was founded in 1976 by Steve Jobs, Steve Wozniak, and Ronald Wayne.
    As of 2023, Apple employs approximately 164,000 people worldwide.
  `,
};

export const sampleCommands = {
  basic: {
    command: 'echo "Hello World"',
    expectedOutput: 'Hello World\n',
    expectedExitCode: 0,
  },
  withArgs: {
    command: 'node',
    args: ['-e', 'console.log("Node.js test")'],
    expectedOutput: 'Node.js test\n',
    expectedExitCode: 0,
  },
  error: {
    command: 'invalid-command-that-does-not-exist',
    expectedExitCode: 127,
    expectError: true,
  },
};