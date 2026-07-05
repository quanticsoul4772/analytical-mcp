/**
 * Per-invocation request context.
 *
 * An AsyncLocalStorage store opened by the tool wrapper for each tool call and
 * propagated across all awaited async work (through the concurrency pool, the
 * rate limiter, and providers). Used to attribute outbound Exa requests to the
 * invocation that caused them, for the per-call audit record.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
  outboundExaCalls: number;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Increment the outbound-Exa-call count for the current invocation.
 * No-op when called outside a request context.
 */
export function noteOutboundExaCall(): void {
  const store = requestContext.getStore();
  if (store) {
    store.outboundExaCalls += 1;
  }
}
