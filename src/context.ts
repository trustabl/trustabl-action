// Thin, typed view over @actions/github context for the surfaces that need it
// (SARIF upload, PR comment, branch/label resolution).
import * as github from '@actions/github';

export interface RunContext {
  eventName: string;
  owner: string;
  repo: string;
  // sha/ref are taken as the runner checked them out. For pull_request that is
  // the merge ref+sha (refs/pull/<n>/merge), which is exactly what the Code
  // Scanning upload API expects to pair together — do NOT mix head.sha with the
  // /merge ref or the upload is rejected as unreachable.
  sha: string;
  ref: string;
  prNumber?: number;
  prHeadRef?: string;
  isPullRequest: boolean;
  isFork: boolean;
}

export function getRunContext(): RunContext {
  const ctx = github.context;
  const isPullRequest =
    ctx.eventName === 'pull_request' || ctx.eventName === 'pull_request_target';
  // payload.pull_request is loosely typed (index signature); read defensively.
  const pr = ctx.payload.pull_request as
    | { number?: number; head?: any; base?: any }
    | undefined;

  let isFork = false;
  let prHeadRef: string | undefined;
  if (isPullRequest && pr) {
    prHeadRef = pr.head?.ref;
    const headRepo: string | undefined = pr.head?.repo?.full_name;
    const baseRepo: string | undefined = pr.base?.repo?.full_name;
    isFork = Boolean(headRepo && baseRepo && headRepo !== baseRepo);
  }

  return {
    eventName: ctx.eventName,
    owner: ctx.repo.owner,
    repo: ctx.repo.repo,
    sha: ctx.sha,
    ref: ctx.ref,
    prNumber: pr?.number,
    prHeadRef,
    isPullRequest,
    isFork,
  };
}
