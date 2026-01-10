import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.app',
  appName: 'Market',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*']
  }
};

export default config;