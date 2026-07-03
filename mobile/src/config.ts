import { Platform } from 'react-native';

// The base URL of the backend API.
//
// Override it by setting EXPO_PUBLIC_API_URL when starting the app, e.g.:
//   EXPO_PUBLIC_API_URL=http://192.168.1.50:4000 npx expo start
//
// When testing on a physical device, use your computer's LAN IP (not localhost),
// because "localhost" on the device points at the device itself.
const fromEnv = process.env.EXPO_PUBLIC_API_URL;

function defaultBaseUrl(): string {
  // Android emulator maps the host machine to 10.0.2.2.
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  return 'http://localhost:4000';
}

export const API_BASE_URL = (fromEnv && fromEnv.trim()) || defaultBaseUrl();
