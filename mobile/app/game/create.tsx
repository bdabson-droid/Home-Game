import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../../src/api/client';
import { Button, Card, Field, Input } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { colors, font, spacing } from '../../src/theme';

export default function CreateGame() {
  const router = useRouter();
  const { hasActiveSubscription } = useAuth();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [buyIn, setBuyIn] = useState('100');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasActiveSubscription) {
    return (
      <View style={styles.paywall}>
        <Ionicons name="lock-closed" size={44} color={colors.gold} />
        <Text style={styles.paywallTitle}>Hosting requires a subscription</Text>
        <Text style={styles.paywallBody}>
          Become a Host Pass member to create home games, invite players by phone, and share join
          codes.
        </Text>
        <Button
          title="View Host Pass"
          onPress={() => router.replace('/subscription')}
          style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}
        />
        <Button title="Not now" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing.md, alignSelf: 'stretch' }} />
      </View>
    );
  }

  async function onCreate() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.createGame({
        name: name.trim(),
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        defaultBuyIn: Number(buyIn) || 0,
      });
      router.replace(`/game/${res.game.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create game');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Card>
          <Field label="Game name">
            <Input value={name} onChangeText={setName} placeholder="Friday Night Hold'em" autoFocus />
          </Field>
          <Field label="Location (optional)">
            <Input value={location} onChangeText={setLocation} placeholder="The Clubhouse" />
          </Field>
          <Field label="Default buy-in ($)">
            <Input value={buyIn} onChangeText={setBuyIn} placeholder="100" keyboardType="number-pad" />
          </Field>
          <Field label="Description (optional)">
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder="1/2 NLHE, cash game, snacks provided"
              multiline
              style={{ height: 90, paddingTop: spacing.md, textAlignVertical: 'top' }}
            />
          </Field>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            title="Create home game"
            onPress={onCreate}
            loading={loading}
            disabled={name.trim().length < 1}
          />
        </Card>
        <Text style={styles.hint}>
          You'll get a numeric invite code to share, and you can invite players directly by phone.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: font.small },
  hint: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.lg, textAlign: 'center', lineHeight: 18 },
  paywall: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  paywallTitle: { color: colors.text, fontSize: font.h2, fontWeight: '800', marginTop: spacing.lg, textAlign: 'center' },
  paywallBody: { color: colors.textMuted, fontSize: font.body, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 },
});
