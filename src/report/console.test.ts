import { buildConsoleLines } from './console';
import { ReportData } from './model';

const base: ReportData = {
  repoLabel: 'o/r',
  branch: 'main',
  findingsCount: 3,
  readiness: 65,
  risk: 35,
  maxSeverity: 'high',
  nativeExit: 0,
  severityCounts: { critical: 0, high: 1, medium: 0, low: 2, info: 0 },
  projected: { fixCritical: 70, fixHigh: 100, fixMedium: 100, fixLow: 100, fixAll: 100 },
  gate: { fail: false, reasons: [], rows: [] },
  rulesVersion: 'abc',
};

describe('buildConsoleLines', () => {
  it('renders a box whose bordered rows are all the same width', () => {
    const lines = buildConsoleLines(base);
    const rules = lines.filter((l) => l.startsWith('+'));
    expect(rules.length).toBeGreaterThan(0);
    const width = rules[0].length;
    for (const l of lines) {
      if (l.startsWith('|') || l.startsWith('+')) {
        expect(l.length).toBe(width);
      }
    }
    expect(lines.some((l) => l.includes('Readiness'))).toBe(true);
    expect(lines.some((l) => l.includes('Fix critical'))).toBe(true);
  });

  it('omits the headroom ladder when projected scores are absent', () => {
    const lines = buildConsoleLines({ ...base, projected: undefined });
    expect(lines.some((l) => l.includes('Fix critical'))).toBe(false);
  });
});
