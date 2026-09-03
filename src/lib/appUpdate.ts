import {
  APP_VERSION,
  GITHUB_RELEASES_LATEST_URL,
  GITHUB_RELEASES_PAGE_URL
} from '../config/appVersion';

export type AppUpdateInfo = {
  latestVersion: string;
  currentVersion: string;
  releaseNotes: string;
  downloadUrl: string;
  releasePageUrl: string;
};

type GithubReleaseAsset = {
  name: string;
  browser_download_url: string;
  content_type?: string;
};

type GithubRelease = {
  tag_name: string;
  name?: string;
  body?: string;
  html_url: string;
  assets?: GithubReleaseAsset[];
};

const DISMISS_KEY = 'donetogether_dismissed_update';

export function normalizeVersion(raw: string): string {
  return raw.trim().replace(/^v/i, '');
}

/** Returns true if remote is newer than local (semver-ish major.minor.patch). */
export function isNewerVersion(remote: string, local: string): boolean {
  const a = normalizeVersion(remote).split('.').map((n) => parseInt(n, 10) || 0);
  const b = normalizeVersion(local).split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return false;
}

export function getDismissedUpdateVersion(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

export function dismissUpdateVersion(version: string): void {
  try {
    localStorage.setItem(DISMISS_KEY, normalizeVersion(version));
  } catch {
    // ignore
  }
}

function pickApkUrl(assets: GithubReleaseAsset[] | undefined): string | null {
  if (!assets?.length) return null;
  const apk = assets.find((a) =>
    a.name.toLowerCase().endsWith('.apk')
    || (a.content_type || '').includes('android.package')
  );
  return apk?.browser_download_url ?? null;
}

export async function checkForAppUpdate(
  currentVersion: string = APP_VERSION
): Promise<AppUpdateInfo | null> {
  const res = await fetch(GITHUB_RELEASES_LATEST_URL, {
    headers: {
      Accept: 'application/vnd.github+json'
    }
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub releases HTTP ${res.status}`);

  const release = (await res.json()) as GithubRelease;
  const latestVersion = normalizeVersion(release.tag_name || '');
  if (!latestVersion) return null;
  if (!isNewerVersion(latestVersion, currentVersion)) return null;

  const dismissed = getDismissedUpdateVersion();
  if (dismissed && normalizeVersion(dismissed) === latestVersion) return null;

  const downloadUrl = pickApkUrl(release.assets) || release.html_url || GITHUB_RELEASES_PAGE_URL;

  return {
    latestVersion,
    currentVersion: normalizeVersion(currentVersion),
    releaseNotes: (release.body || '').trim(),
    downloadUrl,
    releasePageUrl: release.html_url || GITHUB_RELEASES_PAGE_URL
  };
}

export function openUpdateDownload(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
