import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, ApiError } from '../src/api';
import { Button, Card, Input } from '../src/components/ui';
import { colors, spacing } from '../src/theme';

export default function Join() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(params.code ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.joinByCode(code.trim());
      router.replace(`/game/${res.gameId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not join');
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
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={styles.title}>Join a home game</Text>
          <Text style={styles.body}>
            Ask the host for their 6-digit game code, then enter it below to join instantly.
          </Text>
        </Card>
        <Input
          label="Game code"
          placeholder="123456"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
          maxLength={6}
          autoFocus
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Join game" onPress={join} loading={loading} disabled={code.trim().length < 4} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  body: { color: colors.textMuted, lineHeight: 20 },
  error: { color: colors.danger, marginBottom: spacing.md, fontWeight: '600' },
});
