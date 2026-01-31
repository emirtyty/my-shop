import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ra.dell.marketplace',
  appName: 'RA DELL Marketplace',
  webDir: 'out', // Используем статическую папку вместо .next
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#FF6B35",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FF6B35'
    },
    Haptics: {
      enabled: true
    }
  }
};

export default config;
