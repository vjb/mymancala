import { describe, it, expect } from 'vitest';
import { CULTURAL_STORIES, getStoryById, getStoriesForVariant } from './index';

describe('Cultural Stories & Verifiable Academic Citations Suite', () => {
  it('contains historical entries for each primary variant', () => {
    expect(CULTURAL_STORIES.length).toBeGreaterThanOrEqual(4);
    const variants = CULTURAL_STORIES.map(s => s.variantId);
    expect(variants).toContain('oware');
    expect(variants).toContain('kalah');
    expect(variants).toContain('congkak');
    expect(variants).toContain('bao');
  });

  it('guarantees every story has verifiable academic citations with author, work, and year', () => {
    for (const story of CULTURAL_STORIES) {
      expect(story.id).toBeDefined();
      expect(story.sources.length).toBeGreaterThanOrEqual(1);

      for (const src of story.sources) {
        expect(src.author).toBeDefined();
        expect(src.author.length).toBeGreaterThan(2);
        expect(src.work).toBeDefined();
        expect(src.work.length).toBeGreaterThan(2);
        expect(src.year).toBeGreaterThan(1800);
        expect(src.year).toBeLessThanOrEqual(2026);
      }
    }
  });

  it('guarantees complete en, es, and ar multilingual coverage', () => {
    for (const story of CULTURAL_STORIES) {
      expect(story.title.en).toBeDefined();
      expect(story.title.es).toBeDefined();
      expect(story.title.ar).toBeDefined();

      expect(story.body.en.length).toBeGreaterThanOrEqual(1);
      expect(story.body.es.length).toBeGreaterThanOrEqual(1);
      expect(story.body.ar.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('queries stories by id and variant successfully', () => {
    const oware = getStoryById('oware_akan');
    expect(oware).toBeDefined();
    expect(oware?.region).toContain('Akan');

    const congkakStories = getStoriesForVariant('congkak');
    expect(congkakStories.length).toBe(1);
    expect(congkakStories[0].id).toBe('congkak_malay');
  });
});
