// Trustabl GitHub Action entry point. Orchestrates: read inputs → install the
// engine → scan once (dual-output, with fallback) → derive metrics → emit all
// four surfaces (console + Step Summary, inline annotations + Security tab,
// sticky PR comment, status-check gating) → set outputs. Every network surface
// degrades gracefully; only a true scan/operator error or a gate trip fails the job.
import * as core from '@actions/core';
import { readInputs } from './inputs';
import { getRunContext } from './context';
import { resolveTrustabl } from './install';
import { runScan } from './runner';
import { readiness, risk, maxSeverity, severityCounts, projectedReadiness } from './score';
import { evaluateGate } from './gate';
import { repoLabel, resolveBranch } from './git';
import { ReportData } from './report/model';
import { renderConsole } from './report/console';
import { buildSummaryMarkdown, writeStepSummary } from './report/summary';
import { emitAnnotations } from './report/annotations';
import { uploadSarif } from './surfaces/sarif';
import { uploadResults } from './surfaces/artifact';
import { upsertComment } from './surfaces/comment';

const SCAN_TIMEOUT_MS = 10 * 60 * 1000;

async function run(): Promise<void> {
  const inputs = readInputs();
  const ctx = getRunContext();

  const installed = await resolveTrustabl(inputs.githubToken, inputs.version);
  core.info(`trustabl ${installed.version} (single-scan dual output: ${installed.capabilities.fileOut ? 'yes' : 'no'})`);

  const { result, nativeExit } = await runScan(
    installed.binPath,
    inputs,
    installed.capabilities.fileOut,
    SCAN_TIMEOUT_MS,
  );

  if (result.coverage.files_skipped > 0) {
    core.warning(
      `${result.coverage.files_skipped} source file(s) could not be parsed and were skipped; findings may be incomplete.`,
    );
  }

  const ready = readiness(result.overall_score);
  const riskScore = risk(ready);
  const maxSev = maxSeverity(result.findings);
  const counts = severityCounts(result.findings);
  const projected = result.projected_scores ? projectedReadiness(result.projected_scores) : undefined;

  const gate = evaluateGate({
    nativeExit,
    risk: riskScore,
    maxSeverity: maxSev,
    findingsCount: result.findings.length,
    riskThreshold: inputs.riskScoreThreshold,
    severityThreshold: inputs.severityThreshold,
  });

  const data: ReportData = {
    repoLabel: repoLabel(inputs.target, `${ctx.owner}/${ctx.repo}`),
    branch: resolveBranch(inputs.branch, ctx.prHeadRef, ctx.ref),
    findingsCount: result.findings.length,
    readiness: ready,
    risk: riskScore,
    maxSeverity: maxSev,
    nativeExit,
    severityCounts: counts,
    projected,
    gate,
    rulesVersion: result.rules_version,
  };

  // Outputs (v1 names preserved) + one additive.
  core.setOutput('exit-code', String(nativeExit));
  core.setOutput('readiness-score', String(ready));
  core.setOutput('risk-score', String(riskScore));
  core.setOutput('max-severity', maxSev);
  core.setOutput('findings-count', String(result.findings.length));
  core.setOutput('sarif-file', inputs.sarifFile);
  core.setOutput('json-file', inputs.jsonFile);
  core.setOutput('artifact-name', inputs.artifactName);

  // Surface 4: console panel + Step Summary (always; no permissions needed).
  renderConsole(data);
  const md = buildSummaryMarkdown(data);
  await writeStepSummary(md);

  // Surface 1a: inline annotations (always; also the SARIF-unavailable fallback).
  if (inputs.annotations) {
    emitAnnotations(result.findings, inputs.maxAnnotations);
  }

  // Surface 1b: SARIF → Security tab (needs security-events: write).
  if (inputs.uploadSarif) {
    const res = await uploadSarif(inputs.githubToken, ctx, inputs.sarifFile);
    core.setOutput('sarif-uploaded', String(res.uploaded));
    if (res.uploaded) core.info('Uploaded SARIF to Code Scanning.');
    else if (res.reason) core.warning(res.reason);
  } else {
    core.setOutput('sarif-uploaded', 'false');
  }

  // Downloadable artifact (JSON + SARIF).
  if (inputs.uploadArtifact) {
    const days = inputs.artifactRetentionDays ? parseInt(inputs.artifactRetentionDays, 10) : undefined;
    await uploadResults(inputs.artifactName, [inputs.jsonFile, inputs.sarifFile], days);
  }

  // Surface 2: sticky PR comment (needs pull-requests: write; pull_request only).
  if (inputs.commentOnPr && ctx.isPullRequest) {
    await upsertComment(inputs.githubToken, ctx, md);
  }

  // Surface 3: status-check gating — the job status is the check.
  if (gate.fail) {
    core.setFailed(`Trustabl gate failed: ${gate.reasons.join('; ')}`);
  } else {
    core.info('✓ Trustabl gate passed.');
  }
}

run().catch((e) => core.setFailed(e instanceof Error ? e.message : String(e)));
