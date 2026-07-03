import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError } from '../src/api/client';
import { Button, Input } from '../src/components/ui';
import { colors, font, spacing } from '../src/theme';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onContinue() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.requestOtp(phone.trim());
      router.push({
        pathname: '/verify',
        params: { phone: res.phone, devCode: res.devCode ?? '' },
      });
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
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.logo}>♠♥♣♦</Text>
          <Text style={styles.title}>Home Game</Text>
          <Text style={styles.subtitle}>
            Run your poker home game. Invite the crew, track the ledger, keep it private.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Your phone number</Text>
          <Input
            value={phone}
            onChangeText={setPhone}
            placeholder="(555) 123-4567"
            keyboardType="phone-pad"
            autoComplete="tel"
            autoFocus
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            title="Send code"
            onPress={onContinue}
            loading={loading}
            disabled={phone.trim().length < 7}
            style={{ marginTop: spacing.lg }}
          />
          <Text style={styles.legal}>
            We'll text you a 6-digit code to sign in. New here? Signing in creates your account.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    fontSize: 40,
    letterSpacing: 6,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: font.h1,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: font.body,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 22,
  },
  form: { marginTop: spacing.lg },
  label: {
    color: colors.textMuted,
    fontSize: font.small,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    marginTop: spacing.md,
    fontSize: font.small,
  },
  legal: {
    color: colors.textMuted,
    fontSize: font.small,
    marginTop: spacing.lg,
    textAlign: 'center',
    lineHeight: 18,
  },
});
