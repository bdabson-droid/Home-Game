import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors, spacing } from '../../constants/theme';

export default function CreateGameScreen() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const subscriptionActive =
    user?.subscriptionStatus === 'active' &&
    (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date());

  if (!user?.isHost || !subscriptionActive) {
    return (
      <View style={styles.container}>
        <Text style={styles.lockedIcon}>🔒</Text>
        <Text style={styles.lockedTitle}>Host Subscription Required</Text>
        <Text style={styles.lockedDesc}>
          You need an active host subscription to create home games.
        </Text>
        <Button
          title="Get Host Subscription"
          onPress={() => router.push('/subscribe')}
        />
      </View>
    );
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Game name is required');
      return;
    }
    setLoading(true);
    try {
      const res = await api.createGame({
        name: name.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
      });
      await refreshUser();
      router.replace(`/game/${res.game.id}`);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>
        Set up a new home game. You'll get a 6-digit code to share with players.
      </Text>

      <Input
        label="Game Name *"
        placeholder="Friday Night Poker"
        value={name}
        onChangeText={setName}
      />
      <Input
        label="Description"
        placeholder="Weekly $1/$2 NL Hold'em"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <Input
        label="Location"
        placeholder="Mike's basement"
        value={location}
        onChangeText={setLocation}
      />

      <Button title="Create Home Game" onPress={handleCreate} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  subtitle: {
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  lockedIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  lockedDesc: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
});
