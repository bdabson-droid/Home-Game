import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '../src/api/client';
import { Button, Input } from '../src/components/ui';
import { useAuth } from '../src/store/auth';
import { colors, font, spacing } from '../src/theme';

export default function Verify() {
  const router = useRouter();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ phone: string; devCode?: string }>();
  const phone = params.phone ?? '';
  const [code, setCode] = useState(params.devCode ?? '');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onVerify() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.verifyOtp(phone, code.trim(), name.trim() || undefined);
      await signIn(res.token, res.user);
      router.replace('/(tabs)');
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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Enter your code</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code to {phone}.</Text>

        {params.devCode ? (
          <Text style={styles.devHint}>Dev mode: code auto-filled ({params.devCode})</Text>
        ) : null}

        <Text style={styles.label}>Verification code</Text>
        <Input
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Your name (optional)</Text>
        <Input value={name} onChangeText={setName} placeholder="e.g. Alex" autoCapitalize="words" />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title="Verify & continue"
          onPress={onVerify}
          loading={loading}
          disabled={code.trim().length < 4}
          style={{ marginTop: spacing.xl }}
        />
        <Button
          title="Back"
          variant="ghost"
          onPress={() => router.back()}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  title: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.sm },
  devHint: {
    color: colors.gold,
    fontSize: font.small,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: font.small,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    fontWeight: '600',
  },
  error: { color: colors.danger, marginTop: spacing.md, fontSize: font.small },
});
