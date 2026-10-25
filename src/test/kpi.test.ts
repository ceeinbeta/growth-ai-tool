import { describe, expect, it } from 'vitest';
import { parsePeriod, changeVsPrevious, conversionRate, formatPct, KPI_PERIODS } from '@/lib/kpi';

describe('parsePeriod', () => {
  it('accepts 7, 30 and 90 only', () => {
    expect(parsePeriod(7)).toBe(7);
    expect(parsePeriod('30')).toBe(30);
    expect(parsePeriod(90)).toBe(90);
    expect(KPI_PERIODS).toEqual([7, 30, 90]);
  });
  it('falls back to 30 for anything else', () => {
    expect(parsePeriod(undefined)).toBe(30);
    expect(parsePeriod('14')).toBe(30);
    expect(parsePeriod('abc')).toBe(30);
    expect(parsePeriod(-7)).toBe(30);
  });
});

describe('changeVsPrevious', () => {
  it('labels percentage change vs the previous period', () => {
    expect(changeVsPrevious(150, 100)).toEqual({ kind: 'up', text: '+50% vs the previous period' });
    expect(changeVsPrevious(50, 100)).toEqual({ kind: 'down', text: '-50% vs the previous period' });
    expect(changeVsPrevious(100, 100)).toEqual({ kind: 'flat', text: 'Same as the previous period' });
  });
  it('says not enough data when the previous period was empty', () => {
    const r = changeVsPrevious(10, 0);
    expect(r.kind).toBe('none');
    if (r.kind === 'none') expect(r.reason).toContain('previous period');
  });
  it('says not enough data when both periods are empty', () => {
    const r = changeVsPrevious(0, 0);
    expect(r.kind).toBe('none');
  });
});

describe('conversionRate', () => {
  it('is null with no visitors, never a fake 0%', () => {
    expect(conversionRate(0, 0)).toBeNull();
    expect(conversionRate(3, 100)).toBe(0.03);
  });
});

describe('formatPct', () => {
  it('rounds sensibly', () => {
    expect(formatPct(0.03)).toBe('3%');
    expect(formatPct(0.0345)).toBe('3.5%');
    expect(formatPct(0.156)).toBe('16%');
    expect(formatPct(0.5)).toBe('50%');
  });
});
