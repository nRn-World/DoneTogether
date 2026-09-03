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
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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
    setDownloadError(null);
  };

  const openDownload = async () => {
    if (!update) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await openUpdateDownload(update.downloadUrl);
    } catch (err: any) {
      const code = String(err?.message || err || '');
      if (code.includes('INSTALL_PERMISSION_REQUIRED')) {
        setDownloadError('permission');
      } else {
        console.warn('[useAppUpdate] download/install failed', err);
        setDownloadError('failed');
      }
    } finally {
      setDownloading(false);
    }
  };

  return {
    update,
    checking,
    downloading,
    downloadError,
    currentVersion: APP_VERSION,
    dismiss,
    openDownload
  };
}
