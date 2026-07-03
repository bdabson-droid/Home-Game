import React from 'react';
import { Text, ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '../../src/theme';

function TabIcon({ symbol, color }: { symbol: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{symbol}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 20 },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Games',
          tabBarIcon: ({ color }) => <TabIcon symbol="♠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="invites"
        options={{
          title: 'Invites',
          tabBarIcon: ({ color }) => <TabIcon symbol="✉" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <TabIcon symbol="♦" color={color} />,
        }}
      />
    </Tabs>
  );
}
