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
    backgroundColor: '#080A0E',
  },
};

export default config;
