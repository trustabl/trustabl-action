import { parseSeverityThreshold, parseRiskThreshold, parsePositiveInt } from './inputs';

describe('parseSeverityThreshold', () => {
  it('treats empty and none as disabled', () => {
    expect(parseSeverityThreshold('')).toBe('none');
    expect(parseSeverityThreshold('none')).toBe('none');
  });
  it('accepts severity levels case-insensitively', () => {
    expect(parseSeverityThreshold('HIGH')).toBe('high');
    expect(parseSeverityThreshold('  critical ')).toBe('critical');
  });
  it('throws on garbage', () => {
    expect(() => parseSeverityThreshold('severe')).toThrow(/invalid severity-threshold/);
  });
});

describe('parseRiskThreshold', () => {
  it('defaults empty to 0 (disabled)', () => {
    expect(parseRiskThreshold('')).toBe(0);
  });
  it('parses integers in range', () => {
    expect(parseRiskThreshold('70')).toBe(70);
    expect(parseRiskThreshold('0')).toBe(0);
    expect(parseRiskThreshold('100')).toBe(100);
  });
  it('rejects non-integers and out-of-range', () => {
    expect(() => parseRiskThreshold('70.5')).toThrow();
    expect(() => parseRiskThreshold('abc')).toThrow();
    expect(() => parseRiskThreshold('101')).toThrow(/out of range/);
  });
});

describe('parsePositiveInt', () => {
  it('uses the fallback for empty', () => {
    expect(parsePositiveInt('', 10, 'max-annotations')).toBe(10);
  });
  it('parses non-negative integers', () => {
    expect(parsePositiveInt('5', 10, 'max-annotations')).toBe(5);
    expect(parsePositiveInt('0', 10, 'max-annotations')).toBe(0);
  });
  it('throws on garbage', () => {
    expect(() => parsePositiveInt('-3', 10, 'max-annotations')).toThrow();
    expect(() => parsePositiveInt('x', 10, 'max-annotations')).toThrow();
  });
});
