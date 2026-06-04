// Plain-ASCII box panel for the run log. The v1 action drew an ANSI-colored box
// with manual width math that mixed multibyte glyphs and escape codes; this port
// keeps the structure (readiness gauge, projected ladder, severity bars, metrics)
// but stays pure ASCII so column math is just string length — no locale/ANSI
// width hazards. buildConsoleLines is exported for snapshot testing.
import * as core from '@actions/core';
import { ReportData } from './model';

const W = 58; // inner content width

function pad(s: string): string {
  return s.length >= W ? s.slice(0, W) : s + ' '.repeat(W - s.length);
}
function row(s: string): string {
  return `| ${pad(s)} |`;
}
function rule(): string {
  return `+${'-'.repeat(W + 2)}+`;
}
function bar(v: number, max: number, width: number): string {
  const m = max <= 0 ? 1 : max;
  const f = Math.min(width, Math.max(0, Math.round((v / m) * width)));
  return `[${'#'.repeat(f)}${'-'.repeat(width - f)}]`;
}

export function buildConsoleLines(d: ReportData): string[] {
  const L: string[] = [];
  L.push(rule());
  L.push(row(`Trustabl  ${d.repoLabel} · ${d.branch} · ${d.findingsCount} findings`));
  L.push(rule());
  L.push(row(`Readiness  ${bar(d.readiness, 100, 10)} ${d.readiness} / 100`));
  if (d.projected) {
    const delta = d.projected.fixAll - d.readiness;
    L.push(row(`Projected  ${bar(d.projected.fixAll, 100, 10)} ${d.projected.fixAll} / 100  (+${delta})`));
  }
  L.push(rule());
  const c = d.severityCounts;
  const smax = Math.max(1, c.critical, c.high, c.medium, c.low, c.info);
  L.push(row(`critical ${bar(c.critical, smax, 8)} ${c.critical}`));
  L.push(row(`high     ${bar(c.high, smax, 8)} ${c.high}`));
  L.push(row(`medium   ${bar(c.medium, smax, 8)} ${c.medium}`));
  L.push(row(`low      ${bar(c.low, smax, 8)} ${c.low}`));
  L.push(row(`info     ${bar(c.info, smax, 8)} ${c.info}`));
  if (d.projected) {
    const p = d.projected;
    const s = d.readiness;
    L.push(rule());
    L.push(row(`Fix critical  ${s} -> ${p.fixCritical}  (+${p.fixCritical - s})`));
    L.push(row(`Fix +high     ${p.fixCritical} -> ${p.fixHigh}  (+${p.fixHigh - p.fixCritical})`));
    L.push(row(`Fix +medium   ${p.fixHigh} -> ${p.fixMedium}  (+${p.fixMedium - p.fixHigh})`));
    L.push(row(`Fix +low      ${p.fixMedium} -> ${p.fixLow}  (+${p.fixLow - p.fixMedium})`));
    L.push(row(`Fix +info     ${p.fixLow} -> ${p.fixAll}  (+${p.fixAll - p.fixLow})`));
  }
  L.push(rule());
  L.push(row(`Max severity: ${d.maxSeverity}    Native exit: ${d.nativeExit}`));
  L.push(rule());
  if (d.projected) {
    L.push("Projected = estimate from trustabl's own scoring; listed fixes resolved, nothing new. Not a re-scan.");
  }
  return L;
}

export function renderConsole(d: ReportData): void {
  for (const line of buildConsoleLines(d)) core.info(line);
}
