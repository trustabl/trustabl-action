// Version parsing + comparison. Ported from trustabl-vscode (src/version.ts),
// extended with a numeric semver compare so the action can soft-warn when the
// installed engine predates a capability (MIN_ENGINE_VERSION).

export function parseVersion(output: string): string | null {
  const m = output.match(/Trustabl\s+(\S+)/i);
  return m ? m[1] : null;
}

// compareVersions returns <0, 0, >0 comparing MAJOR.MINOR.PATCH numerically.
// Leading "v" is stripped; pre-release/build suffixes are ignored (best-effort —
// this only drives a soft warning, never a hard gate).
export function compareVersions(a: string, b: string): number {
  const parse = (s: string) =>
    s.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

export function gte(have: string, min: string): boolean {
  return compareVersions(have, min) >= 0;
}
