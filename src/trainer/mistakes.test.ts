import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  recordMistake,
  loadMistakes,
  answerDrill,
  getDueDrills,
  clearMistakes,
  MAX_MISTAKES,
  BOX_INTERVALS_MS,
  STORAGE_KEY_MISTAKES,
} from './mistakes';

describe('Mistake Log Persistence & Leitner Scheduling', () => {
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, String(v)); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      length: 0,
      key: () => null,
    } as any;
  });

  afterEach(() => {
    globalThis.localStorage = originalLocalStorage;
  });

  it('records a new mistake and sets up Box 1 immediately', () => {
    const now = 1_000_000;
    const rec = recordMistake({
      rulesId: 'kalah',
      position: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
      turn: 0,
      played: 0,
      best: 2,
      loss: 2.5,
      grade: 'mistake',
      explanationCode: 'EXTRA_TURN_MISSED',
      now,
    });

    expect(rec.box).toBe(1);
    expect(rec.nextReviewAt).toBe(now);
    expect(rec.solved).toBe(0);
    expect(rec.grade).toBe('mistake');

    const loaded = loadMistakes();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe(rec.id);
  });

  it('deduplicates existing mistake from identical position and played pit', () => {
    const now1 = 1_000_000;
    const rec1 = recordMistake({
      rulesId: 'kalah',
      position: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
      turn: 0,
      played: 0,
      best: 2,
      loss: 2.0,
      grade: 'inaccuracy',
      now: now1,
    });

    // Advance Leitner box
    answerDrill(rec1.id, true, now1 + 5000);

    const now2 = 2_000_000;
    const rec2 = recordMistake({
      rulesId: 'kalah',
      position: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
      turn: 0,
      played: 0,
      best: 2,
      loss: 3.5,
      grade: 'mistake',
      now: now2,
    });

    // Should retain same ID, update loss/grade, and reset to Box 1
    expect(rec2.id).toBe(rec1.id);
    expect(rec2.loss).toBe(3.5);
    expect(rec2.grade).toBe('mistake');
    expect(rec2.box).toBe(1);

    const list = loadMistakes();
    expect(list.length).toBe(1);
  });

  it('strictly caps mistakes at 200 items, keeping newest', () => {
    for (let i = 0; i < 220; i++) {
      recordMistake({
        rulesId: 'kalah',
        position: [i, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        turn: 0,
        played: 0,
        best: 1,
        loss: 1.5,
        grade: 'inaccuracy',
        now: 1000 + i,
      });
    }

    const list = loadMistakes();
    expect(list.length).toBe(MAX_MISTAKES);
    // Newest record should be at the front
    expect(list[0].position[0]).toBe(219);
    // Oldest surviving should be 20
    expect(list[list.length - 1].position[0]).toBe(20);
  });

  it('progresses Leitner boxes on correct answers and resets on failure', () => {
    const t0 = 10_000_000;
    const rec = recordMistake({
      rulesId: 'kalah',
      position: [1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0],
      turn: 0,
      played: 1,
      best: 3,
      loss: 2.0,
      grade: 'inaccuracy',
      now: t0,
    });

    expect(rec.box).toBe(1);

    // Correct #1: Box 1 -> Box 2 (review in 3 days)
    const ans1 = answerDrill(rec.id, true, t0);
    expect(ans1?.box).toBe(2);
    expect(ans1?.solved).toBe(1);
    expect(ans1?.nextReviewAt).toBe(t0 + BOX_INTERVALS_MS[2]);

    // Correct #2: Box 2 -> Box 3 (review in 7 days)
    const ans2 = answerDrill(rec.id, true, t0 + 100);
    expect(ans2?.box).toBe(3);
    expect(ans2?.solved).toBe(2);
    expect(ans2?.nextReviewAt).toBe(t0 + 100 + BOX_INTERVALS_MS[3]);

    // Correct #3: Box 3 stays in Box 3
    const ans3 = answerDrill(rec.id, true, t0 + 200);
    expect(ans3?.box).toBe(3);
    expect(ans3?.solved).toBe(3);

    // Failure: Demoted back to Box 1 (review in 1 day)
    const ans4 = answerDrill(rec.id, false, t0 + 300);
    expect(ans4?.box).toBe(1);
    expect(ans4?.solved).toBe(3); // solved count preserved
    expect(ans4?.nextReviewAt).toBe(t0 + 300 + BOX_INTERVALS_MS[1]);
  });

  it('correctly filters due drills and falls back to sorted queue', () => {
    const t = 50_000_000;
    const m1 = recordMistake({
      rulesId: 'kalah',
      position: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      played: 0,
      best: 1,
      loss: 2.0,
      grade: 'inaccuracy',
      now: t,
    });

    const m2 = recordMistake({
      rulesId: 'kalah',
      position: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      played: 0,
      best: 1,
      loss: 2.0,
      grade: 'inaccuracy',
      now: t,
    });

    // Mark m1 as solved -> next review is in the future
    answerDrill(m1.id, true, t);

    // At time t: m2 is due (nextReviewAt = t), m1 is not (nextReviewAt = t + 3 days)
    const due = getDueDrills(t);
    expect(due.length).toBe(1);
    expect(due[0].id).toBe(m2.id);

    // If both are answered and none is strictly due:
    answerDrill(m2.id, true, t);
    const fallbackQueue = getDueDrills(t);
    expect(fallbackQueue.length).toBe(2);
  });

  it('handles corrupt localStorage safely', () => {
    localStorage.setItem(STORAGE_KEY_MISTAKES, 'invalid-json');
    expect(loadMistakes()).toEqual([]);
  });
});
