#!/usr/bin/env node
/**
 * Protocol-level smoke test.
 *
 * Starts the built server (build/index.js), speaks real MCP JSON-RPC over
 * stdio, and verifies that the server initializes, lists tools, and executes
 * a tool call. Exits 0 on success, 1 on any failure.
 *
 * Usage: npm run smoke
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = path.join(__dirname, '..', 'build', 'index.js');
const TIMEOUT_MS = 15000;

const server = spawn(process.execPath, [SERVER_PATH], {
  stdio: ['pipe', 'pipe', 'pipe'],
  // The metrics HTTP server would bind a port during the probe; keep the
  // smoke test side-effect free.
  env: { ...process.env, METRICS_ENABLED: 'false' },
});

let stdoutBuffer = '';
let stderrOutput = '';
const pending = new Map();
let nextId = 1;

server.stdout.on('data', (chunk) => {
  stdoutBuffer += chunk.toString();
  let newlineIndex;
  while ((newlineIndex = stdoutBuffer.indexOf('\n')) !== -1) {
    const line = stdoutBuffer.slice(0, newlineIndex).trim();
    stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
    if (!line) continue;

    let message;
    try {
      message = JSON.parse(line);
    } catch {
      fail(`Non-JSON output on stdout (protocol corruption): ${line.slice(0, 200)}`);
      return;
    }
    if (message.id !== undefined && pending.has(message.id)) {
      const { resolve } = pending.get(message.id);
      pending.delete(message.id);
      resolve(message);
    }
  }
});

server.stderr.on('data', (chunk) => {
  stderrOutput += chunk.toString();
});

server.on('exit', (code) => {
  if (pending.size > 0) {
    fail(`Server exited early (code ${code}). Stderr:\n${stderrOutput.slice(-2000)}`);
  }
});

function request(method, params) {
  const id = nextId++;
  const message = { jsonrpc: '2.0', id, method, params };
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    server.stdin.write(JSON.stringify(message) + '\n');
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`Timeout waiting for response to ${method}`));
      }
    }, TIMEOUT_MS);
  });
}

function notify(method, params) {
  server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}

function fail(message) {
  console.error(`SMOKE FAIL: ${message}`);
  server.kill();
  process.exit(1);
}

function pass(message) {
  console.log(`  ok: ${message}`);
}

try {
  // 1. Initialize
  const initResult = await request('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'smoke-test', version: '1.0.0' },
  });
  if (initResult.error) fail(`initialize returned error: ${JSON.stringify(initResult.error)}`);
  if (!initResult.result?.serverInfo?.name) fail('initialize response missing serverInfo');
  pass(`initialize (server: ${initResult.result.serverInfo.name})`);
  notify('notifications/initialized');

  // 2. List tools
  const listResult = await request('tools/list', {});
  if (listResult.error) fail(`tools/list returned error: ${JSON.stringify(listResult.error)}`);
  const tools = listResult.result?.tools ?? [];
  if (tools.length < 12) {
    fail(`Expected at least 12 tools, got ${tools.length}: ${tools.map((t) => t.name).join(', ')}`);
  }
  pass(`tools/list (${tools.length} tools: ${tools.map((t) => t.name).join(', ')})`);

  // 3. Call a tool
  const callResult = await request('tools/call', {
    name: 'analyze_dataset',
    arguments: { data: [2, 4, 4, 4, 5, 5, 7, 9], analysisType: 'stats' },
  });
  if (callResult.error) fail(`tools/call returned error: ${JSON.stringify(callResult.error)}`);
  const content = callResult.result?.content?.[0]?.text ?? '';
  if (callResult.result?.isError) fail(`analyze_dataset returned isError: ${content.slice(0, 300)}`);
  if (!content.includes('Mean: 5.00')) {
    fail(`analyze_dataset result missing expected mean. Got: ${content.slice(0, 300)}`);
  }
  pass('tools/call analyze_dataset (mean of [2,4,4,4,5,5,7,9] = 5.00)');

  // 4. Bad input must produce a clean error, not a crash
  const badCall = await request('tools/call', {
    name: 'analyze_dataset',
    arguments: { data: 'not an array' },
  });
  const badResponseOk = badCall.error || badCall.result?.isError;
  if (!badResponseOk) fail('Invalid input was accepted without error');
  pass('tools/call with invalid input rejected cleanly');

  console.log('SMOKE PASS');
  server.kill();
  process.exit(0);
} catch (error) {
  fail(`${error.message}\nStderr:\n${stderrOutput.slice(-2000)}`);
}
