import * as fs from 'fs';
import * as path from 'path';
import { parseSeverityThreshold, parseRiskThreshold, parsePositiveInt, DEFAULT_VERSION } from './inputs';

describe('DEFAULT_VERSION', () => {
  it('is an exact release tag, not latest', () => {
    expect(DEFAULT_VERSION).toMatch(/^v\d+\.\d+\.\d+$/);
  });
  it('matches the version default in action.yml', () => {
    // The first `default:` after the `version:` input key is that input's default.
    const lines = fs.readFileSync(path.join(__dirname, '..', 'action.yml'), 'utf8').split(/\r?\n/);
    const start = lines.findIndex((l) => l.trimEnd() === '  version:');
    expect(start).toBeGreaterThanOrEqual(0);
    const line = lines.slice(start + 1).find((l) => /^ {4}default:/.test(l));
    expect(line?.replace(/^ {4}default:\s*/, '').replace(/"/g, '').trim()).toBe(DEFAULT_VERSION);
  });
});

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
