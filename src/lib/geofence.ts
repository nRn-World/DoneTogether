import { registerPlugin } from '@capacitor/core';

export interface GeofenceData {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface GeofencePluginInterface {
  addGeofences(geofences: GeofenceData[]): Promise<{ success: boolean }>;
  removeGeofences(): Promise<{ success: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
}

const GeofencePlugin = registerPlugin<GeofencePluginInterface>('GeofencePlugin');

export default GeofencePlugin;