// Sticky PR comment: find the prior Trustabl comment by a hidden marker and
// update it, else create one — so re-runs update in place instead of stacking.
// pull_request events only; degrades to a warning on fork PRs (read-only token).
import * as core from '@actions/core';
import * as github from '@actions/github';
import { RunContext } from '../context';

const MARKER = '<!-- trustabl-scan -->';

export async function upsertComment(token: string, ctx: RunContext, body: string): Promise<void> {
  if (!ctx.isPullRequest || !ctx.prNumber) return;

  const octo = github.getOctokit(token);
  const fullBody = `${MARKER}\n${body}`;
  try {
    const { data: comments } = await octo.rest.issues.listComments({
      owner: ctx.owner,
      repo: ctx.repo,
      issue_number: ctx.prNumber,
      per_page: 100,
    });
    const existing = comments.find((c) => c.body?.startsWith(MARKER));
    if (existing) {
      await octo.rest.issues.updateComment({
        owner: ctx.owner,
        repo: ctx.repo,
        comment_id: existing.id,
        body: fullBody,
      });
    } else {
      await octo.rest.issues.createComment({
        owner: ctx.owner,
        repo: ctx.repo,
        issue_number: ctx.prNumber,
        body: fullBody,
      });
    }
  } catch (e) {
    const err = e as { status?: number; message?: string };
    if (err.status === 403) {
      core.warning('PR comment skipped: token lacks pull-requests: write (expected on fork PRs).');
    } else {
      core.warning(`PR comment failed: ${err.message ?? String(e)}`);
    }
  }
}
