import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '../../src/api/client';
import { Button, Card, Input } from '../../src/components/ui';
import { colors, font, spacing } from '../../src/theme';

export default function Join() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onJoin() {
    setError(null);
    setOk(null);
    setLoading(true);
    try {
      const res = await api.joinGame(code.trim());
      setOk(`Joined "${res.game.name}"!`);
      setCode('');
      router.push(`/game/${res.game.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <View style={styles.container}>
        <Card>
          <Text style={styles.title}>Join a home game</Text>
          <Text style={styles.subtitle}>
            Got a code from the host? Enter it below to join their game.
          </Text>
          <Input
            value={code}
            onChangeText={setCode}
            placeholder="6-digit code"
            keyboardType="number-pad"
            maxLength={10}
            style={styles.codeInput}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {ok ? <Text style={styles.ok}>{ok}</Text> : null}
          <Button
            title="Join game"
            onPress={onJoin}
            loading={loading}
            disabled={code.trim().length < 4}
            style={{ marginTop: spacing.lg }}
          />
        </Card>
        <Text style={styles.hint}>
          Were you invited by text? Sign in with that same phone number and your invited games appear
          automatically.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: spacing.lg },
  title: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.sm, lineHeight: 20 },
  codeInput: {
    marginTop: spacing.lg,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    height: 64,
  },
  error: { color: colors.danger, marginTop: spacing.md, fontSize: font.small },
  ok: { color: colors.success, marginTop: spacing.md, fontSize: font.small },
  hint: {
    color: colors.textMuted,
    fontSize: font.small,
    marginTop: spacing.xl,
    textAlign: 'center',
    lineHeight: 18,
  },
});
