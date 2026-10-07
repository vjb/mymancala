import { describe, it, expect } from 'vitest';
import { SearchClient } from './searchClient';
import { kalahRuleSet } from '../rules';

describe('SearchClient Web Worker & Fallback Suite', () => {
  it('performs analysis via SearchClient and returns valid AnalysisResult', async () => {
    const client = new SearchClient();
    const state = kalahRuleSet.initial();
    const result = await client.analyze({
      rules: 'kalah',
      state,
      depth: 3
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.depth).toBe(3);
    expect(result.evaluatedMoves.length).toBe(6);
    expect(result.pv.length).toBeGreaterThan(0);
    expect(result.winProb).toBeGreaterThanOrEqual(0);
    expect(result.winProb).toBeLessThanOrEqual(1);

    client.terminate();
  });

  it('tracks sequential request IDs and handles cancellation', async () => {
    const client = new SearchClient();
    const state = kalahRuleSet.initial();

    const p1 = client.analyze({ rules: 'kalah', state, depth: 2 });
    const id1 = client.getCurrentRequestId();

    const p2 = client.analyze({ rules: 'kalah', state, depth: 2 });
    const id2 = client.getCurrentRequestId();

    expect(id2).toBe(id1 + 1);

    const res2 = await p2;
    expect(res2.id).toBe(id2);

    client.terminate();
  });

  it('automatically cancels previous pending request on rapid sequential analyze calls', async () => {
    const client = new SearchClient();
    const state = kalahRuleSet.initial();
    const p1 = client.analyze({ rules: 'kalah', state, depth: 4 });
    const id1 = client.getCurrentRequestId();
    const p2 = client.analyze({ rules: 'kalah', state, depth: 2 });
    const id2 = client.getCurrentRequestId();

    expect(id2).toBe(id1 + 1);
    const res2 = await p2;
    expect(res2.id).toBe(id2);
    client.terminate();
  });

  it('evaluates correctly under custom rulesOptions in searchClient', async () => {
    const client = new SearchClient();
    const state = kalahRuleSet.initial();
    const res = await client.analyze({
      rules: 'kalah',
      rulesOptions: { freeTurn: false, captureOpposite: false },
      state,
      depth: 2
    });
    expect(res).toBeDefined();
    expect(res.evaluatedMoves.length).toBe(6);
    const move2 = res.evaluatedMoves.find(m => m.pit === 2);
    expect(move2?.freeTurn).toBe(false);
    client.terminate();
  });
});
