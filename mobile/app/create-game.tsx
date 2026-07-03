import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../src/api';
import { useAuth } from '../src/auth';
import { Button, Card, Input } from '../src/components/ui';
import { colors, spacing } from '../src/theme';

export default function CreateGame() {
  const router = useRouter();
  const { subscription } = useAuth();
  const [name, setName] = useState('');
  const [stakes, setStakes] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const canHost = subscription?.active;

  async function create() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await api.createGame({
        name: name.trim(),
        stakes: stakes.trim() || undefined,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
      });
      router.replace(`/game/${res.game.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'subscription_required') {
        Alert.alert(
          'Subscription required',
          'You need an active host subscription to create a home game.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Go to Account', onPress: () => router.replace('/(tabs)/account') },
          ],
        );
      } else {
        Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not create game');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        {!canHost ? (
          <Card style={styles.warn}>
            <Text style={styles.warnText}>
              Hosting requires an active subscription. You can fill this out, but you’ll be asked to
              subscribe before the game is created.
            </Text>
          </Card>
        ) : null}
        <Input label="Game name *" placeholder="Friday Night Poker" value={name} onChangeText={setName} autoFocus />
        <Input label="Stakes" placeholder="e.g. 1/2 NL, $20 buy-in" value={stakes} onChangeText={setStakes} />
        <Input label="Location" placeholder="e.g. Mike's basement" value={location} onChangeText={setLocation} />
        <Input
          label="Description"
          placeholder="House rules, notes, etc."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={{ height: 90, paddingTop: spacing.md, textAlignVertical: 'top' }}
        />
        <Button title="Create home game" onPress={create} loading={loading} disabled={!name.trim()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  warn: { marginBottom: spacing.lg, borderColor: colors.gold },
  warnText: { color: colors.gold, lineHeight: 20 },
});
