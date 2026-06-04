// Upload SARIF to GitHub Code Scanning via the REST API (a node action cannot
// `uses:` github/codeql-action/upload-sarif). gzip + base64 per the API contract.
// Degrades gracefully: a 403 (no security-events: write, or a private repo
// without Advanced Security) or a read-only fork-PR token returns uploaded=false
// with a reason — the caller falls back to inline annotations and never fails the
// job solely because Code Scanning is unavailable.
import * as fs from 'fs';
import * as zlib from 'zlib';
import * as github from '@actions/github';
import { RunContext } from '../context';

export interface SarifUploadResult {
  uploaded: boolean;
  reason?: string;
}

export async function uploadSarif(token: string, ctx: RunContext, sarifPath: string): Promise<SarifUploadResult> {
  let raw: Buffer;
  try {
    raw = fs.readFileSync(sarifPath);
  } catch {
    return { uploaded: false, reason: `SARIF file not found at ${sarifPath}; nothing to upload.` };
  }

  const sarif = zlib.gzipSync(raw).toString('base64');
  const octo = github.getOctokit(token);
  try {
    await octo.rest.codeScanning.uploadSarif({
      owner: ctx.owner,
      repo: ctx.repo,
      // sha/ref are the merge ref+sha as checked out for PRs — they must pair.
      commit_sha: ctx.sha,
      ref: ctx.ref,
      sarif,
    });
    return { uploaded: true };
  } catch (e) {
    const err = e as { status?: number; message?: string };
    if (err.status === 403) {
      return {
        uploaded: false,
        reason:
          'Code Scanning upload not permitted (needs permissions: security-events: write; ' +
          'private repos additionally need GitHub Advanced Security; fork PRs get a read-only token). ' +
          'Falling back to inline annotations.',
      };
    }
    return { uploaded: false, reason: `Code Scanning upload failed: ${err.message ?? String(e)}` };
  }
}
