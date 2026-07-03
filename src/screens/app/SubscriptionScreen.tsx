import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Pill } from '../../components/Pill';
import { colors, radius, spacing } from '../../theme';
import { PLANS } from '../../services/subscription';
import { useAuthStore } from '../../store/useAuthStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import type { AppStackParamList } from '../../navigation/types';
import type { SubscriptionPlan } from '../../types';

type Props = NativeStackScreenProps<AppStackParamList, 'Subscription'>;

export function SubscriptionScreen({ navigation, route }: Props) {
  const user = useAuthStore((s) => s.user);
  const subscription = useSubscriptionStore((s) => (user ? s.getSubscription(user.id) : undefined));
  const isActive = useSubscriptionStore((s) => (user ? s.isHost(user.id) : false));
  const purchase = useSubscriptionStore((s) => s.purchase);
  const cancel = useSubscriptionStore((s) => s.cancel);

  const [pending, setPending] = useState<SubscriptionPlan | null>(null);
  const fromCreateGame = !!route.params?.fromCreateGame;

  const doPurchase = async (plan: SubscriptionPlan) => {
    if (!user) return;
    setPending(plan);
    try {
      await purchase(user.id, plan);
      Alert.alert(
        'You\'re a host!',
        'Your subscription is active. You can now create home games.',
        [
          {
            text: 'Continue',
            onPress: () => {
              if (fromCreateGame) navigation.replace('CreateGame');
              else navigation.goBack();
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert('Purchase failed', (e as Error).message);
    } finally {
      setPending(null);
    }
  };

  const doCancel = () => {
    if (!user) return;
    Alert.alert(
      'Cancel subscription?',
      'You\'ll lose the ability to host new games. Existing games remain accessible to your players.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            await cancel(user.id);
          },
        },
      ],
    );
  };

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Ionicons name="trophy-outline" size={24} color={colors.primary} />
        </View>
        <Text style={styles.title}>Host subscription</Text>
        <Text style={styles.subtitle}>
          Anyone can join a home game for free. Hosting a game — inviting players, tracking sessions,
          settling up — requires an active subscription.
        </Text>
      </View>

      {isActive && subscription ? (
        <Card>
          <View style={styles.rowGap}>
            <Pill label="Active" tone="success" />
            <Text style={styles.planLabel}>
              {subscription.plan === 'annual' ? 'Annual' : 'Monthly'}
            </Text>
          </View>
          <Text style={styles.renewText}>
            {subscription.renewsAt
              ? `Renews on ${new Date(subscription.renewsAt).toLocaleDateString()}`
              : 'Active'}
          </Text>
          <View style={styles.cancelBtn}>
            <Button title="Cancel subscription" variant="secondary" onPress={doCancel} />
          </View>
        </Card>
      ) : (
        PLANS.map((p) => (
          <Pressable key={p.id} onPress={() => doPurchase(p.id)} disabled={!!pending}>
            <Card
              style={[
                styles.planCard,
                p.highlight ? { borderColor: colors.primary } : null,
              ]}
            >
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowGap}>
                    <Text style={styles.planTitle}>{p.title}</Text>
                    {p.highlight ? <Pill label="Best value" tone="success" /> : null}
                  </View>
                  <Text style={styles.planPrice}>
                    {p.priceLabel}
                    <Text style={styles.planCadence}> {p.cadence}</Text>
                  </Text>
                </View>
              </View>
              <View style={styles.perks}>
                {p.perks.map((perk) => (
                  <View key={perk} style={styles.perkRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    <Text style={styles.perkText}>{perk}</Text>
                  </View>
                ))}
              </View>
              <Button
                title={pending === p.id ? 'Processing…' : `Subscribe · ${p.priceLabel}`}
                onPress={() => doPurchase(p.id)}
                loading={pending === p.id}
                disabled={!!pending && pending !== p.id}
              />
            </Card>
          </Pressable>
        ))
      )}

      <Text style={styles.legal}>
        This is a demo build using a mocked purchase flow. Wire up RevenueCat, Stripe, or your IAP
        provider in `src/services/subscription.ts` before shipping.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: {
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 340,
  },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planCard: { padding: spacing.lg, borderRadius: radius.lg },
  planTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  planPrice: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 4 },
  planCadence: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
  perks: { marginVertical: spacing.md, gap: spacing.sm },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  perkText: { color: colors.text, fontSize: 14 },
  planLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  renewText: { color: colors.textMuted, marginTop: 6 },
  cancelBtn: { marginTop: spacing.md },
  legal: {
    color: colors.textSubtle,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
