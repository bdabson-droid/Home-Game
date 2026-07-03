import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { PhoneEntryScreen } from '../screens/auth/PhoneEntryScreen';
import { OtpVerifyScreen } from '../screens/auth/OtpVerifyScreen';
import { JoinWithCodeScreen } from '../screens/auth/JoinWithCodeScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} options={{ title: 'Sign in' }} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} options={{ title: 'Verify' }} />
      <Stack.Screen name="JoinWithCode" component={JoinWithCodeScreen} options={{ title: 'Join a game' }} />
    </Stack.Navigator>
  );
}
