// Score scaling + severity helpers. The engine owns scoring; this module only
// converts the engine's [0,1] floats to the 0-100 integers the report and gates
// use, and reads severities off findings. It contains NO scoring math.
import { Finding, ProjectedScores, Severity, SEVERITY_RANK } from './types';

export type MaxSeverity = Severity | 'none';

// Highest severity first — maxSeverity returns the first one present.
const ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

// readiness scales overall_score (a float in [0,1]) to an integer percent in
// [0,100], rounding half up — matching the v1 awk `printf "%d", v+0.5`.
export function readiness(overallScore: number): number {
  const clamped = Math.max(0, Math.min(1, overallScore));
  return Math.round(clamped * 100);
}

export function risk(readinessScore: number): number {
  return 100 - readinessScore;
}

export function maxSeverity(findings: Finding[]): MaxSeverity {
  for (const s of ORDER) {
    if (findings.some((f) => f.severity === s)) return s;
  }
  return 'none';
}

// sevRank mirrors the v1 bash sev_rank: critical 4 … info 0, none -1.
export function sevRank(s: MaxSeverity): number {
  return s === 'none' ? -1 : SEVERITY_RANK[s];
}

export function severityCounts(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    if (f.severity in counts) counts[f.severity]++;
  }
  return counts;
}

export interface ProjectedReadiness {
  fixCritical: number;
  fixHigh: number;
  fixMedium: number;
  fixLow: number;
  fixAll: number;
}

// projectedReadiness converts the engine's projected_scores ([0,1] each) to the
// 0-100 integers the headroom ladder displays.
export function projectedReadiness(p: ProjectedScores): ProjectedReadiness {
  return {
    fixCritical: readiness(p.fix_critical),
    fixHigh: readiness(p.fix_high),
    fixMedium: readiness(p.fix_medium),
    fixLow: readiness(p.fix_low),
    fixAll: readiness(p.fix_all),
  };
}
