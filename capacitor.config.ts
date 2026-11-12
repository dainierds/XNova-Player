import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xnovaplayer.app',
  appName: 'XNova Player',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true, // Permite conexiones HTTP a servidores IPTV locales o remotos
  },
  android: {
    allowMixedContent: true, // Permite streams de video HTTP dentro de la app
    backgroundColor: '#0A0E1A',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0A0E1A',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
