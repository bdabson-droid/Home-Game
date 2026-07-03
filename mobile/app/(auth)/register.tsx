import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors, spacing } from '../../constants/theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async () => {
    setError('');
    const normalized = phone.replace(/\D/g, '');
    if (normalized.length < 10) {
      setError('Enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      const res = await api.sendOtp(normalized);
      setOtpSent(true);
      if (res.devCode) setDevCode(res.devCode);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!phone || !nickname || !password || !otp) {
      setError('All fields are required');
      return;
    }
    setLoading(true);
    try {
      await register({
        phone: phone.replace(/\D/g, ''),
        nickname: nickname.trim(),
        password,
        otp,
        isHost,
      });
      if (isHost) {
        router.replace('/subscribe');
      } else {
        router.replace('/(tabs)/games');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up with your phone number</Text>

        <Input
          label="Phone Number"
          placeholder="5551234567"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Input
          label="Nickname"
          placeholder="Name shown at the table"
          value={nickname}
          onChangeText={setNickname}
          maxLength={24}
        />
        <Input
          label="Password"
          placeholder="At least 6 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {!otpSent ? (
          <Button title="Send Verification Code" onPress={sendOtp} loading={loading} />
        ) : (
          <>
            {devCode ? (
              <Text style={styles.devCode}>Demo code: {devCode}</Text>
            ) : null}
            <Input
              label="Verification Code"
              placeholder="6-digit code"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.hostToggle, isHost && styles.hostToggleActive]}
              onPress={() => setIsHost(!isHost)}
            >
              <Text style={styles.hostToggleTitle}>I want to host home games</Text>
              <Text style={styles.hostToggleDesc}>
                Hosts need a subscription to create games and invite players
              </Text>
            </TouchableOpacity>
            <Button title="Create Account" onPress={handleRegister} loading={loading} />
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  devCode: {
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  hostToggle: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  hostToggleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  hostToggleTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  hostToggleDesc: {
    color: colors.textMuted,
    fontSize: 13,
  },
  error: {
    color: colors.danger,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.textMuted,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
  },
});
