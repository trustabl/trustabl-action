import { readiness, risk, maxSeverity, sevRank, severityCounts, projectedReadiness } from './score';
import { Finding } from './types';

const f = (severity: Finding['severity']): Finding => ({
  rule_id: 'X', category: 'c', scope: 'tool', severity, tool_name: 't',
  file_path: 'a.py', line: 1, title: '', explanation: '', suggested_fix: '', confidence: 1,
});

describe('readiness', () => {
  it('scales [0,1] to [0,100], rounding half up', () => {
    expect(readiness(0)).toBe(0);
    expect(readiness(1)).toBe(100);
    expect(readiness(0.646)).toBe(65);
    expect(readiness(0.005)).toBe(1); // 0.5 rounds up
    expect(readiness(0.852)).toBe(85);
  });
  it('clamps out-of-range', () => {
    expect(readiness(-0.5)).toBe(0);
    expect(readiness(1.5)).toBe(100);
  });
});

describe('risk', () => {
  it('is 100 - readiness', () => {
    expect(risk(100)).toBe(0);
    expect(risk(65)).toBe(35);
  });
});

describe('maxSeverity', () => {
  it('returns the highest severity present', () => {
    expect(maxSeverity([f('low'), f('critical'), f('medium')])).toBe('critical');
    expect(maxSeverity([f('low'), f('medium')])).toBe('medium');
  });
  it('returns none for empty', () => {
    expect(maxSeverity([])).toBe('none');
  });
});

describe('sevRank', () => {
  it('matches the v1 bash ordering', () => {
    expect(sevRank('critical')).toBe(4);
    expect(sevRank('high')).toBe(3);
    expect(sevRank('medium')).toBe(2);
    expect(sevRank('low')).toBe(1);
    expect(sevRank('info')).toBe(0);
    expect(sevRank('none')).toBe(-1);
  });
});

describe('severityCounts', () => {
  it('tallies per severity', () => {
    const c = severityCounts([f('critical'), f('critical'), f('low')]);
    expect(c.critical).toBe(2);
    expect(c.low).toBe(1);
    expect(c.high).toBe(0);
  });
});

describe('projectedReadiness', () => {
  it('converts each tier to 0-100', () => {
    const p = projectedReadiness({
      fix_critical: 0.646, fix_high: 0.852, fix_medium: 0.97, fix_low: 1, fix_all: 1,
    });
    expect(p).toEqual({ fixCritical: 65, fixHigh: 85, fixMedium: 97, fixLow: 100, fixAll: 100 });
  });
});
