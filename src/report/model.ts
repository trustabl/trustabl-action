// Shared data the three report renderers (console, Step Summary, PR comment) all
// read. Assembled once in main.ts so every surface shows identical numbers.
import { Severity } from '../types';
import { MaxSeverity, ProjectedReadiness } from '../score';
import { GateResult } from '../gate';

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
  gate: GateResult;
  rulesVersion: string;
}
