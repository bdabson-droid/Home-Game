import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { colors, spacing } from '../../constants/theme';

export default function ProfileScreen() {
  const { user, logout, updateNickname } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [saving, setSaving] = useState(false);

  const subscriptionActive =
    user?.subscriptionStatus === 'active' &&
    (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date());

  const handleSaveNickname = async () => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2) {
      Alert.alert('Error', 'Nickname must be at least 2 characters');
      return;
    }
    setSaving(true);
    try {
      await updateNickname(trimmed);
      Alert.alert('Saved', 'Your nickname has been updated');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update nickname');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const displayInitial = (user?.nickname || user?.displayName || '?').charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayInitial}</Text>
        </View>
        <Text style={styles.name}>{user?.displayName}</Text>
        <Text style={styles.phoneHint}>Phone number is private and never shown to other players</Text>
      </Card>

      <Card style={styles.nicknameCard}>
        <Text style={styles.statusLabel}>Table Nickname</Text>
        <Text style={styles.nicknameHint}>
          This is the name other players see in game lists
        </Text>
        <Input
          value={nickname}
          onChangeText={setNickname}
          placeholder="Your nickname"
          maxLength={24}
        />
        <Button
          title="Save Nickname"
          onPress={handleSaveNickname}
          loading={saving}
          variant="secondary"
        />
      </Card>

      <Card style={styles.statusCard}>
        <Text style={styles.statusLabel}>Account Type</Text>
        <Text style={styles.statusValue}>
          {user?.isHost && subscriptionActive ? 'Host (Active)' : 'Player'}
        </Text>
        {user?.isHost && (
          <>
            <Text style={[styles.statusLabel, { marginTop: spacing.md }]}>
              Subscription
            </Text>
            <Text
              style={[
                styles.statusValue,
                { color: subscriptionActive ? colors.success : colors.danger },
              ]}
            >
              {subscriptionActive ? 'Active' : user?.subscriptionStatus || 'None'}
            </Text>
            {user?.subscriptionExpiresAt && subscriptionActive && (
              <Text style={styles.expires}>
                Renews {new Date(user.subscriptionExpiresAt).toLocaleDateString()}
              </Text>
            )}
          </>
        )}
      </Card>

      {user?.isHost && !subscriptionActive && (
        <Button
          title="Activate Host Subscription"
          onPress={() => router.push('/subscribe')}
          style={{ marginBottom: spacing.md }}
        />
      )}

      {!user?.isHost && (
        <Card style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Want to host games?</Text>
          <Text style={styles.upgradeDesc}>
            Upgrade to a host account to create home games, invite players, and
            manage your poker nights.
          </Text>
          <Button
            title="Become a Host"
            variant="secondary"
            onPress={() => router.push('/subscribe')}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      )}

      <Button title="Sign Out" variant="danger" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.background,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  phoneHint: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontSize: 13,
    textAlign: 'center',
  },
  nicknameCard: {
    marginBottom: spacing.md,
  },
  nicknameHint: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  statusCard: {
    marginBottom: spacing.md,
  },
  statusLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  statusValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  expires: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  upgradeCard: {
    marginBottom: spacing.md,
  },
  upgradeTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  upgradeDesc: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
});
