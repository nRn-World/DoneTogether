import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'nrn.DoneTogether.com',
  appName: 'DoneTogether',
  webDir: 'dist',
  // Capacitor WebView defaults to https://localhost — Firebase Browser API keys
  // block that referer. Use the live domain already allowed on the key.
  server: {
    androidScheme: 'https',
    hostname: 'nrnworld.one'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '677287957451-6vja60qu97qvobgr61li4b3dlrj1pslq.apps.googleusercontent.com',
      forceCodeForRefreshToken: false
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