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
    // Sideload APK updates matter on native; skip noisy checks on plain web/PWA.
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    const run = async () => {
      setChecking(true);
      try {
        const info = await checkForAppUpdate(APP_VERSION);
        if (!cancelled) setUpdate(info);
      } catch (err) {
        console.warn('[useAppUpdate] check failed', err);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    run();
    const id = window.setInterval(run, CHECK_INTERVAL_MS);
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
