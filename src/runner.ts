// Run the trustabl scan. Single scan with --json-out/--sarif-out when the engine
// supports it (capability-probed in install.ts); otherwise a two-scan fallback
// that reproduces the v1 behavior (JSON drives gates, SARIF written separately).
import * as fs from 'fs';
import { runProcess, ProcResult } from './process';
import { parseScanResult, ScanResult } from './types';
import { Inputs } from './inputs';

export interface ScanOutput {
  result: ScanResult;
  nativeExit: number;
}

function baseArgs(inputs: Inputs): string[] {
  const args = ['scan', inputs.target || '.', '--no-progress'];
  if (inputs.detectors) args.push('--detectors', inputs.detectors);
  if (inputs.strict) args.push('--strict');
  if (inputs.rulesRef) args.push('--rules-ref', inputs.rulesRef);
  if (inputs.rulesRepo) args.push('--rules-repo', inputs.rulesRepo);
  return args;
}

// exitCodeOf returns the native exit code, or throws for timeout/spawn failures
// (which are operator errors, not scan verdicts).
function exitCodeOf(r: ProcResult, what: string): number {
  if (r.kind === 'exit') return r.code;
  if (r.kind === 'timeout') throw new Error(`trustabl ${what} timed out`);
  throw new Error(`trustabl ${what} failed to start: ${r.error}`);
}

function readFileOrNull(p: string): string | null {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

export async function runScan(
  binPath: string,
  inputs: Inputs,
  fileOut: boolean,
  timeoutMs: number,
): Promise<ScanOutput> {
  const cwd = process.cwd();

  if (fileOut) {
    // One analysis pass writes both machine artifacts; --format json also goes to
    // stdout (captured, not logged) as a fallback source for the parse.
    const args = [
      ...baseArgs(inputs),
      '--format',
      'json',
      '--json-out',
      inputs.jsonFile,
      '--sarif-out',
      inputs.sarifFile,
    ];
    const r = await runProcess(binPath, args, { cwd, timeoutMs });
    const nativeExit = exitCodeOf(r, 'scan');
    const json = readFileOrNull(inputs.jsonFile) ?? (r.kind === 'exit' ? r.stdout : '');
    if (!json) throw new Error('trustabl scan produced no JSON output');
    return { result: parseScanResult(json), nativeExit };
  }

  // Fallback for engines without --json-out/--sarif-out: two scans. JSON is the
  // gate/report source; SARIF is best-effort (older engines emit the pre-fix
  // SARIF, which Code Scanning may reject — handled downstream by degradation).
  const jsonRun = await runProcess(binPath, [...baseArgs(inputs), '--format', 'json'], { cwd, timeoutMs });
  const nativeExit = exitCodeOf(jsonRun, 'scan');
  if (jsonRun.kind !== 'exit' || !jsonRun.stdout) {
    throw new Error('trustabl scan produced no JSON output');
  }
  fs.writeFileSync(inputs.jsonFile, jsonRun.stdout);

  const sarifRun = await runProcess(binPath, [...baseArgs(inputs), '--format', 'sarif'], { cwd, timeoutMs });
  if (sarifRun.kind === 'exit' && sarifRun.stdout) {
    fs.writeFileSync(inputs.sarifFile, sarifRun.stdout);
  }

  return { result: parseScanResult(jsonRun.stdout), nativeExit };
}
