import type { UpdateInfo } from '../../shared/update';

export const REPO = 'danish-deepskill/clapp';
export const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`;
export const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;

/** Numeric dotted compare; a leading "v" and any pre-release suffix are ignored. */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) =>
    v
      .trim()
      .replace(/^v/i, '')
      .split(/[-+]/)[0]!
      .split('.')
      .map((x) => Number.parseInt(x, 10) || 0);
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** GitHub "latest release" payload → version + page, or null when unusable. */
export function parseLatestRelease(body: unknown): { version: string; url: string } | null {
  if (!body || typeof body !== 'object') return null;
  const tag = (body as { tag_name?: unknown }).tag_name;
  const url = (body as { html_url?: unknown }).html_url;
  if (typeof tag !== 'string' || !/^v?\d+(\.\d+)*/.test(tag)) return null;
  return { version: tag.replace(/^v/i, ''), url: typeof url === 'string' ? url : RELEASES_PAGE };
}

export interface UpdateCheckDeps {
  currentVersion: string;
  fetchImpl?: typeof fetch;
  apiUrl?: string;
  timeoutMs?: number;
  clock?: () => Date;
}

/** Never throws: an offline machine simply reports `error` and `isNewer: false`. */
export async function checkForUpdate(deps: UpdateCheckDeps): Promise<UpdateInfo> {
  const now = (deps.clock?.() ?? new Date()).toISOString();
  const base: UpdateInfo = {
    currentVersion: deps.currentVersion,
    latestVersion: null,
    isNewer: false,
    releaseUrl: RELEASES_PAGE,
    checkedAt: now,
    error: null,
  };
  const fetchImpl = deps.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? 8_000);
  try {
    const res = await fetchImpl(deps.apiUrl ?? LATEST_RELEASE_API, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'CLApp' },
    });
    if (!res.ok) return { ...base, error: `GitHub menjawab ${res.status}` };
    const parsed = parseLatestRelease(await res.json());
    if (!parsed) return { ...base, error: 'Belum ada rilis yang dipublikasikan' };
    return {
      ...base,
      latestVersion: parsed.version,
      releaseUrl: parsed.url,
      isNewer: compareVersions(parsed.version, deps.currentVersion) > 0,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ...base, error: /abort/i.test(msg) ? 'Waktu habis (offline?)' : msg };
  } finally {
    clearTimeout(timer);
  }
}
