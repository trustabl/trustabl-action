// Asset-name + checksum parsing for the trustabl release binary.
// Ported from the trustabl-vscode extension (src/assets.ts) — the proven,
// dependency-free logic that mirrors .goreleaser.yaml.

export interface AssetRef {
  name: string;
  isZip: boolean;
}

const OS_MAP: Record<string, string> = { darwin: 'darwin', linux: 'linux', win32: 'windows' };
const ARCH_MAP: Record<string, string> = { x64: 'amd64', arm64: 'arm64' };

// Mirrors .goreleaser.yaml: trustabl_<version>_<os>_<arch>.(tar.gz|zip).
// Windows is amd64-only; everything else has amd64 + arm64.
export function assetNameFor(platform: string, arch: string, version: string): AssetRef | null {
  const os = OS_MAP[platform];
  const goarch = ARCH_MAP[arch];
  if (!os || !goarch) return null;
  if (os === 'windows' && goarch !== 'amd64') return null;
  const v = version.replace(/^v/, '');
  const isZip = os === 'windows';
  const ext = isZip ? 'zip' : 'tar.gz';
  return { name: `trustabl_${v}_${os}_${goarch}.${ext}`, isZip };
}

// checksums.txt is `<sha256>  <filename>` (sha256sum format, two spaces).
export function parseChecksums(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of text.split('\n')) {
    const m = line.trim().match(/^([0-9a-fA-F]{64})\s+\*?(.+)$/);
    if (m) map.set(m[2].trim(), m[1].toLowerCase());
  }
  return map;
}
