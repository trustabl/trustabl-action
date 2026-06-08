// Shared data the three report renderers (console, Step Summary, PR comment) all
// read. Assembled once in main.ts so every surface shows identical numbers.
import { Severity } from '../types';
import { MaxSeverity, ProjectedReadiness } from '../score';
import { GateResult } from '../gate';

// DepsSummary is the dependency-scan headline shown only when --vuln-scan ran.
// `vulnerable` counts OSV matches (one per advisory × affected dependency); those
// matches also appear as findings, so they are already reflected in the severity
// counts and gate.
export interface DepsSummary {
  scanned: number;
  vulnerable: number;
}

export interface ReportData {
  repoLabel: string;
  branch: string;
  findingsCount: number;
  readiness: number; // 0-100
  risk: number; // 0-100
  maxSeverity: MaxSeverity;
  nativeExit: number;
  severityCounts: Record<Severity, number>;
  projected?: ProjectedReadiness; // absent when the engine predates projected_scores
  deps?: DepsSummary; // present only when --vuln-scan ran
  gate: GateResult;
  rulesVersion: string;
}
