import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { colors, spacing } from '../../constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const subscriptionActive =
    user?.subscriptionStatus === 'active' &&
    (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date());

  return (
    <View style={styles.container}>
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.phone}>{formatPhone(user?.phone || '')}</Text>
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

function formatPhone(phone: string) {
  if (phone.length === 10) {
    return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
  }
  return phone;
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
  phone: {
    color: colors.textMuted,
    marginTop: spacing.xs,
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
