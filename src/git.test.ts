import { repoLabel, refToBranch, resolveBranch, isRemoteTarget } from './git';

describe('isRemoteTarget', () => {
  it('detects http(s) URLs (trimmed)', () => {
    expect(isRemoteTarget('https://github.com/o/r')).toBe(true);
    expect(isRemoteTarget('http://example.com/x')).toBe(true);
    expect(isRemoteTarget('  https://github.com/o/r  ')).toBe(true);
  });
  it('treats local paths and empty as not remote', () => {
    expect(isRemoteTarget('.')).toBe(false);
    expect(isRemoteTarget('./sub/dir')).toBe(false);
    expect(isRemoteTarget('/abs/path')).toBe(false);
    expect(isRemoteTarget('')).toBe(false);
  });
});

describe('repoLabel', () => {
  it('extracts owner/repo from a GitHub URL, stripping .git and trailing slash', () => {
    expect(repoLabel('https://github.com/openai/openai-agents-python', 'a/b')).toBe('openai/openai-agents-python');
    expect(repoLabel('https://github.com/o/r.git', 'a/b')).toBe('o/r');
    expect(repoLabel('https://github.com/o/r/', 'a/b')).toBe('o/r');
  });
  it('falls back to the workflow owner/repo, then the raw target', () => {
    expect(repoLabel('.', 'acme/widgets')).toBe('acme/widgets');
    expect(repoLabel('./some/path', '')).toBe('./some/path');
  });
});

describe('refToBranch', () => {
  it('strips refs/heads and refs/tags', () => {
    expect(refToBranch('refs/heads/main')).toBe('main');
    expect(refToBranch('refs/heads/feature/x')).toBe('feature/x');
    expect(refToBranch('refs/tags/v1.0.0')).toBe('v1.0.0');
  });
  it('passes through anything else', () => {
    expect(refToBranch('refs/pull/12/merge')).toBe('refs/pull/12/merge');
  });
});

describe('resolveBranch', () => {
  it('prefers the explicit input', () => {
    expect(resolveBranch('develop', 'feature', 'refs/heads/main')).toBe('develop');
  });
  it('then the PR head ref', () => {
    expect(resolveBranch('', 'feature/login', 'refs/pull/9/merge')).toBe('feature/login');
  });
  it('then the push ref short name', () => {
    expect(resolveBranch('', undefined, 'refs/heads/main')).toBe('main');
  });
  it('falls back to unknown', () => {
    expect(resolveBranch('', undefined, '')).toBe('unknown');
  });
});
