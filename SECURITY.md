# Security Policy

## Reporting a vulnerability

Report privately through GitHub, not in a public issue:

**[Open a private security advisory](https://github.com/trustabl/trustabl-action/security/advisories/new)**

Please do not open a public issue or pull request for a suspected vulnerability.

Include the version, the CI platform, and the smallest reproduction you have.
We will acknowledge the report, tell you whether it is in scope, and credit you
in the release notes unless you would rather we did not.

## Scope

This repository is a thin GitHub Action around the Trustabl CLI. It downloads the
upstream release binary, verifies it, runs a scan, and gates the build. The
scanner itself lives in
[trustabl/trustabl](https://github.com/trustabl/trustabl).

**In scope here**

- Credential handling: a token or secret reaching build logs, process
  arguments, or a file that outlives the job
- Weakening or bypassing the sha256 verification of the downloaded binary
- Fetching the binary or rules from an unintended source
- Anything that lets a scanned repository's contents influence the build beyond
  producing findings, such as command injection through a scanned path or
  configuration value

**Out of scope here**

- Detection accuracy. A missed finding or a false positive is a bug - open a
  normal issue
- Vulnerabilities in a repository you scanned. Those belong to that repository
- Defects in the scanner itself. Report those to
  [trustabl/trustabl](https://github.com/trustabl/trustabl/security/advisories/new) so one advisory covers every integration

## Supported versions

Fixes land on the latest release. Older versions are not patched - upgrade first.
