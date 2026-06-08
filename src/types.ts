// Typed view of the engine's JSON ScanResult. Ported from trustabl-vscode
// (src/types.ts) and extended with projected_scores (engine >= v0.1.3) and the
// dependency BOM / OSV vulnerabilities (engine >= v0.1.4). All additive fields
// are optional so older binaries parse cleanly.

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type Scope = 'tool' | 'agent' | 'subagent' | 'skill' | 'repo' | '';

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
  // Inclusive 1-indexed line range of the entity the finding fired on. Engine
  // >= v0.1.4 emits start_line/end_line (end_line == start_line for a single-line
  // entity; both 0 for repo-scope findings with no source location). Older engines
  // emitted a single `line`, kept here as a read-fallback. Resolve via
  // findingLines() — do not read these fields directly.
  start_line?: number;
  end_line?: number;
  line?: number; // legacy (engine < v0.1.4); fallback for start_line only.
  title: string;
  explanation: string;
  suggested_fix: string;
  confidence: number;
}

// findingLines resolves a finding's 1-indexed inclusive line range across engine
// versions: start_line/end_line (engine >= v0.1.4) with a fallback to the legacy
// single `line`. `start` is 0 for repo-scope findings with no source location, so
// callers must treat 0 as "no line". `end` is never less than `start`.
export function findingLines(f: Finding): { start: number; end: number } {
  const start = f.start_line ?? f.line ?? 0;
  const end = Math.max(start, f.end_line ?? start);
  return { start, end };
}

export interface SurfaceReadiness {
  kind: 'tool' | 'agent' | 'subagent' | 'skill' | 'repo';
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

// DepRef mirrors models.DepRef: one declared dependency in the repo-wide BOM the
// engine emits (engine >= v0.1.4). start_line/end_line point at the declaration
// line in `source` (the manifest file).
export interface DepRef {
  name: string;
  version?: string;
  ecosystem: string;
  source: string;
  start_line: number;
  end_line: number;
}

// DepVuln mirrors models.DepVuln: one OSV match against a declared dependency,
// present only when the scan ran with --vuln-scan. Each match is also synthesized
// into a Finding by the engine (so it flows through scoring, gating, annotations,
// and SARIF) — this array is the structured companion.
export interface DepVuln {
  dep: DepRef;
  id: string;
  aliases?: string[];
  summary?: string;
  severity: Severity;
  fixed_in?: string;
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
  // dependencies is the declared-dependency BOM (engine >= v0.1.4); absent on
  // older binaries. vulnerabilities holds OSV matches and is present only when the
  // scan ran with --vuln-scan.
  dependencies?: DepRef[];
  vulnerabilities?: DepVuln[];
  coverage: Coverage;
  rules_version: string;
  rules_from_cache: boolean;
}

// Tolerant parse: read only the fields we use, ignore the rest, so a future
// engine that adds fields will not break the action. projected_scores is carried
// through only when the engine emitted a complete object (all five tiers numeric);
// dependencies/vulnerabilities stay undefined (not []) when the engine omits them,
// so a missing array is distinguishable from an empty one.
export function parseScanResult(stdout: string): ScanResult {
  const data = JSON.parse(stdout) as Partial<ScanResult> | null;
  if (data === null || typeof data !== 'object') {
    throw new Error('invalid ScanResult: expected a JSON object');
  }
  return {
    scan_id: data.scan_id ?? '',
    repo: data.repo ?? '',
    // The engine marshals an empty (nil) findings slice as JSON `null`, not `[]`,
    // so a clean scan emits `findings: null`. Treat null/absent as no findings.
    findings: Array.isArray(data.findings) ? data.findings : [],
    surfaces: Array.isArray(data.surfaces) ? data.surfaces : [],
    overall_score: data.overall_score ?? 0,
    projected_scores: validProjected(data.projected_scores),
    dependencies: Array.isArray(data.dependencies) ? data.dependencies : undefined,
    vulnerabilities: Array.isArray(data.vulnerabilities) ? data.vulnerabilities : undefined,
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
