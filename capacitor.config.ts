import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pulso.app',
  appName: 'Pulso',
  webDir: 'public',
  server: {
    url: 'https://pulso-tdch.vercel.app',
    cleartext: true
  }
};

export default config;
