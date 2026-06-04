import { parseVersion, compareVersions, gte } from './version';

describe('parseVersion', () => {
  it('extracts the version token from `trustabl version` output', () => {
    expect(parseVersion('Trustabl v0.5.0\ncommit: abc\nbuilt: 2026')).toBe('v0.5.0');
    expect(parseVersion('Trustabl 1.2.3')).toBe('1.2.3');
  });
  it('returns null when absent', () => {
    expect(parseVersion('no version here')).toBeNull();
  });
});

describe('compareVersions / gte', () => {
  it('orders MAJOR.MINOR.PATCH numerically, ignoring a leading v', () => {
    expect(compareVersions('v0.2.0', '0.1.9')).toBeGreaterThan(0);
    expect(compareVersions('0.2.0', 'v0.2.0')).toBe(0);
    expect(compareVersions('0.2.0', '0.10.0')).toBeLessThan(0);
  });
  it('gte is inclusive', () => {
    expect(gte('0.5.0', '0.5.0')).toBe(true);
    expect(gte('0.5.1', '0.5.0')).toBe(true);
    expect(gte('0.4.9', '0.5.0')).toBe(false);
  });
});
