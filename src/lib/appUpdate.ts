import { Capacitor, CapacitorHttp } from '@capacitor/core';
import {
  APP_VERSION,
  GITHUB_RELEASES_LATEST_URL,
  GITHUB_RELEASES_PAGE_URL,
  VERSION_JSON_URLS
} from '../config/appVersion';

export type AppUpdateInfo = {
  latestVersion: string;
  currentVersion: string;
  releaseNotes: string;
  downloadUrl: string;
  releasePageUrl: string;
};

type VersionJson = {
  version?: string;
  apkUrl?: string;
  notes?: string;
};

type GithubReleaseAsset = {
  name: string;
  browser_download_url: string;
  content_type?: string;
};

type GithubRelease = {
  tag_name: string;
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

async function httpGetJson<T>(url: string): Promise<T> {
  // Native HTTP bypasses WebView CORS (main reason the first checker failed).
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.get({
      url,
      headers: { Accept: 'application/json' },
      connectTimeout: 15000,
      readTimeout: 15000
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    if (typeof res.data === 'string') {
      return JSON.parse(res.data) as T;
    }
    return res.data as T;
  }

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function pickApkUrl(assets: GithubReleaseAsset[] | undefined): string | null {
  if (!assets?.length) return null;
  const apk = assets.find((a) =>
    a.name.toLowerCase().endsWith('.apk')
    || (a.content_type || '').includes('android.package')
  );
  return apk?.browser_download_url ?? null;
}

function toUpdateInfo(
  latestVersion: string,
  currentVersion: string,
  releaseNotes: string,
  downloadUrl: string,
  releasePageUrl: string
): AppUpdateInfo | null {
  if (!isNewerVersion(latestVersion, currentVersion)) return null;

  const dismissed = getDismissedUpdateVersion();
  if (dismissed && normalizeVersion(dismissed) === normalizeVersion(latestVersion)) {
    return null;
  }

  return {
    latestVersion: normalizeVersion(latestVersion),
    currentVersion: normalizeVersion(currentVersion),
    releaseNotes,
    downloadUrl,
    releasePageUrl
  };
}

async function checkVersionJson(currentVersion: string): Promise<AppUpdateInfo | null> {
  for (const url of VERSION_JSON_URLS) {
    try {
      const bust = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
      const data = await httpGetJson<VersionJson>(bust);
      const latestVersion = normalizeVersion(data.version || '');
      if (!latestVersion) continue;
      const downloadUrl =
        data.apkUrl
        || `https://github.com/nRn-World/DoneTogether/releases/download/v${latestVersion}/DoneTogether-${latestVersion}.apk`;
      const info = toUpdateInfo(
        latestVersion,
        currentVersion,
        (data.notes || '').trim(),
        downloadUrl,
        GITHUB_RELEASES_PAGE_URL
      );
      if (info) return info;
    } catch (err) {
      console.warn('[appUpdate] version.json failed', url, err);
    }
  }
  return null;
}

async function checkGithubRelease(currentVersion: string): Promise<AppUpdateInfo | null> {
  const release = await httpGetJson<GithubRelease>(GITHUB_RELEASES_LATEST_URL);
  const latestVersion = normalizeVersion(release.tag_name || '');
  if (!latestVersion) return null;

  const downloadUrl =
    pickApkUrl(release.assets)
    || `https://github.com/nRn-World/DoneTogether/releases/download/v${latestVersion}/DoneTogether-${latestVersion}.apk`;

  return toUpdateInfo(
    latestVersion,
    currentVersion,
    (release.body || '').trim(),
    downloadUrl,
    release.html_url || GITHUB_RELEASES_PAGE_URL
  );
}

export async function checkForAppUpdate(
  currentVersion: string = APP_VERSION
): Promise<AppUpdateInfo | null> {
  // Prefer static JSON (Pages), then GitHub Releases API.
  const fromJson = await checkVersionJson(currentVersion);
  if (fromJson) return fromJson;

  try {
    return await checkGithubRelease(currentVersion);
  } catch (err) {
    console.warn('[appUpdate] GitHub releases failed', err);
    return null;
  }
}

export function openUpdateDownload(url: string): void {
  // Prefer system browser so Android can download the APK.
  window.open(url, '_blank', 'noopener,noreferrer');
}
