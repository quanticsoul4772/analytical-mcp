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

function request(method, params, timeoutMs = TIMEOUT_MS) {
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
    }, timeoutMs);
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

  // 3. Exercise every tool over the real protocol.
  //
  // Each case has a `good` input asserting a real computed value or a stable
  // output marker (proves correct output, not just "it ran"), and — for the 10
  // deterministic tools — an `edge` empty-input case asserting a clean error
  // rather than a crash (the class of bug the verify_research empty-array crash
  // belonged to: it passed unit tests and this smoke test while crashing live).
  //
  // The two Exa-backed tools (perspective_shifter, verify_research) are marked
  // `exa`: without EXA_API_KEY (as in CI) their handler throws immediately and
  // the wrapper returns an `isError` — but that is only an acceptable pass when
  // the error is the *unavailability* error (missing key / disabled). Any OTHER
  // isError (e.g. a genuine handler crash like the verify_research mean-of-empty
  // -array bug) MUST fail — otherwise this harness would report a real crash as
  // green, the exact failure it exists to prevent. With a key present the tools
  // run live and must contain their marker. They get a longer request timeout
  // because a present key fires live searches.
  //
  // Matches the APIError('ERR_1002', ...) messages thrown at
  // src/utils/exa_research.ts:106,135 (formatted by the wrapper as "Error: ...").
  const EXA_UNAVAILABLE = /Missing API key|Research integration is disabled/i;
  const CASES = [
    {
      name: 'analyze_dataset',
      good: { args: { data: [2, 4, 4, 4, 5, 5, 7, 9], analysisType: 'stats' }, expect: 'Mean: 5.00' },
      edge: { args: { data: [] } },
    },
    {
      name: 'decision_analysis',
      good: {
        args: { options: ['A', 'B'], criteria: ['cost', 'speed'], scores: [[9, 9], [2, 2]] },
        expect: 'ranks first',
      },
      edge: { args: { options: [], criteria: [], scores: [] } },
    },
    {
      name: 'advanced_regression_analysis',
      good: {
        args: {
          data: [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }, { x: 4, y: 8 }],
          regressionType: 'linear',
          independentVariables: ['x'],
          dependentVariable: 'y',
        },
        expect: 'Dependent Variable: y',
      },
      edge: {
        args: { data: [], regressionType: 'linear', independentVariables: ['x'], dependentVariable: 'y' },
      },
    },
    {
      name: 'hypothesis_testing',
      good: {
        args: {
          testType: 't_test_independent',
          data: [[5.1, 4.9, 5.3, 5.2, 4.8], [4.2, 4.0, 4.4, 4.1, 4.3]],
        },
        expect: '# Hypothesis Testing Report',
      },
      edge: { args: { testType: 't_test_independent', data: [] } },
    },
    {
      name: 'data_visualization_generator',
      good: {
        args: {
          data: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
          visualizationType: 'scatter',
          variables: ['x', 'y'],
        },
        expect: '**Data Points:** 2',
      },
      edge: { args: { data: [], visualizationType: 'scatter', variables: ['x', 'y'] } },
    },
    {
      name: 'logical_argument_analyzer',
      good: {
        args: { argument: 'All men are mortal. Socrates is a man. Therefore, Socrates is mortal.' },
        expect: '## Logical Argument Analysis',
      },
      edge: { args: { argument: '' } },
    },
    {
      name: 'logical_fallacy_detector',
      good: {
        args: { text: "You can't trust her policy because she's just a young activist." },
        expect: 'Ad Hominem',
      },
      edge: { args: { text: '' } },
    },
    {
      name: 'advanced_statistical_analysis',
      good: {
        args: { data: [{ a: 1, b: 2 }, { a: 3, b: 4 }, { a: 5, b: 6 }], analysisType: 'descriptive' },
        expect: '- **Mean**: 3.00',
      },
      edge: { args: { data: [], analysisType: 'descriptive' } },
    },
    {
      name: 'advanced_data_preprocessing',
      good: {
        args: { data: [1, 2, 3, 4, 5], preprocessingType: 'normalization' },
        expect: 'Maximum Value: 5',
      },
      edge: { args: { data: [], preprocessingType: 'normalization' } },
    },
    {
      name: 'ml_model_evaluation',
      good: {
        args: { modelType: 'regression', actualValues: [3, 5, 7], predictedValues: [2.5, 5, 7.5] },
        expect: '- **MSE**: 0.1667',
      },
      edge: { args: { modelType: 'regression', actualValues: [], predictedValues: [] } },
    },
    {
      name: 'perspective_shifter',
      exa: true,
      good: { args: { problem: 'Our app retention is dropping.' }, expect: '# Perspective Shifting Analysis' },
    },
    {
      name: 'verify_research',
      exa: true,
      good: { args: { query: 'Is the Earth round?' }, expect: '"confidence"' },
    },
  ];

  // Coverage: every registered tool must have a case, and vice-versa. A rename
  // or newly-added tool that escapes CASES is a hard failure, not silent.
  const listed = new Set(tools.map((t) => t.name));
  const cased = new Set(CASES.map((c) => c.name));
  const missing = [...listed].filter((n) => !cased.has(n));
  const extra = [...cased].filter((n) => !listed.has(n));
  if (missing.length || extra.length) {
    fail(`CASES out of sync with registered tools. Missing cases: [${missing}] Unknown cases: [${extra}]`);
  }

  async function runGood(c) {
    const res = await request(
      'tools/call',
      { name: c.name, arguments: c.good.args },
      c.exa ? 60000 : undefined // longer timeout for live Exa calls
    );
    if (res.error) fail(`${c.name} good: JSON-RPC error ${JSON.stringify(res.error)}`);
    const text = res.result?.content?.[0]?.text ?? '';
    if (res.result?.isError) {
      if (c.exa && EXA_UNAVAILABLE.test(text)) {
        pass(`${c.name} good (Exa unavailable — clean isError)`);
        return;
      }
      fail(`${c.name} good returned isError: ${text.slice(0, 300)}`);
    }
    if (c.good.expect && !text.includes(c.good.expect)) {
      fail(`${c.name} good missing "${c.good.expect}". Got: ${text.slice(0, 300)}`);
    }
    pass(`${c.name} good${c.good.expect ? ` (${c.good.expect})` : ''}`);
  }

  async function runEdge(c) {
    if (!c.edge) return;
    const res = await request('tools/call', { name: c.name, arguments: c.edge.args });
    if (!(res.error || res.result?.isError)) {
      fail(`${c.name} edge: empty input accepted without error`);
    }
    pass(`${c.name} edge (clean error)`);
  }

  for (const c of CASES) {
    await runGood(c);
    await runEdge(c);
  }

  console.log('SMOKE PASS');
  server.kill();
  process.exit(0);
} catch (error) {
  fail(`${error.message}\nStderr:\n${stderrOutput.slice(-2000)}`);
}
