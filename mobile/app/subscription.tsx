import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '../src/api/client';
import { Badge, Button, Card, Divider } from '../src/components/ui';
import { useAuth } from '../src/store/auth';
import { colors, font, spacing } from '../src/theme';

const PERKS = [
  'Host unlimited private home games',
  'Invite players by phone number',
  'Share a numeric code to let players self–join',
  'Schedule game nights & track buy-ins / cash-outs',
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const { subscription, refresh } = useAuth();
  const [billingMode, setBillingMode] = useState<'stripe' | 'mock'>('mock');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getSubscription().then((r) => setBillingMode(r.billingMode)).catch(() => undefined);
  }, []);

  const status = subscription?.status ?? 'none';
  const isActive = status === 'active';

  async function subscribe() {
    setLoading(true);
    try {
      const res = await api.startCheckout();
      if (res.billingMode === 'stripe' && res.checkoutUrl) {
        await Linking.openURL(res.checkoutUrl);
        Alert.alert(
          'Complete payment',
          'Finish checkout in your browser, then return to the app and pull to refresh.'
        );
      } else {
        await refresh();
        Alert.alert('You are a host!', 'Your subscription is active. Time to create a game.');
        router.back();
      }
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not start checkout');
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    Alert.alert('Cancel subscription', 'You will lose the ability to host games.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel subscription',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await api.cancelSubscription();
            await refresh();
          } catch (err) {
            Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not cancel');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.plan}>Host Pass</Text>
          <Badge label={isActive ? 'ACTIVE' : status.toUpperCase()} color={isActive ? colors.success : colors.gold} />
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>$9.99</Text>
          <Text style={styles.per}>/ month</Text>
        </View>
        <Text style={styles.tagline}>Everything you need to run the table.</Text>
        <Divider />
        {PERKS.map((perk) => (
          <View key={perk} style={styles.perkRow}>
            <Text style={styles.check}>♠</Text>
            <Text style={styles.perkText}>{perk}</Text>
          </View>
        ))}
      </Card>

      {billingMode === 'mock' ? (
        <Text style={styles.mockNote}>
          Billing is in demo mode — subscribing activates instantly without real payment. Add Stripe
          keys on the server to enable live billing.
        </Text>
      ) : null}

      {isActive ? (
        <>
          <Text style={styles.activeNote}>
            You're all set. Head to My Games to host a new game.
          </Text>
          <Button title="Cancel subscription" variant="danger" onPress={cancel} loading={loading} style={{ marginTop: spacing.lg }} />
        </>
      ) : (
        <Button
          title="Subscribe & become a host"
          onPress={subscribe}
          loading={loading}
          style={{ marginTop: spacing.lg }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plan: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.md },
  price: { color: colors.gold, fontSize: 40, fontWeight: '900' },
  per: { color: colors.textMuted, fontSize: font.body, marginBottom: 8, marginLeft: 4 },
  tagline: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.xs },
  perkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  check: { color: colors.felt, fontSize: font.body, marginRight: spacing.md, marginTop: 1 },
  perkText: { color: colors.text, fontSize: font.body, flex: 1, lineHeight: 20 },
  mockNote: {
    color: colors.gold,
    fontSize: font.small,
    marginTop: spacing.lg,
    lineHeight: 18,
  },
  activeNote: { color: colors.success, fontSize: font.body, marginTop: spacing.lg, textAlign: 'center' },
});
