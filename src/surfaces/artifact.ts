// Upload the JSON + SARIF scan results as a workflow artifact via @actions/artifact
// (a node action cannot `uses:` actions/upload-artifact). Best-effort: a failure
// warns but never fails the job.
import * as fs from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import { DefaultArtifactClient } from '@actions/artifact';

export async function uploadResults(
  name: string,
  files: string[],
  retentionDays: number | undefined,
): Promise<void> {
  const root = process.cwd();
  const present = files.map((f) => path.resolve(root, f)).filter((f) => fs.existsSync(f));
  if (present.length === 0) {
    core.warning('No scan result files to upload as an artifact.');
    return;
  }
  try {
    const client = new DefaultArtifactClient();
    await client.uploadArtifact(name, present, root, retentionDays ? { retentionDays } : {});
    core.info(`Uploaded artifact "${name}" (${present.length} file(s)).`);
  } catch (e) {
    core.warning(`Artifact upload failed: ${(e as Error).message}`);
  }
}
