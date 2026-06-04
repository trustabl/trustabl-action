// Resolve, download, checksum-verify, extract, and cache the trustabl binary
// via @actions/tool-cache, then probe its capabilities. Replaces the v1 bash
// `gh release download` install — and adds the sha256 verification the v1 action
// lacked (matching the trustabl-vscode extension's verified download).
import * as fs from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import * as github from '@actions/github';
import * as tc from '@actions/tool-cache';
import { assetNameFor, parseChecksums } from './assets';
import { sha256File } from './hash';
import { parseVersion, gte } from './version';
import { runProcess } from './process';

const RELEASE_OWNER = 'trustabl';
const RELEASE_REPO = 'trustabl';
const RELEASE_BASE = 'https://github.com/trustabl/trustabl/releases/download';

// MIN_ENGINE_VERSION is the engine release that ships --json-out/--sarif-out, the
// Code-Scanning-valid SARIF (no fixes[]), and projected_scores. Older binaries
// still work via the two-scan fallback (single-scan + headroom ladder disabled);
// we only emit a soft upgrade warning, never a hard failure.
// TODO(owner): set to the engine release tag cut with those changes.
export const MIN_ENGINE_VERSION = '0.0.0';

export interface Capabilities {
  fileOut: boolean; // engine supports --json-out / --sarif-out (single-scan dual output)
}

export interface Installed {
  binPath: string;
  version: string;
  capabilities: Capabilities;
}

function binName(): string {
  return process.platform === 'win32' ? 'trustabl.exe' : 'trustabl';
}

export async function resolveTrustabl(token: string, requested: string): Promise<Installed> {
  const version = await resolveVersion(token, requested);
  const v = version.replace(/^v/, '');

  let dir = tc.find('trustabl', v);
  if (!dir) {
    dir = await downloadVerifyExtract(v);
  } else {
    core.info(`Using cached trustabl ${v}`);
  }
  core.addPath(dir);

  const binPath = path.join(dir, binName());
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(binPath, 0o755);
    } catch {
      /* best effort — cacheDir usually preserves the mode */
    }
  }

  const capabilities = await probeCapabilities(binPath);
  const have = await binaryVersion(binPath);
  if (have && !gte(have, MIN_ENGINE_VERSION)) {
    core.warning(
      `trustabl ${have} is older than the recommended ${MIN_ENGINE_VERSION}; ` +
        `single-scan dual output, the headroom ladder, and Code-Scanning-valid SARIF ` +
        `may be unavailable. Use 'version: latest' or pin a newer release.`,
    );
  }

  return { binPath, version: have ?? version, capabilities };
}

async function resolveVersion(token: string, requested: string): Promise<string> {
  if (requested && requested !== 'latest') return requested;
  const octo = github.getOctokit(token);
  const rel = await octo.rest.repos.getLatestRelease({ owner: RELEASE_OWNER, repo: RELEASE_REPO });
  return rel.data.tag_name;
}

async function downloadVerifyExtract(v: string): Promise<string> {
  const asset = assetNameFor(process.platform, process.arch, v);
  if (!asset) {
    throw new Error(
      `no trustabl release asset for ${process.platform}/${process.arch} (v${v}); ` +
        `supported: linux/macos amd64+arm64, windows amd64`,
    );
  }
  const assetUrl = `${RELEASE_BASE}/v${v}/${asset.name}`;
  const checksumsUrl = `${RELEASE_BASE}/v${v}/checksums.txt`;

  core.info(`Downloading ${asset.name} …`);
  const archivePath = await tc.downloadTool(assetUrl);

  // Verify sha256 against the release's checksums.txt before trusting the binary.
  const checksumsPath = await tc.downloadTool(checksumsUrl);
  const checksums = parseChecksums(fs.readFileSync(checksumsPath, 'utf8'));
  const expected = checksums.get(asset.name);
  const actual = await sha256File(archivePath);
  if (!expected || expected !== actual) {
    throw new Error(`checksum mismatch for ${asset.name} (expected ${expected ?? 'none'}, got ${actual})`);
  }

  const extracted = asset.isZip ? await tc.extractZip(archivePath) : await tc.extractTar(archivePath);
  if (!fs.existsSync(path.join(extracted, binName()))) {
    throw new Error(`trustabl binary not found inside ${asset.name} after extraction`);
  }
  return tc.cacheDir(extracted, 'trustabl', v);
}

async function probeCapabilities(binPath: string): Promise<Capabilities> {
  const r = await runProcess(binPath, ['scan', '--help'], { cwd: process.cwd(), timeoutMs: 15000 });
  const help = r.kind === 'exit' || r.kind === 'timeout' ? r.stdout + r.stderr : '';
  return { fileOut: help.includes('--json-out') && help.includes('--sarif-out') };
}

async function binaryVersion(binPath: string): Promise<string | null> {
  const r = await runProcess(binPath, ['version'], { cwd: process.cwd(), timeoutMs: 15000 });
  if (r.kind !== 'exit') return null;
  return parseVersion(r.stdout);
}
