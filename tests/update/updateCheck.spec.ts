import { describe, expect, it } from 'vitest';

import {
  LATEST_RELEASE_API,
  RELEASES_PAGE,
  checkForUpdate,
  compareVersions,
  parseLatestRelease,
} from '@main/update/updateCheck';

const fakeFetch = (status: number, body: unknown): typeof fetch =>
  (async () => ({ ok: status >= 200 && status < 300, status, json: async () => body })) as unknown as typeof fetch;

describe('compareVersions', () => {
  it('compares numerically per segment and ignores v / pre-release suffixes', () => {
    expect(compareVersions('1.2.0', '1.10.0')).toBe(-1);
    expect(compareVersions('v0.2.0', '0.2.0')).toBe(0);
    expect(compareVersions('0.2', '0.2.0')).toBe(0);
    expect(compareVersions('1.0.0-beta', '0.9.9')).toBe(1);
    expect(compareVersions('0.0.1', '0.1.0')).toBe(-1);
  });
});

describe('parseLatestRelease', () => {
  it('reads tag_name and html_url, rejects junk', () => {
    expect(parseLatestRelease({ tag_name: 'v0.2.0', html_url: 'https://x/y' })).toEqual({ version: '0.2.0', url: 'https://x/y' });
    expect(parseLatestRelease({ tag_name: '0.3.1' })).toEqual({ version: '0.3.1', url: RELEASES_PAGE });
    expect(parseLatestRelease({ tag_name: 'nightly' })).toBe(null);
    expect(parseLatestRelease(null)).toBe(null);
  });
});

describe('checkForUpdate', () => {
  const clock = () => new Date('2026-09-17T10:00:00.000Z');

  it('flags a newer release with its page', async () => {
    const r = await checkForUpdate({ currentVersion: '0.1.0', clock, fetchImpl: fakeFetch(200, { tag_name: 'v0.2.0', html_url: 'https://github.com/danish-deepskill/clapp/releases/tag/v0.2.0' }) });
    expect(r).toMatchObject({ currentVersion: '0.1.0', latestVersion: '0.2.0', isNewer: true, error: null });
    expect(r.releaseUrl).toContain('/releases/tag/v0.2.0');
    expect(r.checkedAt).toBe('2026-09-17T10:00:00.000Z');
  });

  it('is quiet when already current or ahead', async () => {
    expect((await checkForUpdate({ currentVersion: '0.2.0', clock, fetchImpl: fakeFetch(200, { tag_name: 'v0.2.0' }) })).isNewer).toBe(false);
    expect((await checkForUpdate({ currentVersion: '0.3.0', clock, fetchImpl: fakeFetch(200, { tag_name: 'v0.2.0' }) })).isNewer).toBe(false);
  });

  it('reports errors instead of throwing: HTTP failure, no release, offline', async () => {
    expect((await checkForUpdate({ currentVersion: '0.1.0', clock, fetchImpl: fakeFetch(404, {}) })).error).toMatch(/404/);
    expect((await checkForUpdate({ currentVersion: '0.1.0', clock, fetchImpl: fakeFetch(200, { message: 'Not Found' }) })).error).toMatch(/Belum ada rilis/);
    const offline = (async () => { throw new TypeError('fetch failed'); }) as unknown as typeof fetch;
    const r = await checkForUpdate({ currentVersion: '0.1.0', clock, fetchImpl: offline });
    expect(r.isNewer).toBe(false);
    expect(r.error).toBe('fetch failed');
  });

  it('points at this repository', () => {
    expect(LATEST_RELEASE_API).toBe('https://api.github.com/repos/danish-deepskill/clapp/releases/latest');
  });
});
