import { parseScanResult } from './types';

const minimal = JSON.stringify({
  scan_id: 's', repo: 'o/r', findings: [], surfaces: [], overall_score: 1,
  coverage: { files_parsed: 1, files_skipped: 0 }, rules_version: 'abc', rules_from_cache: false,
});

describe('parseScanResult', () => {
  it('parses a minimal result', () => {
    const r = parseScanResult(minimal);
    expect(r.scan_id).toBe('s');
    expect(r.overall_score).toBe(1);
    expect(r.projected_scores).toBeUndefined();
  });

  it('throws when findings is missing', () => {
    expect(() => parseScanResult('{}')).toThrow(/missing findings/);
  });

  it('keeps a complete projected_scores object', () => {
    const withProj = JSON.stringify({
      ...JSON.parse(minimal),
      projected_scores: { fix_critical: 0.6, fix_high: 0.8, fix_medium: 0.9, fix_low: 1, fix_all: 1 },
    });
    const r = parseScanResult(withProj);
    expect(r.projected_scores?.fix_all).toBe(1);
  });

  it('drops an incomplete projected_scores object (old/partial engine)', () => {
    const partial = JSON.stringify({
      ...JSON.parse(minimal),
      projected_scores: { fix_critical: 0.6 },
    });
    expect(parseScanResult(partial).projected_scores).toBeUndefined();
  });

  it('tolerates unknown extra fields', () => {
    const extra = JSON.stringify({ ...JSON.parse(minimal), brand_new_field: 42 });
    expect(parseScanResult(extra).scan_id).toBe('s');
  });
});
