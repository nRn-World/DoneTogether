/**
 * App version must match android/app/build.gradle versionName.
 * Bump both when shipping a new APK, then publish a GitHub Release
 * tagged vX.Y.Z with the APK attached. Also update public/version.json.
 */
export const APP_VERSION = '1.1.9';

export const GITHUB_OWNER = 'nRn-World';
export const GITHUB_REPO = 'DoneTogether';

export const GITHUB_RELEASES_LATEST_URL =
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

export const GITHUB_RELEASES_PAGE_URL =
  `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

/** Static JSON on GitHub Pages / custom domain — same-origin friendly. */
export const VERSION_JSON_URLS = [
  'https://nrnworld.one/DoneTogether/version.json',
  'https://nrn-world.github.io/DoneTogether/version.json'
] as const;
