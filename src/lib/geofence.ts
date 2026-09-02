import { registerPlugin } from '@capacitor/core';

export type GeofenceTrigger = 'enter' | 'exit';

export interface GeofenceData {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  title?: string;
  message?: string;
  /** enter = remind when arriving; exit = remind when leaving (e.g. home) */
  trigger?: GeofenceTrigger;
}

export interface GeofencePluginInterface {
  addGeofences(options: { geofences: GeofenceData[] }): Promise<{ success: boolean; count?: number }>;
  removeGeofences(): Promise<{ success: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
}

const GeofencePlugin = registerPlugin<GeofencePluginInterface>('GeofencePlugin');

export default GeofencePlugin;
