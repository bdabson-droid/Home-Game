import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/auth';
import { colors } from '../src/theme';

export default function Index() {
  const { loading, token } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return <Redirect href={token ? '/(tabs)' : '/login'} />;
}
