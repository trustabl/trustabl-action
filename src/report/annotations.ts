// Inline annotations via @actions/core. On pull_request these render on the
// changed lines in the diff; on push they render on the run. Also the fallback
// channel when SARIF upload is unavailable. Capped and sorted worst-first.
import * as core from '@actions/core';
import { Finding, SEVERITY_RANK } from '../types';

export function emitAnnotations(findings: Finding[], max: number): void {
  const sorted = [...findings].sort(
    (a, b) => (SEVERITY_RANK[b.severity] ?? -1) - (SEVERITY_RANK[a.severity] ?? -1),
  );
  const shown = max > 0 ? sorted.slice(0, max) : sorted;

  for (const f of shown) {
    const props: core.AnnotationProperties = {
      title: `${f.rule_id}: ${f.title}`,
      file: f.file_path || undefined,
      startLine: f.line > 0 ? f.line : undefined,
    };
    const msg = f.explanation || f.title || f.rule_id;
    if (f.severity === 'critical' || f.severity === 'high') core.error(msg, props);
    else if (f.severity === 'medium') core.warning(msg, props);
    else core.notice(msg, props);
  }

  if (sorted.length > shown.length) {
    core.info(`… and ${sorted.length - shown.length} more findings (raise max-annotations to show all).`);
  }
}
