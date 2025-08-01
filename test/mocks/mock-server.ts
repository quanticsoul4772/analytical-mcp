import { jest } from '@jest/globals';

export class MockMcpServer {
  private tools = new Map();
  private handlers = new Map();

  constructor(private info: any, private capabilities: any) {}

  setRequestHandler = jest.fn((schema: any, handler: any) => {
    this.handlers.set(schema.method, handler);
    return this;
  });

  addTool = jest.fn((tool: any) => {
    this.tools.set(tool.name, tool);
    return this;
  });

  connect = jest.fn();
  close = jest.fn();
  
  // Mock methods for testing
  getTool(name: string) {
    return this.tools.get(name);
  }

  getHandler(method: string) {
    return this.handlers.get(method);
  }

  simulateToolCall(name: string, args: any) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    return tool.handler(args);
  }
}

export class MockStdioServerTransport {
  start = jest.fn();
  close = jest.fn();
}

export const mockMcpServer = () => ({
  McpServer: jest.fn().mockImplementation((info, capabilities) => 
    new MockMcpServer(info, capabilities)
  ),
  StdioServerTransport: jest.fn().mockImplementation(() => 
    new MockStdioServerTransport()
  ),
});