import { Capacitor, registerPlugin } from '@capacitor/core';

interface AppReviewPluginInterface {
  requestReview(): Promise<{ shown: boolean }>;
}

const AppReview = registerPlugin<AppReviewPluginInterface>('AppReview');

const STORAGE_KEY = 'dt_last_in_app_review_prompt';
const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000; // at most once every 90 days

/**
 * Politely invokes the native Google Play In-App Review sheet after a happy moment
 * (such as completing a shared plan). Silently no-ops on web or within cooldown.
 */
export async function maybeRequestInAppReview(): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

  try {
    const last = Number(localStorage.getItem(STORAGE_KEY) || '0');
    if (last && Date.now() - last < COOLDOWN_MS) return;
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    await AppReview.requestReview();
  } catch {
    // Non-critical — never interrupt the user if Play Services is unavailable.
  }
}
