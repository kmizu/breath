import { describe, it, expect } from 'vitest';
import { applySafetyLayers } from './safety';
import type { CheckinData, PersonalizationHints } from '@/lib/types';

const baseCheckin: CheckinData = {
  mood: 3,
  tension: 2,
  selfCritical: false,
  intent: 'checkin',
};

const noHints: PersonalizationHints = {
  recentPatterns: [],
  preferredMode: null,
  avoidMode: null,
  avgTension: 2,
  sessionCount: 0,
  lastRiskLevel: null,
  notes: [],
};

// ── Layer 3: Crisis ───────────────────────────────────────────────────────────

describe('applySafetyLayers — Layer 3: Crisis', () => {
  it('returns crisis action for crisis risk level', () => {
    const result = applySafetyLayers('crisis', [], baseCheckin, noHints);
    expect(result.action).toBe('crisis');
    expect(result.recommendedMode).toBe('abort');
    expect(result.guidanceDuration).toBe(30);
  });
});

// ── Layer 2: Distress ─────────────────────────────────────────────────────────

describe('applySafetyLayers — Layer 2: Distress', () => {
  it('returns stop for high risk level', () => {
    const result = applySafetyLayers('high', [], baseCheckin, noHints);
    expect(result.action).toBe('stop');
    expect(result.guidanceDuration).toBe(30);
  });

  it('returns stop for compulsive_continuation pattern', () => {
    const result = applySafetyLayers('moderate', ['compulsive_continuation'], baseCheckin, noHints);
    expect(result.action).toBe('stop');
  });

  it('returns switch to external for escalating_frustration', () => {
    const result = applySafetyLayers('moderate', ['escalating_frustration'], baseCheckin, noHints);
    expect(result.action).toBe('switch');
    expect(result.recommendedMode).toBe('external');
    expect(result.guidanceDuration).toBe(30);
  });
});

// ── Layer 1: Subtle ───────────────────────────────────────────────────────────

describe('applySafetyLayers — Layer 1: Subtle (moderate risk)', () => {
  it('returns switch for overmonitoring', () => {
    const result = applySafetyLayers('moderate', ['overmonitoring'], baseCheckin, noHints);
    expect(result.action).toBe('switch');
    expect(result.guidanceDuration).toBe(60);
  });

  it('returns switch for forced_acceptance', () => {
    const result = applySafetyLayers('moderate', ['forced_acceptance'], baseCheckin, noHints);
    expect(result.action).toBe('switch');
  });

  it('returns shorten for perfectionism', () => {
    const result = applySafetyLayers('moderate', ['perfectionism'], baseCheckin, noHints);
    expect(result.action).toBe('shorten');
    expect(result.guidanceDuration).toBe(60);
  });

  it('returns shorten for performance_framing', () => {
    const result = applySafetyLayers('moderate', ['performance_framing'], baseCheckin, noHints);
    expect(result.action).toBe('shorten');
  });

  it('returns shorten for self_scoring', () => {
    const result = applySafetyLayers('moderate', ['self_scoring'], baseCheckin, noHints);
    expect(result.action).toBe('shorten');
  });

  it('returns switch for breath_tension, avoids breath mode', () => {
    const result = applySafetyLayers('moderate', ['breath_tension'], baseCheckin, noHints);
    expect(result.action).toBe('switch');
    expect(result.recommendedMode).not.toBe('breath');
  });

  it('returns soften for should_language', () => {
    const result = applySafetyLayers('moderate', ['should_language'], baseCheckin, noHints);
    expect(result.action).toBe('soften');
  });
});

// ── Low / None risk ───────────────────────────────────────────────────────────

describe('applySafetyLayers — low/none risk', () => {
  it('returns proceed for low risk', () => {
    const result = applySafetyLayers('low', [], baseCheckin, noHints);
    expect(result.action).toBe('proceed');
  });

  it('returns proceed for no risk', () => {
    const result = applySafetyLayers('none', [], baseCheckin, noHints);
    expect(result.action).toBe('proceed');
  });

  it('maps intent=calming to 180s duration', () => {
    const calming: CheckinData = { ...baseCheckin, intent: 'calming' };
    const result = applySafetyLayers('none', [], calming, noHints);
    expect(result.guidanceDuration).toBe(180);
  });

  it('maps intent=grounding to 60s duration', () => {
    const grounding: CheckinData = { ...baseCheckin, intent: 'grounding' };
    const result = applySafetyLayers('none', [], grounding, noHints);
    expect(result.guidanceDuration).toBe(60);
  });

  it('maps intent=checkin to 30s duration', () => {
    const checkin: CheckinData = { ...baseCheckin, intent: 'checkin' };
    const result = applySafetyLayers('none', [], checkin, noHints);
    expect(result.guidanceDuration).toBe(30);
  });

  it('respects preferredMode hint when no patterns conflict', () => {
    const hints: PersonalizationHints = { ...noHints, preferredMode: 'sound' };
    const result = applySafetyLayers('low', [], baseCheckin, hints);
    expect(result.recommendedMode).toBe('sound');
  });

  it('avoids breath mode when breath_tension detected', () => {
    const result = applySafetyLayers('low', ['breath_tension'], baseCheckin, noHints);
    expect(result.recommendedMode).not.toBe('breath');
  });
});
