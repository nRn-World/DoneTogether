import { registerPlugin } from '@capacitor/core';

export type ApkUpdaterPlugin = {
  downloadAndInstall(options: { url: string }): Promise<{ ok: boolean; path: string }>;
  canInstallPackages(): Promise<{ allowed: boolean }>;
  openInstallPermissionSettings(): Promise<void>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (data: { progress: number }) => void
  ): Promise<{ remove: () => void }>;
};

export const ApkUpdater = registerPlugin<ApkUpdaterPlugin>('ApkUpdater');
