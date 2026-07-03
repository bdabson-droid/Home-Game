import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors, spacing } from '../constants/theme';

const FEATURES = [
  'Create unlimited home games',
  'Invite players by phone number',
  'Generate unique 6-digit join codes',
  'Manage player lists for each game',
  'Share codes via text or messaging',
];

export default function SubscribeScreen() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const subscriptionActive =
    user?.subscriptionStatus === 'active' &&
    (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date());

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await api.createCheckout();
      if (res.checkoutUrl) {
        await Linking.openURL(res.checkoutUrl);
      } else {
        await refreshUser();
        Alert.alert('Success', res.message || 'Subscription activated!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Subscription failed');
    } finally {
      setLoading(false);
    }
  };

  if (subscriptionActive) {
    return (
      <View style={styles.container}>
        <Text style={styles.activeIcon}>✅</Text>
        <Text style={styles.activeTitle}>You're a Host!</Text>
        <Text style={styles.activeDesc}>
          Your subscription is active until{' '}
          {user?.subscriptionExpiresAt
            ? new Date(user.subscriptionExpiresAt).toLocaleDateString()
            : 'further notice'}
          .
        </Text>
        <Button title="Create a Home Game" onPress={() => router.push('/game/create')} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.suit}>♠ ♥ ♦ ♣</Text>
        <Text style={styles.title}>Host Subscription</Text>
        <Text style={styles.price}>$9.99/month</Text>
      </View>

      <Card style={styles.featuresCard}>
        {FEATURES.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </Card>

      <Text style={styles.note}>
        Players join for free. Only hosts need a subscription to create and manage
        home games.
      </Text>

      <Button
        title="Subscribe Now"
        onPress={handleSubscribe}
        loading={loading}
      />

      <Button
        title="Try Demo (Free)"
        variant="secondary"
        onPress={handleSubscribe}
        loading={loading}
        style={{ marginTop: spacing.sm }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  suit: {
    fontSize: 28,
    color: colors.primary,
    letterSpacing: 6,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  price: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  featuresCard: {
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  check: {
    color: colors.success,
    fontSize: 18,
    fontWeight: '800',
    marginRight: spacing.sm,
    width: 24,
  },
  featureText: {
    color: colors.text,
    fontSize: 15,
    flex: 1,
  },
  note: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  activeIcon: {
    fontSize: 64,
    textAlign: 'center',
    marginTop: spacing.xl * 2,
  },
  activeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  activeDesc: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
});
