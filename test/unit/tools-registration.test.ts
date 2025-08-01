import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { MockMcpServer } from '../mocks/mock-server.js';

// Mock all the tool modules
jest.mock('../../src/tools/analyze_dataset.js', () => ({
  analyzeDataset: jest.fn(),
  analyzeDatasetSchema: { name: 'analyze_dataset' },
}));

jest.mock('../../src/tools/decision_analysis.js', () => ({
  decisionAnalysis: jest.fn(),
  decisionAnalysisSchema: { name: 'decision_analysis' },
}));

jest.mock('../../src/tools/advanced_regression_analysis.js', () => ({
  advancedRegressionAnalysis: jest.fn(),
  advancedRegressionAnalysisSchema: { name: 'advanced_regression_analysis' },
}));

jest.mock('../../src/tools/hypothesis_testing.js', () => ({
  hypothesisTesting: jest.fn(),
  hypothesisTestingSchema: { name: 'hypothesis_testing' },
}));

jest.mock('../../src/tools/data_visualization_generator.js', () => ({
  dataVisualizationGenerator: jest.fn(),
  dataVisualizationGeneratorSchema: { name: 'data_visualization_generator' },
}));

jest.mock('../../src/tools/logical_argument_analyzer.js', () => ({
  logicalArgumentAnalyzer: jest.fn(),
  logicalArgumentAnalyzerSchema: { name: 'logical_argument_analyzer' },
}));

jest.mock('../../src/tools/logical_fallacy_detector.js', () => ({
  logicalFallacyDetector: jest.fn(),
  logicalFallacyDetectorSchema: { name: 'logical_fallacy_detector' },
}));

jest.mock('../../src/tools/perspective_shifter.js', () => ({
  perspectiveShifter: jest.fn(),
  perspectiveShifterSchema: { name: 'perspective_shifter' },
}));

jest.mock('../../src/tools/research_verification.js', () => ({
  researchVerification: jest.fn(),
}));

jest.mock('../../src/utils/exa_research.js', () => ({
  exaResearch: jest.fn(),
}));

jest.mock('../../src/utils/logger.js', () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Tools Registration', () => {
  let mockServer: MockMcpServer;

  beforeEach(() => {
    jest.clearAllMocks();
    mockServer = new MockMcpServer(
      { name: 'Test Server', version: '0.1.0' },
      { capabilities: { tools: {} } }
    );
  });

  it('should register all available tools', async () => {
    const { registerTools } = await import('../../src/tools/index.js');
    
    registerTools(mockServer);

    // Verify that setRequestHandler was called for tools
    expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'tools/list' }),
      expect.any(Function)
    );

    expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'tools/call' }),
      expect.any(Function)
    );
  });

  it('should handle tools/list request', async () => {
    const { registerTools } = await import('../../src/tools/index.js');
    
    registerTools(mockServer);

    const listHandler = mockServer.getHandler('tools/list');
    expect(listHandler).toBeDefined();

    const result = await listHandler();
    expect(result).toEqual({
      tools: expect.arrayContaining([
        expect.objectContaining({
          name: 'analyze_dataset',
          description: expect.any(String),
        }),
        expect.objectContaining({
          name: 'decision_analysis',
          description: expect.any(String),
        }),
        expect.objectContaining({
          name: 'advanced_regression_analysis',
          description: expect.any(String),
        }),
        // ... other tools
      ]),
    });
  });

  it('should handle tools/call request for analyze_dataset', async () => {
    const { registerTools } = await import('../../src/tools/index.js');
    const { analyzeDataset } = await import('../../src/tools/analyze_dataset.js');
    
    registerTools(mockServer);

    const callHandler = mockServer.getHandler('tools/call');
    expect(callHandler).toBeDefined();

    const mockAnalysisResult = { 
      analysis: 'Test analysis',
      statistics: { mean: 5, median: 4 }
    };
    (analyzeDataset as jest.Mock).mockResolvedValue(mockAnalysisResult);

    const result = await callHandler({
      name: 'analyze_dataset',
      arguments: {
        data: [1, 2, 3, 4, 5],
        analysisType: 'descriptive',
      },
    });

    expect(analyzeDataset).toHaveBeenCalledWith({
      data: [1, 2, 3, 4, 5],
      analysisType: 'descriptive',
    });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockAnalysisResult, null, 2),
        },
      ],
    });
  });

  it('should handle tools/call request for research_verification', async () => {
    const { registerTools } = await import('../../src/tools/index.js');
    const { researchVerification } = await import('../../src/tools/research_verification.js');
    
    registerTools(mockServer);

    const callHandler = mockServer.getHandler('tools/call');
    
    const mockResearchResult = {
      query: 'test query',
      verified: true,
      consistency: 0.8,
      sources: ['source1', 'source2'],
    };
    (researchVerification as jest.Mock).mockResolvedValue(mockResearchResult);

    const result = await callHandler({
      name: 'research_verification',
      arguments: {
        query: 'test query',
        sources: 3,
      },
    });

    expect(researchVerification).toHaveBeenCalledWith({
      query: 'test query',
      sources: 3,
    });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockResearchResult, null, 2),
        },
      ],
    });
  });

  it('should handle invalid tool name', async () => {
    const { registerTools } = await import('../../src/tools/index.js');
    const { Logger } = await import('../../src/utils/logger.js');
    
    registerTools(mockServer);

    const callHandler = mockServer.getHandler('tools/call');

    await expect(
      callHandler({
        name: 'invalid_tool',
        arguments: {},
      })
    ).rejects.toThrow('Tool not found: invalid_tool');

    expect(Logger.error).toHaveBeenCalledWith(
      'Unknown tool requested:',
      'invalid_tool'
    );
  });

  it('should handle tool execution errors', async () => {
    const { registerTools } = await import('../../src/tools/index.js');
    const { analyzeDataset } = await import('../../src/tools/analyze_dataset.js');
    const { Logger } = await import('../../src/utils/logger.js');
    
    registerTools(mockServer);

    const callHandler = mockServer.getHandler('tools/call');
    
    const testError = new Error('Tool execution failed');
    (analyzeDataset as jest.Mock).mockRejectedValue(testError);

    await expect(
      callHandler({
        name: 'analyze_dataset',
        arguments: { data: [] },
      })
    ).rejects.toThrow('Tool execution failed');

    expect(Logger.error).toHaveBeenCalledWith(
      'Error executing tool analyze_dataset:',
      testError
    );
  });

  it('should validate tool arguments', async () => {
    const { registerTools } = await import('../../src/tools/index.js');
    
    registerTools(mockServer);

    const callHandler = mockServer.getHandler('tools/call');

    // Test with missing required arguments
    await expect(
      callHandler({
        name: 'analyze_dataset',
        arguments: {}, // Missing required 'data' field
      })
    ).rejects.toThrow();
  });

  it('should handle research_verification with default parameters', async () => {
    const { registerTools } = await import('../../src/tools/index.js');
    const { researchVerification } = await import('../../src/tools/research_verification.js');
    
    registerTools(mockServer);

    const callHandler = mockServer.getHandler('tools/call');
    
    (researchVerification as jest.Mock).mockResolvedValue({
      query: 'test',
      verified: true,
    });

    await callHandler({
      name: 'research_verification',
      arguments: {
        query: 'test',
        // Should use defaults: minConsistencyThreshold: 0.7, sources: 3
      },
    });

    expect(researchVerification).toHaveBeenCalledWith({
      query: 'test',
      minConsistencyThreshold: 0.7,
      sources: 3,
    });
  });
});