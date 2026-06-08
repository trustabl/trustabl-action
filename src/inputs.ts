// Action input reading + validation. The parse* helpers are pure and unit-tested;
// readInputs() binds them to @actions/core at runtime.
import * as core from '@actions/core';
import { Severity } from './types';

export type SeverityThreshold = 'none' | Severity;

export interface Inputs {
  target: string;
  version: string;
  detectors: string;
  strict: boolean;
  vulnScan: boolean;
  rulesRef: string;
  rulesRepo: string;
  uploadSarif: boolean;
  sarifFile: string;
  jsonFile: string;
  uploadArtifact: boolean;
  artifactName: string;
  artifactRetentionDays: string;
  riskScoreThreshold: number;
  severityThreshold: SeverityThreshold;
  branch: string;
  commentOnPr: boolean;
  annotations: boolean;
  maxAnnotations: number;
  githubToken: string;
}

export function parseSeverityThreshold(raw: string): SeverityThreshold {
  const v = raw.trim().toLowerCase();
  if (v === '' || v === 'none') return 'none';
  if (v === 'info' || v === 'low' || v === 'medium' || v === 'high' || v === 'critical') {
    return v as Severity;
  }
  throw new Error(`invalid severity-threshold "${raw}" (want one of: none, low, medium, high, critical)`);
}

export function parseRiskThreshold(raw: string): number {
  const v = raw.trim();
  if (v === '') return 0;
  if (!/^\d+$/.test(v)) {
    throw new Error(`invalid risk-score-threshold "${raw}" (want an integer in 0-100; 0 disables)`);
  }
  const n = parseInt(v, 10);
  if (n < 0 || n > 100) {
    throw new Error(`risk-score-threshold ${n} out of range (0-100)`);
  }
  return n;
}

export function parsePositiveInt(raw: string, fallback: number, name: string): number {
  const v = raw.trim();
  if (v === '') return fallback;
  if (!/^\d+$/.test(v)) {
    throw new Error(`invalid ${name} "${raw}" (want a non-negative integer)`);
  }
  return parseInt(v, 10);
}

export function readInputs(): Inputs {
  return {
    target: core.getInput('target') || '.',
    version: core.getInput('version') || 'latest',
    detectors: core.getInput('detectors'),
    strict: core.getBooleanInput('strict'),
    vulnScan: core.getBooleanInput('vuln-scan'),
    rulesRef: core.getInput('rules-ref'),
    rulesRepo: core.getInput('rules-repo'),
    uploadSarif: core.getBooleanInput('upload-sarif'),
    sarifFile: core.getInput('sarif-file') || 'trustabl.sarif',
    jsonFile: core.getInput('json-file') || 'trustabl.json',
    uploadArtifact: core.getBooleanInput('upload-artifact'),
    artifactName: core.getInput('artifact-name') || 'trustabl-scan-results',
    artifactRetentionDays: core.getInput('artifact-retention-days'),
    riskScoreThreshold: parseRiskThreshold(core.getInput('risk-score-threshold')),
    severityThreshold: parseSeverityThreshold(core.getInput('severity-threshold')),
    branch: core.getInput('branch'),
    commentOnPr: core.getBooleanInput('comment-on-pr'),
    annotations: core.getBooleanInput('annotations'),
    maxAnnotations: parsePositiveInt(core.getInput('max-annotations'), 10, 'max-annotations'),
    githubToken: core.getInput('github-token'),
  };
}
