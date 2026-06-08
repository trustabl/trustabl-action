<p align="center">
  <img src="assets/github_banner.jpg" alt="Trustabl — open-source tooling for production-ready agentic tools" width="100%">
</p>

# Trustabl Action

A GitHub Action that runs [trustabl](https://github.com/trustabl/trustabl) — the
static reliability/safety analyzer for agent-SDK repos (Claude Agent SDK, OpenAI
Agents SDK, Google ADK, MCP) — and surfaces the results where you work:

- **Inline PR annotations + the Security tab.** Findings are uploaded to GitHub
  Code Scanning, so they appear on the changed lines in the PR diff and in the
  repository's Security tab.
- **A sticky PR comment** with the readiness score, severity breakdown, and a
  fix-headroom ladder — updated in place on each run.
- **Status-check gating.** Optionally fail the job on a risk-score or severity
  threshold so it can be a required check.
- **A readiness panel** in the run log and the Step Summary.
- **Optional dependency CVE scan** (`vuln-scan: true`) — matches your declared
  dependencies against a pinned OSV snapshot and reports known CVEs as findings,
  so they appear on every surface (score, gate, annotations, Security tab).

It downloads the official `trustabl` release binary (sha256-verified against the
release `checksums.txt`), tool-caches it, scans your checkout, and reports.

## Quick start

```yaml
name: Trustabl
on: [push, pull_request]

permissions:
  contents: read
  security-events: write   # SARIF → Security tab + inline PR alerts
  pull-requests: write     # sticky PR comment

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: trustabl/trustabl-action@v0
```

With zero config the action scans the checkout, posts findings to the Security
tab and (on PRs) as a sticky comment + inline annotations, attaches
`trustabl.json` + `trustabl.sarif` as an artifact, and fails the job only if
`trustabl` itself flags a medium-or-higher finding.

> **Permissions.** `security-events: write` enables the Security tab upload;
> `pull-requests: write` enables the comment. If you omit either, the action
> degrades gracefully — it warns and falls back to inline annotations + the Step
> Summary, and never fails solely because a surface was unavailable. On fork PRs
> the token is read-only, so the upload and comment are skipped automatically.

## Annotated example

```yaml
name: Trustabl
on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read
  security-events: write
  pull-requests: write

jobs:
  scan:
    runs-on: ubuntu-latest            # also works on macos-* / windows-*
    steps:
      - uses: actions/checkout@v4     # REQUIRED first — the action scans your checkout
      - uses: trustabl/trustabl-action@v0
        with:                         # every input is optional
          # detectors: openai_sdk           # limit SDKs: claude_sdk,openai_sdk,google_adk,openshell
          # version: latest                 # trustabl release to run; pin e.g. v0.5.0 for reproducible CI
          # vuln-scan: true                 # also scan dependencies for known CVEs (OSV)
          # severity-threshold: high        # fail if any finding >= level (none|low|medium|high|critical)
          # risk-score-threshold: 70        # fail if risk (100 - readiness) >= N (0 disables)
          # comment-on-pr: true             # sticky PR summary comment
          # annotations: true               # inline annotations
          # upload-sarif: true              # Security tab upload
          # upload-artifact: true           # attach trustabl.json + trustabl.sarif
```

## Pinned + gated

```yaml
- uses: trustabl/trustabl-action@v0.3.0
  with:
    version: v0.5.0
    detectors: claude_sdk,openai_sdk
    severity-threshold: high       # fail on any high or critical finding
    risk-score-threshold: 70       # fail if risk (100 - readiness) >= 70
    artifact-retention-days: "30"
```

## Inputs

| Name | Default | Description |
|---|---|---|
| `target` | `.` | Path or GitHub URL to scan. |
| `version` | `latest` | trustabl release tag (e.g. `v0.5.0`) or `latest`. |
| `detectors` | _(all)_ | Comma-separated subset: `claude_sdk,openai_sdk,google_adk,openshell`. |
| `strict` | `false` | Pass `--strict` (fail on any finding). |
| `vuln-scan` | `false` | Match dependencies against a pinned OSV snapshot; report known CVEs as findings. |
| `rules-ref` | _(default)_ | Pin a `trustabl-rules` git ref. |
| `rules-repo` | _(default)_ | Override the `trustabl-rules` source repo. |
| `upload-sarif` | `true` | Upload SARIF to Code Scanning. Needs `security-events: write`. |
| `sarif-file` | `trustabl.sarif` | SARIF output path. |
| `json-file` | `trustabl.json` | JSON `ScanResult` output path. |
| `upload-artifact` | `true` | Attach JSON + SARIF as a workflow artifact. |
| `artifact-name` | `trustabl-scan-results` | Artifact name. |
| `artifact-retention-days` | _(repo default)_ | Days to keep the artifact (1-90). |
| `comment-on-pr` | `true` | Sticky PR summary comment. Needs `pull-requests: write`. |
| `annotations` | `true` | Emit inline annotations for findings. |
| `max-annotations` | `10` | Max inline annotations (worst-severity first). |
| `risk-score-threshold` | `0` | Fail when `risk >= N` (0 disables). |
| `severity-threshold` | `none` | Fail when any finding `>= severity` (`none`/`low`/`medium`/`high`/`critical`). |
| `branch` | _(auto)_ | Report branch label; auto-detected from the checkout. |
| `github-token` | `${{ github.token }}` | Token for release lookup, SARIF upload, and PR comments. |

## Outputs

| Name | Description |
|---|---|
| `exit-code` | trustabl native exit code (0 / 1 / 2). |
| `readiness-score` | Integer percent [0, 100], higher = better. |
| `risk-score` | `100 - readiness-score`. |
| `max-severity` | Highest severity among findings, or `none`. |
| `findings-count` | Total finding count. |
| `sarif-uploaded` | Whether Code Scanning accepted the SARIF (`true`/`false`). |
| `sarif-file` | Path to the emitted SARIF file. |
| `json-file` | Path to the emitted JSON file. |
| `artifact-name` | Artifact name used for the upload. |

## How it works

- **Verified install.** The release asset for the runner's OS/arch is downloaded
  and its sha256 checked against the release `checksums.txt` before it runs, then
  tool-cached so reruns skip the download.
- **Single scan.** When the installed engine supports `--json-out`/`--sarif-out`,
  one analysis pass produces both artifacts. Older engines fall back to two scans
  automatically (and the headroom ladder is hidden, since it needs the engine's
  `projected_scores`). Use `version: latest` to get the fast path.
- **Honest gating.** A failed or empty scan errors the job rather than reporting a
  clean score. The gate decision is exit-code/threshold-based, surfaced in the
  Step Summary and the PR comment.

## Downloading the scan result

After a run, open the run page and find the **`trustabl-scan-results`** artifact:

- `trustabl.json` — full machine-readable `ScanResult`.
- `trustabl.sarif` — SARIF 2.1.0.

```yaml
- uses: actions/download-artifact@v4
  with:
    name: trustabl-scan-results
```

## Versioning

- Pin a release: `uses: trustabl/trustabl-action@v0.3.0`.
- Or track the line: `uses: trustabl/trustabl-action@v0` (the moving major tag).

## Notes

- Runs on `ubuntu-*`, `macos-*`, and `windows-*` runners (x64/arm64; Windows is
  amd64-only, matching the trustabl release matrix).
- `actions/checkout` must run first — the action scans your checkout.
- `security-events: write` is required for the Security tab upload;
  `pull-requests: write` for the sticky comment. Both degrade gracefully if absent.

## Development

This is a node20 TypeScript action bundled to `dist/` with
[`ncc`](https://github.com/vercel/ncc).

```bash
npm ci
npm run typecheck   # tsc --noEmit
npm test            # jest unit tests
npm run build       # bundle to dist/index.js (commit the result)
npm run all         # all of the above
```

`dist/` is committed because a node20 action runs `dist/index.js` directly from
the consumer's checkout of the release tag. The **Build check** workflow fails a
PR whose `dist/` is stale, so always `npm run build` and commit after changing
`src/`.
