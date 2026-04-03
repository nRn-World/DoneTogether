import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'nrn.DoneTogether.com',
  appName: 'DoneTogether',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // Use Android OAuth client ID for native
      serverClientId: '677287957451-bioldnmggdnnhirnpi7v8optqhotup32.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    },
    GeofencePlugin: {}
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK'
    }
  }
};

export default config;