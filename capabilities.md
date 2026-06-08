### Trustabl Action — capabilities

- **Static reliability/safety scan** for agent-SDK repos (Claude Agent SDK,
  OpenAI Agents SDK, Google ADK, MCP) — runs the upstream `trustabl` binary over
  your checkout, no daemon or hosted service.
- **Optional dependency CVE scan** (`vuln-scan: true`) — matches declared
  dependencies against a pinned OSV snapshot and reports known CVEs as findings,
  so they ride every surface (score, gate, annotations, Security tab) alongside a
  dependencies-scanned / known-vulnerabilities headline.
- **node24 TypeScript action, cross-platform** — `ubuntu-*`, `macos-*`,
  `windows-*` on x64/arm64; the binary is tool-cached so reruns are fast, and is
  **sha256-verified** against the release `checksums.txt` before it runs.
- **Inline PR annotations + GitHub Security tab** — findings are uploaded to Code
  Scanning (SARIF) so they appear on the changed lines and in the Security tab.
  Degrades to inline annotations when Code Scanning isn't available.
- **Sticky PR comment** — one summary comment (readiness, severity breakdown,
  headroom ladder) updated in place on each run.
- **CI gates** — fail the job on a `risk-score-threshold` and/or a
  `severity-threshold`; both independent, both default-off (zero-config = scan
  and report only). Gates fail closed on a broken scan.
- **Readiness panel** — score-bar report in the run log and the Step Summary:
  current vs projected readiness, per-severity breakdown, and the fix-headroom
  ladder (sourced from the engine, not recomputed).
- **Two machine outputs** — full JSON `ScanResult` and SARIF 2.1.0, attached as a
  downloadable artifact.
- **Step outputs for downstream** — `readiness-score`, `risk-score`,
  `max-severity`, `findings-count`, `exit-code`, `sarif-uploaded`, plus
  file/artifact paths.
- **Single scan** — when the engine supports it, JSON + SARIF come from one
  analysis pass (older engines fall back to two scans automatically).
- **Zero-config** — minimum call is `uses: trustabl/trustabl-action@v0` after
  `actions/checkout`; every input has a sensible default.
