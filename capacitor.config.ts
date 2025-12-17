import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.weightlosslab.app',
  appName: 'Weight Loss Lab',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    BiometricAuth: {
      // Biometric authentication configuration
      iosBiometryType: 'both', // Support both TouchID and FaceID
      androidBiometryStrength: 'strong' // Use strong biometry (fingerprint/face)
    },
    CapacitorHttp: {
      enabled: true // Use Capacitor's native HTTP for better performance
    }
  }
};

export default config;
