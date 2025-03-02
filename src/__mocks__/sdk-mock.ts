/**
 * Mock implementation for MCP SDK
 */

export class ServerMock {
  constructor(info, options) {
    this.info = info;
    this.options = options;
    this.registeredTools = [];
  }

  registerTool(toolDefinition) {
    this.registeredTools.push(toolDefinition);
    return this;
  }

  start() {
    return Promise.resolve(this);
  }

  stop() {
    return Promise.resolve();
  }
}

export const Server = ServerMock;

export class StdioServerTransportMock {
  constructor() {}
  
  attach(server) {
    return this;
  }
}

export const StdioServerTransport = StdioServerTransportMock;