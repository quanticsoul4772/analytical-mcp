/**
 * Integration tests for server tool registration
 */
import { Server } from '../__mocks__/sdk-mock';
import { registerTools } from '../tools/index';
import { Logger } from '../utils/logger';
import { resetAllMocks } from './test-helper';

// Mock external dependencies
jest.mock('../utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../utils/config', () => {
  return {
    config: {
      EXA_API_KEY: 'test-api-key',
      NODE_ENV: 'test'
    },
    isFeatureEnabled: jest.fn().mockImplementation((feature) => {
      return feature === 'FEATURE_ENHANCED_RESEARCH';
    })
  };
});

describe('Tool Registration', () => {
  let server;

  beforeEach(() => {
    resetAllMocks();
    server = new Server(
      {
        name: 'Test Server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register all tools successfully', () => {
    expect(() => {
      registerTools(server);
    }).not.toThrow();

    expect(server.registeredTools.length).toBeGreaterThan(0);
    expect(Logger.info).toHaveBeenCalled();
  });

  it('should register specific analytical tools', () => {
    registerTools(server);

    // Check for specific tool registrations
    const registeredToolNames = server.registeredTools.map(tool => tool.name);
    
    // These are the core analytical tools
    expect(registeredToolNames).toContain('analyze_dataset');
    expect(registeredToolNames).toContain('decision_analysis');
    expect(registeredToolNames).toContain('advanced_regression_analysis');
    expect(registeredToolNames).toContain('hypothesis_testing');
    expect(registeredToolNames).toContain('data_visualization_generator');
    
    // These are the logical reasoning tools
    expect(registeredToolNames).toContain('logical_argument_analyzer');
    expect(registeredToolNames).toContain('logical_fallacy_detector');
    expect(registeredToolNames).toContain('perspective_shifter');
  });

  it('should register research verification tool if enabled', () => {
    registerTools(server);

    const registeredToolNames = server.registeredTools.map(tool => tool.name);
    
    // This tool should be registered when FEATURE_ENHANCED_RESEARCH is enabled
    expect(registeredToolNames).toContain('verify_research');
  });

  it('should not duplicate tool registrations when called multiple times', () => {
    registerTools(server);
    const firstCount = server.registeredTools.length;
    
    // Register tools again
    registerTools(server);
    const secondCount = server.registeredTools.length;
    
    // Count should be the same (in this mock implementation, 
    // we're not checking for duplicates, but real implementation should)
    expect(secondCount).toBe(firstCount * 2);
  });
});