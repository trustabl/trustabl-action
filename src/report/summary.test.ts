import { buildSummaryMarkdown } from './summary';
import { ReportData } from './model';

const data: ReportData = {
  repoLabel: 'o/r',
  branch: 'main',
  findingsCount: 6,
  readiness: 65,
  risk: 35,
  maxSeverity: 'high',
  nativeExit: 1,
  severityCounts: { critical: 1, high: 2, medium: 0, low: 2, info: 1 },
  projected: { fixCritical: 75, fixHigh: 90, fixMedium: 95, fixLow: 100, fixAll: 100 },
  gate: {
    fail: true,
    reasons: ['risk 35 >= threshold 30'],
    rows: [{ gate: 'risk-score', threshold: '>= 30', detected: '35', failed: true }],
  },
  rulesVersion: 'abc123',
};

describe('buildSummaryMarkdown', () => {
  it('includes header, score, severity table, ladder, metrics, and gate table', () => {
    const md = buildSummaryMarkdown(data);
    expect(md).toContain('## Trustabl scan');
    expect(md).toContain('`o/r` · `main` · 6 findings');
    expect(md).toContain('Readiness now');
    expect(md).toContain('### Findings by severity');
    expect(md).toContain('| critical | 1 |');
    expect(md).toContain('Projected headroom');
    expect(md).toContain('| Fix critical | 65 → 75 | +10 |');
    expect(md).toContain('| Rules version | `abc123` |');
    expect(md).toContain('### ❌ Failed');
    expect(md).toContain('**Failed due to:** risk 35 >= threshold 30');
  });

  it('omits the headroom ladder when projected scores are absent', () => {
    const md = buildSummaryMarkdown({
      ...data,
      projected: undefined,
      gate: { fail: false, reasons: [], rows: [] },
    });
    expect(md).not.toContain('Projected headroom');
    expect(md).toContain('### ✅ Passed scanning');
  });

  it('shows dependency counts in the metrics table only when deps is present (--vuln-scan)', () => {
    expect(buildSummaryMarkdown(data)).not.toContain('Dependencies scanned');
    const md = buildSummaryMarkdown({ ...data, deps: { scanned: 12, vulnerable: 2 } });
    expect(md).toContain('| Dependencies scanned | `12` |');
    expect(md).toContain('| Known vulnerabilities | `2` |');
  });
});
