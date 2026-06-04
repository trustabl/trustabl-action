import { assetNameFor, parseChecksums } from './assets';

describe('assetNameFor', () => {
  it('builds tar.gz names for linux/macos', () => {
    expect(assetNameFor('linux', 'x64', '0.5.0')).toEqual({ name: 'trustabl_0.5.0_linux_amd64.tar.gz', isZip: false });
    expect(assetNameFor('darwin', 'arm64', 'v0.5.0')).toEqual({ name: 'trustabl_0.5.0_darwin_arm64.tar.gz', isZip: false });
  });
  it('builds a zip name for windows amd64', () => {
    expect(assetNameFor('win32', 'x64', '0.5.0')).toEqual({ name: 'trustabl_0.5.0_windows_amd64.zip', isZip: true });
  });
  it('rejects windows arm64 and unknown platforms/arches', () => {
    expect(assetNameFor('win32', 'arm64', '0.5.0')).toBeNull();
    expect(assetNameFor('aix', 'x64', '0.5.0')).toBeNull();
    expect(assetNameFor('linux', 'ppc64', '0.5.0')).toBeNull();
  });
});

describe('parseChecksums', () => {
  it('parses sha256sum lines, lowercasing and stripping a binary-mode asterisk', () => {
    const text = [
      'A'.repeat(64) + '  trustabl_0.5.0_linux_amd64.tar.gz',
      'b'.repeat(64) + ' *trustabl_0.5.0_windows_amd64.zip',
      'garbage line',
    ].join('\n');
    const m = parseChecksums(text);
    expect(m.get('trustabl_0.5.0_linux_amd64.tar.gz')).toBe('a'.repeat(64));
    expect(m.get('trustabl_0.5.0_windows_amd64.zip')).toBe('b'.repeat(64));
    expect(m.size).toBe(2);
  });
});
