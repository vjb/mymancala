import { describe, it, expect, vi } from 'vitest';
import { SearchClient } from './searchClient';
import { kalahRuleSet } from '../rules';
import { AnalysisResult, WorkerInMessage, WorkerOutMessage } from './protocol';

describe('Adversarial Stress Suite: SearchClient Concurrent Query & Cancellation', () => {
  it('handles 10 rapid concurrent queries with cancellations without unhandled rejections or corruption', async () => {
    const client = new SearchClient();
    const state = kalahRuleSet.initial();

    const promises: Promise<AnalysisResult>[] = [];
    const ids: number[] = [];

    // Launch 10 rapid queries concurrently
    for (let i = 0; i < 10; i++) {
      const p = client.analyze({
        rules: 'kalah',
        state,
        depth: 2
      }, { autoCancel: false });
      promises.push(p);
      ids.push(client.getCurrentRequestId());
    }

    expect(ids.length).toBe(10);
    // Request IDs must be strictly increasing
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBe(ids[i - 1] + 1);
    }

    // Adversarially cancel queries 0 through 8 (first 9 queries)
    for (let i = 0; i < 9; i++) {
      client.cancel(ids[i]);
    }

    // Query 9 (the 10th query) was not cancelled and MUST resolve cleanly
    const result10 = await promises[9];
    expect(result10).toBeDefined();
    expect(result10.id).toBe(ids[9]);
    expect(result10.evaluatedMoves.length).toBe(6);
    expect(result10.depth).toBe(2);

    client.terminate();
  });

  it('stress tests rapid storm of 25 concurrent queries and interleaves random cancellations', async () => {
    const client = new SearchClient();
    const state = kalahRuleSet.initial();

    const activePromises: { id: number; promise: Promise<AnalysisResult> }[] = [];

    for (let i = 0; i < 25; i++) {
      const promise = client.analyze({
        rules: 'kalah',
        state,
        depth: 1
      }, { autoCancel: false });
      const id = client.getCurrentRequestId();

      // Cancel every even request
      if (i % 2 === 0) {
        client.cancel(id);
      } else {
        activePromises.push({ id, promise });
      }
    }

    // Await all uncanceled promises
    const resolvedResults = await Promise.all(activePromises.map(item => item.promise));

    expect(resolvedResults.length).toBe(activePromises.length);
    for (let i = 0; i < resolvedResults.length; i++) {
      expect(resolvedResults[i].id).toBe(activePromises[i].id);
      expect(resolvedResults[i].evaluatedMoves.length).toBe(6);
    }

    client.terminate();
  });

  it('stress tests simulated Web Worker event stream with delayed and out-of-order cancellations', async () => {
    // Construct a simulated Worker environment to test protocol state machine directly
    let messageHandler: ((event: MessageEvent<WorkerInMessage>) => void) | null = null;
    let clientHandler: ((event: MessageEvent<WorkerOutMessage>) => void) | null = null;

    const mockWorker = {
      postMessage: vi.fn((msg: WorkerInMessage) => {
        // Asynchronously process in mock worker
        setTimeout(() => {
          if (!clientHandler) return;

          if (msg.type === 'CANCEL') {
            clientHandler({
              data: { type: 'CANCELLED', payload: { id: msg.payload.id } }
            } as MessageEvent<WorkerOutMessage>);
          } else if (msg.type === 'ANALYZE') {
            clientHandler({
              data: {
                type: 'ANALYSIS_RESULT',
                payload: {
                  id: msg.payload.id,
                  score: 1.5,
                  winProb: 0.55,
                  pv: [1],
                  evaluatedMoves: [],
                  depth: msg.payload.depth
                }
              }
            } as MessageEvent<WorkerOutMessage>);
          }
        }, 5);
      }),
      terminate: vi.fn(),
      set onmessage(fn: (event: MessageEvent<WorkerOutMessage>) => void) {
        clientHandler = fn;
      },
      set onerror(_fn: any) {}
    };

    // Inject mock Worker into global scope for this test
    const originalWorker = globalThis.Worker;
    (globalThis as any).Worker = vi.fn().mockImplementation(() => mockWorker);

    try {
      const client = new SearchClient();
      const state = kalahRuleSet.initial();

      // Issue 10 concurrent queries
      const promises: Promise<AnalysisResult>[] = [];
      const ids: number[] = [];

      for (let i = 0; i < 10; i++) {
        promises.push(client.analyze({ rules: 'kalah', state, depth: 3 }, { autoCancel: false }));
        ids.push(client.getCurrentRequestId());
      }

      // Immediately cancel 5 of them
      for (let i = 0; i < 5; i++) {
        client.cancel(ids[i]);
      }

      // Remaining 5 should resolve successfully
      const remainingResults = await Promise.all(promises.slice(5));
      expect(remainingResults.length).toBe(5);
      for (let i = 0; i < 5; i++) {
        expect(remainingResults[i].id).toBe(ids[5 + i]);
      }

      client.terminate();
      expect(mockWorker.terminate).toHaveBeenCalled();
    } finally {
      globalThis.Worker = originalWorker;
    }
  });

  it('verifies worker error recovery and rejection propagation to pending callers', async () => {
    let clientErrorHandler: ((e: ErrorEvent) => void) | null = null;

    const mockWorker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      set onmessage(_fn: any) {},
      set onerror(fn: (e: ErrorEvent) => void) {
        clientErrorHandler = fn;
      }
    };

    const originalWorker = globalThis.Worker;
    (globalThis as any).Worker = vi.fn().mockImplementation(() => mockWorker);

    try {
      const client = new SearchClient();
      const state = kalahRuleSet.initial();

      const p = client.analyze({ rules: 'kalah', state, depth: 2 });

      // Trigger simulated worker crash
      clientErrorHandler?.({ message: 'OOM simulated' } as ErrorEvent);

      await expect(p).rejects.toThrow('Worker error: OOM simulated');

      client.terminate();
    } finally {
      globalThis.Worker = originalWorker;
    }
  });
});
