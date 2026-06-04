// Markdown report — used for BOTH the GitHub Step Summary and the sticky PR
// comment, so the two never diverge. Ports the v1 composite action's Step Summary
// structure (header, emoji gauge, severity table, collapsible headroom ladder,
// metrics table, gate table). The headroom ladder is omitted when the engine did
// not emit projected_scores.
import * as core from '@actions/core';
import { ReportData } from './model';

function mdEmoji(v: number): string {
  const w = 10;
  const f = Math.min(w, Math.max(0, Math.round((v / 100) * w)));
  const e = v >= 70 ? '🟩' : v >= 40 ? '🟨' : '🟥';
  return e.repeat(f) + '⬜'.repeat(w - f);
}

function mdCount(v: number, max: number): string {
  const w = 8;
  const m = max <= 0 ? 1 : max;
  const f = Math.min(w, Math.max(0, Math.round((v / m) * w)));
  return '▰'.repeat(f) + '▱'.repeat(w - f);
}

export function buildSummaryMarkdown(d: ReportData): string {
  const L: string[] = [];
  L.push('## Trustabl scan', '');
  L.push(`**\`${d.repoLabel}\` · \`${d.branch}\` · ${d.findingsCount} findings**`, '');

  if (d.projected) {
    const delta = d.projected.fixAll - d.readiness;
    L.push(`Readiness goes from \`${d.readiness}\` → \`${d.projected.fixAll}\` (**+${delta}**)`, '');
  }
  L.push(`Readiness now &nbsp; ${mdEmoji(d.readiness)} &nbsp; \`${d.readiness} / 100\``, '');
  if (d.projected) {
    const delta = d.projected.fixAll - d.readiness;
    L.push(
      `Projected if **all findings** resolved &nbsp; ${mdEmoji(d.projected.fixAll)} &nbsp; \`${d.projected.fixAll} / 100\` &nbsp; **+${delta}**`,
      '',
    );
  } else {
    L.push('');
  }

  const c = d.severityCounts;
  const smax = Math.max(1, c.critical, c.high, c.medium, c.low, c.info);
  L.push('### Findings by severity', '');
  L.push('| Severity | Count | |', '|---|---|---|');
  L.push(`| critical | ${c.critical} | ${mdCount(c.critical, smax)} |`);
  L.push(`| high | ${c.high} | ${mdCount(c.high, smax)} |`);
  L.push(`| medium | ${c.medium} | ${mdCount(c.medium, smax)} |`);
  L.push(`| low | ${c.low} | ${mdCount(c.low, smax)} |`);
  L.push(`| info | ${c.info} | ${mdCount(c.info, smax)} |`);
  L.push('');

  if (d.projected) {
    const p = d.projected;
    const s = d.readiness;
    L.push('<details><summary><b>Projected headroom</b> — estimate, not a re-scan</summary>', '');
    L.push('| Fix scope | Readiness | Δ |', '|---|---|---|');
    L.push(`| Fix critical | ${s} → ${p.fixCritical} | +${p.fixCritical - s} |`);
    L.push(`| + high | ${p.fixCritical} → ${p.fixHigh} | +${p.fixHigh - p.fixCritical} |`);
    L.push(`| + medium | ${p.fixHigh} → ${p.fixMedium} | +${p.fixMedium - p.fixHigh} |`);
    L.push(`| + low | ${p.fixMedium} → ${p.fixLow} | +${p.fixLow - p.fixMedium} |`);
    L.push(`| + info (all) | ${p.fixLow} → ${p.fixAll} | +${p.fixAll - p.fixLow} |`);
    L.push('');
    L.push(
      "_Projected by re-applying trustabl's own scoring with the listed findings resolved (nothing new introduced). Treat as guidance, not a guarantee._",
    );
    L.push('</details>', '');
  }

  L.push('| Metric | Value |', '|---|---|');
  L.push(`| Repository | \`${d.repoLabel}\` |`);
  L.push(`| Branch | \`${d.branch}\` |`);
  L.push(`| Readiness score | \`${d.readiness}\` |`);
  L.push(`| Risk score | \`${d.risk}\` |`);
  L.push(`| Findings | \`${d.findingsCount}\` |`);
  L.push(`| Max severity | \`${d.maxSeverity}\` |`);
  L.push(`| Native exit | \`${d.nativeExit}\` |`);
  if (d.rulesVersion) L.push(`| Rules version | \`${d.rulesVersion}\` |`);
  L.push('');

  if (d.gate.fail) {
    L.push('### ❌ Failed', '');
    L.push('| Gate | Threshold | Detected | Result |', '|---|---|---|---|');
    for (const row of d.gate.rows) {
      L.push(`| ${row.gate} | \`${row.threshold}\` | \`${row.detected}\` | ${row.failed ? '❌' : '✅'} |`);
    }
    L.push('', `**Failed due to:** ${d.gate.reasons.join('; ')}`);
  } else {
    L.push('### ✅ Passed scanning');
  }

  return L.join('\n');
}

export async function writeStepSummary(md: string): Promise<void> {
  await core.summary.addRaw(md).write();
}
