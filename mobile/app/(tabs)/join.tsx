import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { colors, spacing } from '../../constants/theme';

export default function JoinScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleJoin = async () => {
    setError('');
    setSuccess('');
    const trimmed = code.replace(/\D/g, '');
    if (trimmed.length !== 6) {
      setError('Enter a 6-digit join code');
      return;
    }
    setLoading(true);
    try {
      const res = await api.joinGame(trimmed);
      const msg =
        res.status === 'waiting'
          ? `Added to waitlist for "${res.game.name}" (position #${res.waitingPosition})`
          : `Joined "${res.game.name}"!`;
      setSuccess(msg);
      setCode('');
      setTimeout(() => router.push(`/game/${res.game.id}`), 1000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.icon}>🔢</Text>
        <Text style={styles.title}>Join a Home Game</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code shared by your game host
        </Text>

        <Input
          label="Join Code"
          placeholder="123456"
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.codeInput}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <Button title="Join Game" onPress={handleJoin} loading={loading} />
      </Card>

      <Text style={styles.hint}>
        Don't have a code? Ask your host to invite you by phone number from the
        game details screen.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  codeInput: {
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
    width: '100%',
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
  success: {
    color: colors.success,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  hint: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: 14,
    lineHeight: 20,
  },
});
