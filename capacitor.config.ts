import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'nrn.DoneTogether.com',
  appName: 'DoneTogether',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: process.env.VITE_GOOGLE_SERVER_CLIENT_ID || '677287957451-6vja60qu97qvobgr61li4b3dlrj1pslq.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
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