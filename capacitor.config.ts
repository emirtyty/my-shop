import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.raddell.app',
  appName: 'RaDell',
  webDir: 'public',
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
      backgroundColor: '#FFFFFF', 
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerStyle: 'dark',
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
      useDialog: false
    },
    App: {
      appendUserAgent: 'RaDell-App/1.0'
    }
  }
};

export default config;
