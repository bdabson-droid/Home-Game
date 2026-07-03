import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError } from '../src/api';
import { useAuth } from '../src/auth';
import { Button, Input } from '../src/components/ui';
import { colors, spacing } from '../src/theme';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signInWithToken } = useAuth();

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequestOtp() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.requestOtp(phone);
      setPhone(res.phone);
      setDevCode(res.devCode ?? null);
      if (res.devCode) setCode(res.devCode);
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.verifyOtp(phone, code.trim(), name.trim() || undefined);
      await signInWithToken(res.token, res.user, res.subscription);
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
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.logo}>♠ ♥ ♦ ♣</Text>
          <Text style={styles.title}>Poker Home Game</Text>
          <Text style={styles.subtitle}>
            Run your home game, invite the crew, and never miss a game night.
          </Text>
        </View>

        {step === 'phone' ? (
          <View>
            <Input
              label="Phone number"
              placeholder="+1 (555) 123-4567"
              keyboardType="phone-pad"
              autoComplete="tel"
              value={phone}
              onChangeText={setPhone}
              autoFocus
            />
            <Input
              label="Your name (optional)"
              placeholder="e.g. Doyle B."
              value={name}
              onChangeText={setName}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              title="Send code"
              onPress={handleRequestOtp}
              loading={loading}
              disabled={phone.trim().length < 7}
            />
            <Text style={styles.hint}>
              We'll text you a 6-digit verification code. Message and data rates may apply.
            </Text>
          </View>
        ) : (
          <View>
            <Text style={styles.sentTo}>Code sent to {phone}</Text>
            <Input
              label="Verification code"
              placeholder="6-digit code"
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
              autoFocus
              maxLength={6}
            />
            {devCode ? (
              <Text style={styles.devHint}>Dev mode — your code is {devCode}</Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              title="Verify & continue"
              onPress={handleVerify}
              loading={loading}
              disabled={code.trim().length < 4}
            />
            <Button
              title="Use a different number"
              variant="ghost"
              onPress={() => {
                setStep('phone');
                setCode('');
                setDevCode(null);
                setError(null);
              }}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  hero: { alignItems: 'center', marginBottom: spacing.xxl },
  logo: { fontSize: 34, marginBottom: spacing.md, letterSpacing: 6 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
    paddingHorizontal: spacing.md,
  },
  sentTo: { color: colors.textMuted, marginBottom: spacing.md, fontSize: 15 },
  error: { color: colors.danger, marginBottom: spacing.md, fontWeight: '600' },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.lg, textAlign: 'center', lineHeight: 18 },
  devHint: { color: colors.gold, marginBottom: spacing.md, fontSize: 13, fontWeight: '600' },
});
