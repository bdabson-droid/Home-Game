import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList, AppTabsParamList } from './types';
import { GamesListScreen } from '../screens/app/GamesListScreen';
import { CreateGameScreen } from '../screens/app/CreateGameScreen';
import { EditGameScreen } from '../screens/app/EditGameScreen';
import { GameDetailScreen } from '../screens/app/GameDetailScreen';
import { InvitePlayersScreen } from '../screens/app/InvitePlayersScreen';
import { NewSessionScreen } from '../screens/app/NewSessionScreen';
import { SessionDetailScreen } from '../screens/app/SessionDetailScreen';
import { SubscriptionScreen } from '../screens/app/SubscriptionScreen';
import { ProfileScreen } from '../screens/app/ProfileScreen';
import { JoinTabScreen } from '../screens/app/JoinTabScreen';
import { colors } from '../theme';

const Tabs = createBottomTabNavigator<AppTabsParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function TabsNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const map: Record<keyof AppTabsParamList, keyof typeof Ionicons.glyphMap> = {
            Games: 'grid-outline',
            Join: 'enter-outline',
            Profile: 'person-circle-outline',
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Games" component={GamesListScreen} options={{ title: 'My games' }} />
      <Tabs.Screen name="Join" component={JoinTabScreen} options={{ title: 'Join' }} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tabs.Navigator>
  );
}

export function AppNavigator() {
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
      <Stack.Screen name="Tabs" component={TabsNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="CreateGame" component={CreateGameScreen} options={{ title: 'New home game' }} />
      <Stack.Screen name="EditGame" component={EditGameScreen} options={{ title: 'Edit game' }} />
      <Stack.Screen name="GameDetail" component={GameDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="InvitePlayers" component={InvitePlayersScreen} options={{ title: 'Invite players' }} />
      <Stack.Screen name="NewSession" component={NewSessionScreen} options={{ title: 'New session' }} />
      <Stack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: 'Session' }} />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ title: 'Host subscription', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
