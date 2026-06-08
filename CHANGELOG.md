# Changelog

All notable changes to this Action are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.3.0] — 2026-06-09

Tracks trustabl engine **v0.1.4**: consumes the new finding line-range shape and
adds an opt-in dependency CVE scan.

### Added

- **`vuln-scan` input** (default `false`). Passes `--vuln-scan`, so trustabl matches
  declared dependencies against a pinned OSV snapshot and reports known CVEs. Each
  match is a finding, so it flows through the readiness score, gating, inline
  annotations, and the Security tab like any other — plus a dependency headline
  (dependencies scanned / known vulnerabilities) in the console panel, Step
  Summary, and PR comment.

### Changed

- **Finding line ranges.** The action reads the engine's `start_line`/`end_line`
  (engine ≥ v0.1.4) and renders multi-line inline annotations across the finding's
  full span. The legacy single `line` field is still read as a fallback, so the
  action stays correct against older pinned engines.
- **`skill` scope** added to the typed scope / surface-kind unions, matching the
  engine's five detection scopes (tool, agent, subagent, skill, repo).
- **`MIN_ENGINE_VERSION` is now `v0.1.3`** (previously an unset placeholder) — the
  release that introduced single-scan dual output, Code-Scanning-valid SARIF, and
  the projected-scores headroom ladder. Older engines still run via the two-scan
  fallback with a soft upgrade warning.

### Fixed

- **Inline annotations no longer collapse to the top of the file** against engine
  v0.1.4. The engine renamed the finding `line` field to `start_line`/`end_line`;
  the action still read `line`, so each annotation lost its line number. It now
  resolves the range from either shape.


## [0.2.0] — 2026-06-04

A full rewrite from the bash composite action to a **node20 TypeScript action**,
adding native pull-request surfaces plus correctness and security fixes.

### Added

- **Inline PR annotations + GitHub Security tab.** SARIF is uploaded to Code
  Scanning via the API, so findings appear on the changed lines in the PR diff
  and in the Security tab. `upload-sarif` now defaults to **true** (requires
  `permissions: security-events: write`). Unblocked by the upstream SARIF fix:
  the per-result `fixes[]` (which lacked the `artifactChanges` the Code Scanning
  validator requires) was removed; the suggested fix is carried at the rule level.
- **Sticky PR summary comment** with the readiness score, finding counts, and
  headroom ladder — updated in place on each run (`comment-on-pr`, default true;
  requires `permissions: pull-requests: write`).
- **Inline annotations** for the most severe findings (`annotations`,
  `max-annotations`) — also the fallback when Code Scanning is unavailable.
- New inputs: `comment-on-pr`, `annotations`, `max-annotations`, `github-token`.
  New output: `sarif-uploaded`.

### Changed

- **Now a node20 TypeScript action** (`runs.using: node20`), bundled to
  `dist/index.js`. All inputs and the eight existing outputs are preserved.
- **Single scan.** When the engine supports `--json-out` / `--sarif-out`, both
  artifacts come from one analysis pass (the v1 action scanned twice). Older
  engines fall back to the two-scan path automatically.
- **Headroom ladder is now sourced from the engine** (`projected_scores` in the
  JSON) — the single source of truth — replacing the in-action jq
  reimplementation, which read the wrong field and used `min` instead of the real
  weighted mean (so it silently always showed 100). Hidden on engines that don't
  emit it.

### Fixed

- **Threshold gates no longer fail open.** A failed/empty scan now errors instead
  of silently scoring a clean 100 and passing the risk/severity gates.
- **Binary integrity is verified.** The downloaded release is checked against the
  release `checksums.txt` (sha256) before execution — the v1 action ran it
  unverified.
- **No shell-injection surface.** Inputs are read via the toolkit, never spliced
  into a `run:` block through `${{ }}`.

### Migration

- Grant the new permissions as needed: `security-events: write` (Security tab),
  `pull-requests: write` (sticky comment). Without them the action degrades to
  annotations + Step Summary and warns; it does not fail.
- Pin `@v0.2.0`, or use the moving `@v0` tag to stay current.


## [0.1.2] — 2026-06-01

### Added

- **Readiness score-bar panel.** The console box and the Step Summary now lead
  with bar gauges: current readiness vs a **projected** readiness — what the
  score would be if findings are resolved — computed from the single scan with
  **no second run**. The projection re-applies trustabl's own scoring
  (per-finding `severityWeight × confidence`, per-tool `max(0, 1 − weighted/3)`,
  overall = `min` across tools), so the number matches what a real re-scan
  would produce.
- **Per-severity breakdown.** Finding counts for `critical / high / medium /
  low / info`, each with a bar scaled to the largest bucket and tinted by
  severity.
- **Projected headroom ladder.** A cumulative per-severity projection —
  fix critical → +high → +medium → +low → +info — each row showing
  `before → after (+Δ)`, so you can see which severity tier actually unlocks
  the score.

### Changed

- Console box and Step Summary restyled around the score bars and the ladder.
  The raw metric table (repository, branch, readiness, risk, findings,
  max-severity, native exit) is retained below the panel.
- The console box frame is now ASCII (`+ - |`) instead of Unicode box-drawing.
  Long runs of 3-byte box glyphs on the divider lines were being split
  mid-character by log viewers that buffer on byte boundaries, surfacing as
  U+FFFD (�); ASCII is 1 byte/column and immune. Row separators are colored to
  match the frame.

### Fixed

- **CRLF in jq output on Windows runners.** Projection values read from `jq`
  are stripped of `\r`, so a trailing carriage return can no longer break the
  `$(( ))` arithmetic on Windows.

### Notes

- Projected scores are an **estimate**, not a re-scan: each resolved finding is
  assumed removed cleanly with nothing new introduced, and trustabl's
  confidence inputs are heuristic — treat the numbers as guidance. "Projected
  all" is the ceiling (≈100 whenever any findings exist); the ladder and the
  severity breakdown carry the actionable detail.

## [0.1.1] — 2026-05-27

### Fixed

- **Branch resolution for remote URL targets.** When `target` was a
  `https://github.com/OWNER/NAME` URL (rather than a local path), the
  branch row in the summary box showed `unknown` because the resolver
  only inspected local checkouts. The resolver now queries the
  GitHub REST API (`gh api repos/OWNER/NAME --jq .default_branch`)
  using the runner's `${{ github.token }}` and surfaces the remote's
  default branch (the branch trustabl actually clones and scans).
  Local-path targets still prefer `main` → `master` → HEAD; `unknown`
  remains the documented last-resort.

## [0.1.0] — 2026-05-26

First Marketplace release (0.x = pre-stable; pin to `@v0.1.0`, not a
sliding `@v0` tag — minor bumps may carry breaking changes until 1.0.0). Reusable composite Action that runs the
[trustabl](https://github.com/trustabl/trustabl) static analyzer against any
agent-SDK repository (Claude Agent SDK, OpenAI Agents SDK, Google ADK, MCP)
and gates the pipeline on readiness, risk, or severity thresholds.

### Added

- **Composite Action** — works on `ubuntu-*`, `macos-*`, and `windows-*`
  runners across `x64` and `arm64`. Linux-only Docker actions skipped on
  purpose; binary download path is faster on warm runners.
- **Binary install via `gh release download`** — hits the REST asset
  endpoint with `Accept: application/octet-stream`, the documented path
  that increments the per-asset `download_count` on `trustabl/trustabl`
  Releases. Authenticated with the runner's `${{ github.token }}` so
  unauthenticated rate limits do not apply.
- **Version pinning** — `version: latest` (default) resolves the newest
  tag at run time; pin to an exact tag (e.g. `v0.5.0`) for reproducible
  CI.
- **JSON ScanResult artifact** — primary output. The full machine-readable
  `ScanResult` (findings, inventory, readiness, rules version, scan ID) is
  written to `trustabl.json` and uploaded as a workflow artifact named
  `trustabl-scan-results`. Configurable via `upload-artifact`,
  `artifact-name`, `artifact-retention-days`.
- **SARIF 2.1.0 output** — written to `trustabl.sarif`. Upload to GitHub
  Code Scanning is **opt-in** (`upload-sarif: true`) and uses
  `github/codeql-action/upload-sarif@v4`.
- **Readiness-score gate** — `risk-score-threshold` (1–100) fails the job
  when the computed risk (`100 - readiness`) is at or above the
  threshold. `0` disables.
- **Severity gate** — `severity-threshold` fails the job when any finding
  meets or exceeds the configured level (`low` / `medium` / `high` /
  `critical`). `none` disables.
- **Branch + repo auto-detection** — `branch` resolves from the target's
  refs (prefers `main`, then `master`, then HEAD); `Repository` is parsed
  from the target URL, the local git remote, or falls back to
  `${{ github.repository }}`. Both surface in the report and the SARIF
  category.
- **Colored Unicode console report** — a single box-drawn summary table
  with per-cell coloring (green / yellow / red by score; severity-tinted
  max-severity cell; bold pass/fail badge).
- **GitHub Step Summary** — markdown table mirroring the console report,
  plus a gate-by-gate failure breakdown when a threshold trips.
- **Outputs** — `readiness-score`, `risk-score`, `max-severity`,
  `findings-count`, `exit-code`, `sarif-file`, `json-file`,
  `artifact-name` for downstream steps.
- **Zero-config defaults** — minimum call is
  `uses: trustabl/trustabl-action@v0.1.0` after `actions/checkout`. Every input has a
  sensible default.
- **`.gitignore`** — excludes Claude / agent tooling artifacts
  (`CLAUDE.md`, `.claude/`, `.anthropic/`) and local scan outputs
  (`*.sarif`, `trustabl.json`).
- **Selftest workflow** — `.github/workflows/selftest.yml` exercises the
  action against a known agent-SDK target and against the host repo
  itself, runnable locally via [`act`](https://github.com/nektos/act)
  without a `git push`.

### Fixed

- **Score scaling** — trustabl's JSON `overall_score` is a float in
  `[0.0, 1.0]`; the action now multiplies by 100 and rounds to an
  integer percent in `[0, 100]`, so `risk-score-threshold` and the
  display match user expectations. Previously, thresholds in the
  intended 0–100 range silently never fired because the raw `0.85`
  could not exceed `70`.

### Known issues

- **Upstream SARIF schema mismatch.** Trustabl currently emits `fixes[]`
  entries without the required `artifactChanges` property, which
  GitHub's Code Scanning schema validator rejects. `upload-sarif`
  defaults to `false` for that reason. The SARIF file is still
  generated and bundled in the artifact for offline tooling. Flip
  `upload-sarif: true` once
  [upstream](https://github.com/trustabl/trustabl) is patched.

### Compatibility

- Requires `actions/checkout` to have run first (no implicit checkout).
- Requires `permissions: security-events: write` **only** when
  `upload-sarif: true`.
- Runs on GitHub-hosted and self-hosted runners. Self-hosted runners
  need `gh`, `jq`, `curl`, `tar` (and `unzip` on Windows) available on
  PATH.

[0.2.0]: https://github.com/trustabl/trustabl-action/releases/tag/v0.2.0
[0.1.2]: https://github.com/trustabl/trustabl-action/releases/tag/v0.1.2
[0.1.1]: https://github.com/trustabl/trustabl-action/releases/tag/v0.1.1
[0.1.0]: https://github.com/trustabl/trustabl-action/releases/tag/v0.1.0
