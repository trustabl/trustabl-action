// CI gate evaluation. Pure function mirroring the v1 composite action's gate
// logic (action.yml fail conditions) exactly:
//   - native exit 2 (scanner error) or 1 (trustabl gated) → fail
//   - risk-score-threshold > 0 and risk >= threshold → fail
//   - severity-threshold != none and sevRank(max) >= sevRank(threshold) and
//     findingsCount > 0 → fail
import { Severity } from './types';
import { MaxSeverity, sevRank } from './score';

export interface GateInput {
  nativeExit: number;
  risk: number;
  maxSeverity: MaxSeverity;
  findingsCount: number;
  riskThreshold: number; // 0 disables
  severityThreshold: 'none' | Severity;
}

export interface GateRow {
  gate: string;
  threshold: string;
  detected: string;
  failed: boolean;
}

export interface GateResult {
  fail: boolean;
  reasons: string[];
  rows: GateRow[];
}

export function evaluateGate(g: GateInput): GateResult {
  const reasons: string[] = [];
  const rows: GateRow[] = [];
  let fail = false;

  if (g.nativeExit === 2) {
    fail = true;
    reasons.push('scanner error (exit 2)');
  } else if (g.nativeExit === 1) {
    fail = true;
    reasons.push('trustabl gated (medium+ or --strict)');
  }
  if (g.nativeExit !== 0) {
    rows.push({ gate: 'trustabl native', threshold: 'exit 0', detected: `exit ${g.nativeExit}`, failed: true });
  }

  if (g.riskThreshold > 0) {
    const over = g.risk >= g.riskThreshold;
    rows.push({ gate: 'risk-score', threshold: `>= ${g.riskThreshold}`, detected: `${g.risk}`, failed: over });
    if (over) {
      fail = true;
      reasons.push(`risk ${g.risk} >= threshold ${g.riskThreshold}`);
    }
  }

  if (g.severityThreshold !== 'none') {
    const over = sevRank(g.maxSeverity) >= sevRank(g.severityThreshold) && g.findingsCount > 0;
    rows.push({ gate: 'severity', threshold: `>= ${g.severityThreshold}`, detected: g.maxSeverity, failed: over });
    if (over) {
      fail = true;
      reasons.push(`max severity ${g.maxSeverity} >= threshold ${g.severityThreshold}`);
    }
  }

  return { fail, reasons, rows };
}
