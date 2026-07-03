/**
 * Protocol-level server test.
 *
 * Connects a real MCP Client to the real McpServer over an in-memory
 * transport — no mocks, no subprocess, fully offline.
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerTools } from '../tools/index.js';

const EXPECTED_TOOLS = [
  'analyze_dataset',
  'decision_analysis',
  'advanced_regression_analysis',
  'hypothesis_testing',
  'data_visualization_generator',
  'logical_argument_analyzer',
  'logical_fallacy_detector',
  'perspective_shifter',
  'verify_research',
];

describe('MCP server protocol', () => {
  let client: Client;
  let server: McpServer;

  beforeAll(async () => {
    server = new McpServer({ name: 'analytical-mcp-server-test', version: '0.1.0' });
    registerTools(server);

    client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  it('lists all registered tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name);

    for (const expected of EXPECTED_TOOLS) {
      expect(names).toContain(expected);
    }
  });

  it('exposes a description and input schema for every tool', async () => {
    const { tools } = await client.listTools();

    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('executes analyze_dataset and returns correct statistics', async () => {
    const result = await client.callTool({
      name: 'analyze_dataset',
      arguments: { data: [2, 4, 4, 4, 5, 5, 7, 9], analysisType: 'stats' },
    });

    const content = result.content as Array<{ type: string; text: string }>;
    expect(result.isError).toBeFalsy();
    expect(content[0]?.type).toBe('text');
    expect(content[0]?.text).toContain('Mean: 5.00');
  });

  it('executes hypothesis_testing end-to-end', async () => {
    const result = await client.callTool({
      name: 'hypothesis_testing',
      arguments: {
        testType: 't_test_independent',
        data: [
          [5.1, 4.9, 5.3, 5.2, 4.8],
          [4.2, 4.0, 4.4, 4.1, 4.3],
        ],
      },
    });

    const content = result.content as Array<{ type: string; text: string }>;
    expect(result.isError).toBeFalsy();
    expect(content[0]?.text).toBeTruthy();
  });

  it('passes logical_fallacy_detector options through to the tool, not just text', async () => {
    const text = "You can't trust her climate policy because she's just a young activist.";

    const withExplanations = await client.callTool({
      name: 'logical_fallacy_detector',
      arguments: { text, includeExplanations: true, includeExamples: false },
    });
    const withoutExplanations = await client.callTool({
      name: 'logical_fallacy_detector',
      arguments: { text, includeExplanations: false, includeExamples: false },
    });

    const withContent = (withExplanations.content as Array<{ text: string }>)[0]?.text ?? '';
    const withoutContent = (withoutExplanations.content as Array<{ text: string }>)[0]?.text ?? '';

    expect(withExplanations.isError).toBeFalsy();
    expect(withContent).toContain('**Description:**');
    expect(withoutContent).not.toContain('**Description:**');
  });

  it('rejects invalid input without crashing the server', async () => {
    const result = await client.callTool({
      name: 'analyze_dataset',
      arguments: { data: 'not an array' },
    });

    expect(result.isError).toBe(true);

    // Server must still be responsive after the bad call
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(9);
  });
});
