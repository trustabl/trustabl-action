# Trustabl Actions

Reusable GitHub Actions that runs [trustabl](https://github.com/trustabl/trustabl),
the static reliability/safety analyzer for agent-SDK repos (Claude Agent SDK,
OpenAI Agents SDK, Google ADK, MCP). The action:

- Downloads the official `trustabl` release binary (counts toward the
  upstream repo's release download stats).
- Scans the caller's checkout for tools, agents, subagents, and MCP servers.
- Emits **SARIF** (upload to Code Scanning currently disabled by default —
  upstream trustabl SARIF is rejected by the Code Scanning schema validator
  due to a missing `artifactChanges` field on `fixes[]`; opt in with
  `upload-sarif: true` once that's fixed).
- Emits the **full JSON `ScanResult`** and uploads it as a downloadable
  workflow artifact — this is the primary output for now.
- Optionally fails the job on a **risk-score** or **severity** threshold.
- Prints a colored pass/fail line in the log and a result table in the
  run's Step Summary.

## Quick start

```yaml
name: Trustabl
on: [push, pull_request]

permissions:
  contents: read
  security-events: write  # only required when upload-sarif: true

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: trustabl/actions@v0.1.1
```

That's it. With zero config the action scans the checkout, uploads the SARIF
to Code Scanning, attaches `trustabl.json` + `trustabl.sarif` as an artifact
named `trustabl-scan-results`, and only fails the job if `trustabl` itself
flags a medium-or-higher finding.

## Pinned + gated

```yaml
- uses: trustabl/actions@v0.1.1
  with:
    version: v0.5.0
    detectors: claude_sdk,openai_sdk
    severity-threshold: high       # fail on any high or critical finding
    risk-score-threshold: 70       # fail if risk (100 - score) >= 70
    artifact-retention-days: "30"
```

## Inputs

| Name | Default | Description |
|---|---|---|
| `target` | `.` | Path or GitHub URL to scan. |
| `version` | `latest` | trustabl release tag (e.g. `v0.5.0`) or `latest`. |
| `detectors` | _(all)_ | Comma-separated subset: `claude_sdk,openai_sdk,google_adk`. |
| `strict` | `false` | Pass `--strict` to trustabl (fail on any finding). |
| `rules-ref` | _(default)_ | Pin a `trustabl-rules` git ref. |
| `rules-repo` | _(default)_ | Override `trustabl-rules` source repo. |
| `upload-sarif` | `false` | Call `github/codeql-action/upload-sarif@v4`. Default off — trustabl's current SARIF is rejected by Code Scanning (missing `artifactChanges` on `fixes[]`). Flip on once upstream is fixed. |
| `sarif-file` | `trustabl.sarif` | SARIF output path. |
| `json-file` | `trustabl.json` | JSON ScanResult output path. |
| `upload-artifact` | `true` | Upload JSON + SARIF as a workflow artifact. |
| `artifact-name` | `trustabl-scan-results` | Artifact name. |
| `artifact-retention-days` | _(repo default)_ | Days to keep the artifact (1-90). |
| `risk-score-threshold` | `0` | Fail when `risk >= N` (1-100). `0` disables. |
| `severity-threshold` | `none` | Fail when any finding `>= severity`. One of `none`, `low`, `medium`, `high`, `critical`. |
| `branch` | _(auto)_ | SARIF category label. Auto-detects `main` → `master` → HEAD. |

## Outputs

| Name | Description |
|---|---|
| `exit-code` | trustabl's native exit code (0 / 1 / 2). |
| `readiness-score` | Integer percent [0, 100], higher = better. Scaled from trustabl's `overall_score` (float [0.0, 1.0]). |
| `risk-score` | `100 - readiness-score`. Integer [0, 100], higher = worse. |
| `max-severity` | Highest severity among findings, or `none`. |
| `findings-count` | Total finding count. |
| `sarif-file` | Path to the emitted SARIF file. |
| `json-file` | Path to the emitted JSON file. |
| `artifact-name` | Artifact name used for the upload. |

## Downloading the scan result

After a workflow run, open the run page and find the **`trustabl-scan-results`**
artifact in the "Artifacts" section. It contains:

- `trustabl.json` — full machine-readable `ScanResult` (findings, inventory,
  readiness, rules version, scan ID).
- `trustabl.sarif` — SARIF 2.1.0 for any downstream SARIF consumer.

You can also pull it from another job in the same run:

```yaml
- uses: actions/download-artifact@v4
  with:
    name: trustabl-scan-results
```

## Notes

- Runs on `ubuntu-*`, `macos-*`, and `windows-*` runners.
- Requires `permissions: security-events: write` when `upload-sarif: true`.
- Binary downloads via `gh release download`, which increments the
  `trustabl/trustabl` release asset download counter.
