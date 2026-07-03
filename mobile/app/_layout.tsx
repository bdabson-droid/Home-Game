import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { colors } from '../lib/theme';

function AuthGate() {
  const { ready, token, user } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const first = segments[0];
    const second = segments[1];
    const inAuthGroup = first === '(auth)';

    if (!token) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }
    if (!user?.name) {
      if (second !== 'onboarding') router.replace('/(auth)/onboarding');
      return;
    }
    if (inAuthGroup) router.replace('/(tabs)/games');
  }, [ready, token, user?.name, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AuthGate />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTitleStyle: { color: colors.text },
            headerTintColor: colors.primary,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/onboarding" options={{ title: 'Your Name' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="games/new" options={{ title: 'New Game', presentation: 'modal' }} />
          <Stack.Screen name="games/[id]" options={{ title: 'Game' }} />
          <Stack.Screen name="subscription" options={{ title: 'Host Subscription' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
