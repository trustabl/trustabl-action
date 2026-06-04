// Repo-label + branch resolution. Pure helpers (take context primitives) so they
// unit-test without the Actions runtime. Replaces the bash branch/label logic
// from the v1 composite action (action.yml branch auto-detect + repo label).

const GH_URL = /^https?:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/;

// repoLabel resolves the human-facing repo label for the report. A GitHub URL
// target wins; otherwise the workflow's owner/repo; otherwise the raw target.
export function repoLabel(target: string, ownerRepo: string): string {
  const m = target.match(GH_URL);
  if (m) return m[1];
  if (ownerRepo) return ownerRepo;
  return target;
}

export function refToBranch(ref: string): string {
  if (ref.startsWith('refs/heads/')) return ref.slice('refs/heads/'.length);
  if (ref.startsWith('refs/tags/')) return ref.slice('refs/tags/'.length);
  return ref;
}

// resolveBranch: explicit input wins, then the PR source branch, then the
// push ref's short name, then "unknown".
export function resolveBranch(inputBranch: string, prHeadRef: string | undefined, ref: string): string {
  if (inputBranch.trim()) return inputBranch.trim();
  if (prHeadRef) return prHeadRef;
  return refToBranch(ref) || 'unknown';
}
