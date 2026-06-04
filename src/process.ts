// Child-process runner with a hard timeout. Ported from trustabl-vscode
// (src/process.ts); the VS Code cancellation token is dropped (an Action step
// runs to completion or times out).
import { spawn } from 'child_process';

export interface RunOptions {
  cwd: string;
  timeoutMs: number;
}

export type ProcResult =
  | { kind: 'exit'; code: number; stdout: string; stderr: string }
  | { kind: 'timeout'; stdout: string; stderr: string }
  | { kind: 'spawn-error'; error: string };

export function runProcess(command: string, args: string[], opts: RunOptions): Promise<ProcResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const child = spawn(command, args, { cwd: opts.cwd });

    const finish = (r: ProcResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(r);
    };

    const timer = setTimeout(() => {
      child.kill();
      finish({ kind: 'timeout', stdout, stderr });
    }, opts.timeoutMs);

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (e) => finish({ kind: 'spawn-error', error: e.message }));
    child.on('close', (code) => finish({ kind: 'exit', code: code ?? -1, stdout, stderr }));
  });
}
