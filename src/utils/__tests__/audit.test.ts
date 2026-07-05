import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { auditToolCall } from '../audit.js';
import { config } from '../config.js';

// Return the parsed JSON payload of the single emitted AUDIT line, or null.
function capturedAudit(spy: jest.SpiedFunction<typeof console.error>): Record<string, unknown> | null {
  const line = spy.mock.calls.map((c) => String(c[0])).find((s) => s.includes('AUDIT'));
  if (!line) return null;
  return JSON.parse(line.slice(line.indexOf('{')));
}

describe('auditToolCall', () => {
  let spy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('emits a structured record on a successful call', () => {
    auditToolCall({ tool: 'analyze_dataset', args: { data: [1, 2, 3] }, durationMs: 4, ok: true });

    const rec = capturedAudit(spy);
    expect(rec).not.toBeNull();
    expect(rec).toMatchObject({ event: 'tool_call', tool: 'analyze_dataset', ok: true, durationMs: 4 });
    expect(rec!.argBytes).toBeGreaterThan(0);
    expect(String(rec!.argHash)).toHaveLength(12);
    expect(rec).not.toHaveProperty('error');
  });

  it('records the outbound Exa call count', () => {
    auditToolCall({ tool: 'verify_research', args: { query: 'x' }, durationMs: 9, ok: true, exaCalls: 3 });
    expect(capturedAudit(spy)).toMatchObject({ exaCalls: 3 });
  });

  it('defaults exaCalls to 0 when omitted', () => {
    auditToolCall({ tool: 'analyze_dataset', args: { data: [1] }, durationMs: 1, ok: true });
    expect(capturedAudit(spy)).toMatchObject({ exaCalls: 0 });
  });

  it('includes the error message on a failed call', () => {
    auditToolCall({
      tool: 'verify_research',
      args: { query: 'x' },
      durationMs: 2,
      ok: false,
      error: new Error('boom'),
    });

    const rec = capturedAudit(spy);
    expect(rec).toMatchObject({ ok: false, error: 'boom' });
  });

  it('is deterministic: same args hash the same, different args differ', () => {
    auditToolCall({ tool: 't', args: { a: 1 }, durationMs: 1, ok: true });
    const first = capturedAudit(spy)!.argHash;
    spy.mockClear();

    auditToolCall({ tool: 't', args: { a: 1 }, durationMs: 1, ok: true });
    const same = capturedAudit(spy)!.argHash;
    spy.mockClear();

    auditToolCall({ tool: 't', args: { a: 2 }, durationMs: 1, ok: true });
    const different = capturedAudit(spy)!.argHash;

    expect(same).toBe(first);
    expect(different).not.toBe(first);
  });

  it('emits nothing when disabled', () => {
    const original = config.ENABLE_AUDIT_LOG;
    config.ENABLE_AUDIT_LOG = 'false';
    try {
      auditToolCall({ tool: 't', args: { a: 1 }, durationMs: 1, ok: true });
      expect(capturedAudit(spy)).toBeNull();
    } finally {
      config.ENABLE_AUDIT_LOG = original;
    }
  });

  it('does not throw on non-serializable args and records argBytes 0', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() =>
      auditToolCall({ tool: 't', args: circular, durationMs: 1, ok: true })
    ).not.toThrow();

    const rec = capturedAudit(spy);
    expect(rec).toMatchObject({ ok: true, argBytes: 0, argHash: '' });
  });
});
