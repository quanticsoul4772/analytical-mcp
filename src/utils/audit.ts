/**
 * Per-call audit logging.
 *
 * Emits one structured record per tool invocation to stderr (via `Logger.audit`)
 * so an operator can reconstruct what a tool call did — a forensics signal for
 * upstream manipulation. The record carries only a byte size and a hash of the
 * arguments, never the raw argument values, so no untrusted/large content or
 * secrets reach the logs. Gated by `config.ENABLE_AUDIT_LOG`.
 */

import { createHash } from 'crypto';
import { Logger } from './logger.js';
import { config } from './config.js';

/**
 * Record a single tool call. Never throws — auditing must not break a call.
 */
export function auditToolCall(p: {
  tool: string;
  args: unknown;
  durationMs: number;
  ok: boolean;
  error?: unknown;
  exaCalls?: number;
}): void {
  try {
    if (config.ENABLE_AUDIT_LOG !== 'true') return;

    let argBytes = 0;
    let argHash = '';
    try {
      const json = JSON.stringify(p.args) ?? '';
      argBytes = Buffer.byteLength(json);
      argHash = createHash('sha256').update(json).digest('hex').slice(0, 12);
    } catch {
      // non-serializable args (e.g. circular reference) — record with defaults
    }

    const record = {
      event: 'tool_call',
      tool: p.tool,
      ok: p.ok,
      durationMs: p.durationMs,
      argBytes,
      argHash,
      exaCalls: p.exaCalls ?? 0,
      ...(p.ok ? {} : { error: p.error instanceof Error ? p.error.message : String(p.error) }),
    };

    Logger.audit(JSON.stringify(record));
  } catch {
    // auditing must never break a tool call
  }
}
