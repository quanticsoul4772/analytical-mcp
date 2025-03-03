/**
 * Mock implementation for MCP SDK
 */

export class ServerMock {
  info: any;
  options: any;
  registeredTools: any[];

  constructor(info: any, options: any) {
    this.info = info;
    this.options = options;
    this.registeredTools = [];
  }

  registerTool(toolDefinition: any) {
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
  
  attach(server: any) {
    return this;
  }
}

export const StdioServerTransport = StdioServerTransportMock;
