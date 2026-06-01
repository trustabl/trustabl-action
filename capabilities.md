### Trustabl Actions — capabilities

- **Static reliability/safety scan** for agent-SDK repos (Claude Agent SDK,
  OpenAI Agents SDK, Google ADK, MCP) — runs the upstream `trustabl` binary
  over your checkout, no daemon or hosted service.
- **Composite + cross-platform** — `ubuntu-*`, `macos-*`, `windows-*` on
  x64/arm64; binary is tool-cached so reruns are fast.
- **Two machine outputs** — full JSON `ScanResult` and SARIF 2.1.0, uploaded as
  a downloadable artifact (Code Scanning upload is opt-in via `upload-sarif`).
- **CI gates** — fail the job on a `risk-score-threshold` and/or a
  `severity-threshold`; both independent, both default-off (zero-config = scan
  only).
- **Readiness panel** — colored score-bar report in the log and the run's Step
  Summary: current vs projected readiness, per-severity breakdown, and the
  fix-headroom ladder.
- **Step outputs for downstream** — `readiness-score`, `risk-score`,
  `max-severity`, `findings-count`, `exit-code`, plus file/artifact paths.
- **Zero-config** — minimum call is `uses: trustabl/actions@v0.2.0` after
  `actions/checkout`; every input has a sensible default.
