import { parseScanResult, findingLines, Finding } from './types';

const minimal = JSON.stringify({
  scan_id: 's', repo: 'o/r', findings: [], surfaces: [], overall_score: 1,
  coverage: { files_parsed: 1, files_skipped: 0 }, rules_version: 'abc', rules_from_cache: false,
});

const mkFinding = (over: Partial<Finding>): Finding => ({
  rule_id: 'R', category: '', scope: 'tool', severity: 'high', tool_name: '',
  file_path: 'f.py', title: 't', explanation: '', suggested_fix: '', confidence: 1, ...over,
});

describe('parseScanResult', () => {
  it('parses a minimal result', () => {
    const r = parseScanResult(minimal);
    expect(r.scan_id).toBe('s');
    expect(r.overall_score).toBe(1);
    expect(r.projected_scores).toBeUndefined();
  });

  it('treats null/absent findings as an empty array (clean scan → Go nil slice → null)', () => {
    expect(parseScanResult('{}').findings).toEqual([]);
    const nullFindings = JSON.stringify({ ...JSON.parse(minimal), findings: null });
    expect(parseScanResult(nullFindings).findings).toEqual([]);
  });

  it('throws on non-object JSON', () => {
    expect(() => parseScanResult('42')).toThrow(/expected a JSON object/);
    expect(() => parseScanResult('"nope"')).toThrow(/expected a JSON object/);
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

  it('carries dependencies + vulnerabilities through when present (engine >= v0.1.4 / --vuln-scan)', () => {
    const withDeps = JSON.stringify({
      ...JSON.parse(minimal),
      dependencies: [{ name: 'requests', version: '2.0.0', ecosystem: 'PyPI', source: 'req.txt', start_line: 3, end_line: 3 }],
      vulnerabilities: [{ dep: { name: 'requests', ecosystem: 'PyPI', source: 'req.txt', start_line: 3, end_line: 3 }, id: 'GHSA-x', severity: 'high' }],
    });
    const r = parseScanResult(withDeps);
    expect(r.dependencies).toHaveLength(1);
    expect(r.dependencies?.[0].name).toBe('requests');
    expect(r.vulnerabilities?.[0].id).toBe('GHSA-x');
  });

  it('leaves dependencies/vulnerabilities undefined (not []) when the engine omits them', () => {
    const r = parseScanResult(minimal);
    expect(r.dependencies).toBeUndefined();
    expect(r.vulnerabilities).toBeUndefined();
  });

  it('ignores non-array dependencies/vulnerabilities (defensive)', () => {
    const bad = JSON.stringify({ ...JSON.parse(minimal), dependencies: {}, vulnerabilities: 7 });
    const r = parseScanResult(bad);
    expect(r.dependencies).toBeUndefined();
    expect(r.vulnerabilities).toBeUndefined();
  });
});

describe('findingLines', () => {
  it('reads the new start_line/end_line range (engine >= v0.1.4)', () => {
    expect(findingLines(mkFinding({ start_line: 5, end_line: 8 }))).toEqual({ start: 5, end: 8 });
  });

  it('treats a single-line entity as start == end', () => {
    expect(findingLines(mkFinding({ start_line: 12, end_line: 12 }))).toEqual({ start: 12, end: 12 });
  });

  it('falls back to the legacy single `line` (engine < v0.1.4)', () => {
    expect(findingLines(mkFinding({ line: 42 }))).toEqual({ start: 42, end: 42 });
  });

  it('prefers start_line over a stray legacy line if both are present', () => {
    expect(findingLines(mkFinding({ start_line: 5, end_line: 6, line: 99 }))).toEqual({ start: 5, end: 6 });
  });

  it('returns {0, 0} for a repo-scope finding with no source location', () => {
    expect(findingLines(mkFinding({ scope: 'repo', start_line: 0, end_line: 0 }))).toEqual({ start: 0, end: 0 });
    expect(findingLines(mkFinding({}))).toEqual({ start: 0, end: 0 });
  });

  it('never lets end fall below start (clamps a malformed range)', () => {
    expect(findingLines(mkFinding({ start_line: 10, end_line: 4 }))).toEqual({ start: 10, end: 10 });
  });
});
