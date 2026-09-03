import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  checkForAppUpdate,
  dismissUpdateVersion,
  openUpdateDownload,
  type AppUpdateInfo
} from '../lib/appUpdate';
import { APP_VERSION } from '../config/appVersion';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h

export function useAppUpdate() {
  const [update, setUpdate] = useState<AppUpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform() || platform === 'android' || platform === 'ios';
    if (!isNative) return;

    let cancelled = false;

    const run = async (attempt = 0) => {
      setChecking(true);
      try {
        const info = await checkForAppUpdate(APP_VERSION);
        if (!cancelled) setUpdate(info);
      } catch (err) {
        console.warn('[useAppUpdate] check failed', err);
        // Network race on cold start — retry a couple of times.
        if (!cancelled && attempt < 2) {
          window.setTimeout(() => { void run(attempt + 1); }, 5000 * (attempt + 1));
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    void run(0);
    const id = window.setInterval(() => { void run(0); }, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const dismiss = () => {
    if (update) dismissUpdateVersion(update.latestVersion);
    setUpdate(null);
  };

  const openDownload = () => {
    if (!update) return;
    openUpdateDownload(update.downloadUrl);
  };

  return {
    update,
    checking,
    currentVersion: APP_VERSION,
    dismiss,
    openDownload
  };
}
