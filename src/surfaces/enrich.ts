import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import { Inputs } from '../inputs';
import { RunContext } from '../context';

export interface EnrichResult {
  enrichedJsonFile: string;
  fixPrUrl: string | null;
  appliedCount: number;
}

const ENRICHED_JSON = 'enriched.json';

export async function runEnrich(
  binPath: string,
  inputs: Inputs,
  ctx: RunContext,
): Promise<EnrichResult> {
  core.setSecret(inputs.anthropicKey);
  try {
    await exec.exec(binPath, ['llm', 'key', 'set', inputs.anthropicKey], { silent: true });
  } catch (e) {
    core.warning(`Enrich skipped: failed to configure LLM key: ${e instanceof Error ? e.message : String(e)}`);
    return { enrichedJsonFile: ENRICHED_JSON, fixPrUrl: null, appliedCount: 0 };
  }

  const args = [
    'enrich',
    '--input', inputs.jsonFile,
    '--repo', '.',
    '--output', ENRICHED_JSON,
  ];
  if (inputs.autoFix) args.push('--apply');
  for (const rule of inputs.enrichRules) args.push('--rule', rule);

  try {
    await exec.exec(binPath, args);
  } catch (e) {
    core.warning(`Enrich failed: ${e instanceof Error ? e.message : String(e)}`);
    return { enrichedJsonFile: ENRICHED_JSON, fixPrUrl: null, appliedCount: 0 };
  }

  if (!inputs.autoFix) {
    return { enrichedJsonFile: ENRICHED_JSON, fixPrUrl: null, appliedCount: 0 };
  }

  const modified = await getModifiedFiles(inputs);
  if (modified.length === 0) {
    core.info('Enrich: no files modified by auto-fix.');
    return { enrichedJsonFile: ENRICHED_JSON, fixPrUrl: null, appliedCount: 0 };
  }

  core.info(`Enrich: ${modified.length} file(s) patched.`);

  if (!inputs.createFixPr) {
    return { enrichedJsonFile: ENRICHED_JSON, fixPrUrl: null, appliedCount: modified.length };
  }

  const fixPrUrl = await openFixPr(inputs, ctx, modified);
  return { enrichedJsonFile: ENRICHED_JSON, fixPrUrl, appliedCount: modified.length };
}

const SCAN_OUTPUTS = new Set([ENRICHED_JSON, 'trustabl.json', 'trustabl.sarif']);

async function getModifiedFiles(inputs: Inputs): Promise<string[]> {
  const { stdout } = await exec.getExecOutput('git', ['status', '--porcelain'], { silent: true });
  const excluded = new Set([ENRICHED_JSON, inputs.jsonFile, inputs.sarifFile]);
  return stdout
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => l.slice(3).trim())
    .filter((f) => !excluded.has(f) && !SCAN_OUTPUTS.has(f));
}

async function openFixPr(inputs: Inputs, ctx: RunContext, modified: string[]): Promise<string | null> {
  const runId = github.context.runId;
  const branch = `trustabl/fix-${runId}`;
  const base = inputs.fixPrBase || ctx.ref.replace('refs/heads/', '');

  try {
    await exec.exec('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com']);
    await exec.exec('git', ['config', 'user.name', 'github-actions[bot]']);
    await exec.exec('git', ['checkout', '-b', branch]);
    await exec.exec('git', ['add', ...modified]);
    await exec.exec('git', ['commit', '-m', `fix: Trustabl auto-fix findings (run #${runId})`]);
    await exec.exec('git', ['push', 'origin', branch]);

    const octo = github.getOctokit(inputs.githubToken);
    const { data: pr } = await octo.rest.pulls.create({
      owner: ctx.owner,
      repo: ctx.repo,
      head: branch,
      base,
      title: `Trustabl auto-fix — run #${runId}`,
      body: buildFixPrBody(ctx, runId, modified),
    });
    return pr.html_url;
  } catch (e) {
    const err = e as { status?: number; message?: string };
    if (err.status === 403) {
      core.warning('Fix PR skipped: token lacks contents: write or pull-requests: write.');
    } else {
      core.warning(`Fix PR failed: ${err.message ?? String(e)}`);
    }
    return null;
  }
}

function buildFixPrBody(ctx: RunContext, runId: number, modified: string[]): string {
  const runUrl = `https://github.com/${ctx.owner}/${ctx.repo}/actions/runs/${runId}`;
  const fileList = modified.map((f) => `- \`${f}\``).join('\n');
  return [
    'Automated fixes applied by [Trustabl](https://github.com/trustabl/trustabl-action).',
    '',
    `**Workflow run:** ${runUrl}`,
    '',
    `**Patched files (${modified.length}):**`,
    fileList,
    '',
    '> Review each change before merging. False-positive fixes can be closed without merging.',
  ].join('\n');
}
