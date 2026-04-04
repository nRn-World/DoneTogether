import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'nrn.DoneTogether.com',
  appName: 'DoneTogether',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '677287957451-6vja60qu97qvobgr61li4b3dlrj1pslq.apps.googleusercontent.com',
      clientId: '677287957451-6vja60qu97qvobgr61li4b3dlrj1pslq.apps.googleusercontent.com',
      androidClientId: '677287957451-k6loi2bddfol9cpei4ctd5ka8up7cck9.apps.googleusercontent.com',
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