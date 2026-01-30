import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.raddell.app',
  appName: 'RA DELL 2.0',
  webDir: '.next',
  server: {
    url: 'https://my-shop-lemon-nine.vercel.app',
    cleartext: true
  },
  plugins: {
    StatusBar: {
      style: 'DEFAULT', 
      overlaysWebView: true 
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#0f172a', 
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerStyle: 'light',
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
      useDialog: false
    },
    App: {
      appendUserAgent: 'RaDell-App/2.0'
    }
  }
};

export default config;
