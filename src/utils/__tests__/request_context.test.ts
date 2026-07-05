import { describe, it, expect } from '@jest/globals';
import { requestContext, noteOutboundExaCall } from '../request_context.js';

describe('request context', () => {
  it('noteOutboundExaCall is a no-op outside a context', () => {
    expect(() => noteOutboundExaCall()).not.toThrow();
  });

  it('counts calls within a run scope, including across an awaited async boundary', async () => {
    const ctx = { outboundExaCalls: 0 };
    await requestContext.run(ctx, async () => {
      noteOutboundExaCall();
      // ALS must survive a real async hop.
      await new Promise((resolve) => setTimeout(resolve, 1));
      noteOutboundExaCall();
      await Promise.all([
        (async () => noteOutboundExaCall())(),
        (async () => noteOutboundExaCall())(),
      ]);
    });
    expect(ctx.outboundExaCalls).toBe(4);
  });

  it('isolates counts between separate run scopes', async () => {
    const a = { outboundExaCalls: 0 };
    const b = { outboundExaCalls: 0 };
    await requestContext.run(a, async () => {
      noteOutboundExaCall();
      noteOutboundExaCall();
    });
    await requestContext.run(b, async () => {
      noteOutboundExaCall();
    });
    expect(a.outboundExaCalls).toBe(2);
    expect(b.outboundExaCalls).toBe(1);
  });
});
