// Typed view of the engine's JSON ScanResult. Ported from trustabl-vscode
// (src/types.ts) and extended with projected_scores (engine >= the release that
// added analysis.Project; optional so older binaries parse cleanly).

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type Scope = 'tool' | 'agent' | 'subagent' | 'repo' | '';

export const SEVERITY_RANK: Record<Severity, number> = {
  info: 0, low: 1, medium: 2, high: 3, critical: 4,
};

export interface Finding {
  rule_id: string;
  category: string;
  scope: Scope;
  severity: Severity;
  tool_name: string;
  file_path: string;
  line: number;
  title: string;
  explanation: string;
  suggested_fix: string;
  confidence: number;
}

export interface SurfaceReadiness {
  kind: 'tool' | 'agent' | 'subagent' | 'repo';
  name: string;
  file_path: string;
  score: number;
  finding_count: number;
  weighted_severity: number;
}

// ProjectedScores mirrors models.ProjectedScores: overall-score projections after
// cumulatively resolving findings at each severity tier. The engine is the sole
// source of truth — the action renders these, never recomputes scoring.
export interface ProjectedScores {
  fix_critical: number;
  fix_high: number;
  fix_medium: number;
  fix_low: number;
  fix_all: number;
}

export interface Coverage {
  files_parsed: number;
  files_skipped: number;
  skipped_files?: string[];
}

export interface ScanResult {
  scan_id: string;
  repo: string;
  findings: Finding[];
  surfaces: SurfaceReadiness[];
  overall_score: number;
  projected_scores?: ProjectedScores;
  coverage: Coverage;
  rules_version: string;
  rules_from_cache: boolean;
}

// Tolerant parse: read only the fields we use, ignore the rest, so a future
// engine that adds fields will not break the action. projected_scores is carried
// through only when the engine emitted a complete object (all five tiers numeric).
export function parseScanResult(stdout: string): ScanResult {
  const data = JSON.parse(stdout) as Partial<ScanResult>;
  if (!Array.isArray(data.findings)) {
    throw new Error('invalid ScanResult: missing findings array');
  }
  return {
    scan_id: data.scan_id ?? '',
    repo: data.repo ?? '',
    findings: data.findings,
    surfaces: Array.isArray(data.surfaces) ? data.surfaces : [],
    overall_score: data.overall_score ?? 0,
    projected_scores: validProjected(data.projected_scores),
    coverage: data.coverage ?? { files_parsed: 0, files_skipped: 0 },
    rules_version: data.rules_version ?? '',
    rules_from_cache: data.rules_from_cache ?? false,
  };
}

function validProjected(p: ProjectedScores | undefined): ProjectedScores | undefined {
  if (!p) return undefined;
  const keys: (keyof ProjectedScores)[] = ['fix_critical', 'fix_high', 'fix_medium', 'fix_low', 'fix_all'];
  return keys.every((k) => typeof p[k] === 'number') ? p : undefined;
}
