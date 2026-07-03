import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '../../src/api';
import { useAuth } from '../../src/auth';
import { Badge, Button, Card, Input } from '../../src/components/ui';
import { colors, spacing } from '../../src/theme';

export default function Account() {
  const { user, subscription, signOut, setUser, setSubscription, refresh } = useAuth();
  const [name, setName] = useState(user?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const active = subscription?.active;

  async function saveName() {
    if (!name.trim()) return;
    setSavingName(true);
    try {
      const res = await api.updateName(name.trim());
      setUser(res.user);
      Alert.alert('Saved', 'Your name has been updated.');
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not save');
    } finally {
      setSavingName(false);
    }
  }

  async function subscribe() {
    setSubscribing(true);
    try {
      const res = await api.subscribe();
      if (res.checkoutUrl) {
        // Stripe mode: open the hosted checkout page.
        await Linking.openURL(res.checkoutUrl);
        Alert.alert(
          'Finish checkout',
          'Complete payment in your browser, then return and pull to refresh.',
        );
      } else {
        setSubscription(res.subscription);
        Alert.alert('You’re subscribed!', 'You can now create and host home games.');
      }
      await refresh();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not subscribe');
    } finally {
      setSubscribing(false);
    }
  }

  async function cancel() {
    Alert.alert('Cancel subscription?', 'You will keep access until the end of your billing period.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await api.cancelSubscription();
            setSubscription(res.subscription);
          } catch (err) {
            Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not cancel');
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        <Input label="Display name" value={name} onChangeText={setName} placeholder="Your name" />
        <Button title="Save name" onPress={saveName} loading={savingName} variant="secondary" />
      </Card>

      <Card style={styles.section}>
        <View style={styles.subHeader}>
          <Text style={styles.sectionTitle}>Host subscription</Text>
          {active ? (
            <Badge text="ACTIVE" tone="success" />
          ) : (
            <Badge text={subscription?.status?.toUpperCase() ?? 'INACTIVE'} />
          )}
        </View>
        <Text style={styles.subBody}>
          A host subscription lets you create home games, invite players by phone number, share join
          codes, and schedule game nights.
        </Text>
        <Text style={styles.price}>{subscription?.priceLabel ?? '$9.99 / month'}</Text>

        {active ? (
          <>
            {subscription?.currentPeriodEnd ? (
              <Text style={styles.renew}>
                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </Text>
            ) : null}
            <Button title="Cancel subscription" variant="danger" onPress={cancel} style={{ marginTop: spacing.md }} />
          </>
        ) : (
          <Button
            title="Subscribe to host"
            onPress={subscribe}
            loading={subscribing}
            style={{ marginTop: spacing.md }}
          />
        )}
        {subscription?.billingMode === 'dev' ? (
          <Text style={styles.devNote}>Dev mode — billing is simulated (no real charge).</Text>
        ) : null}
      </Card>

      <Button title="Sign out" variant="ghost" onPress={signOut} style={{ marginTop: spacing.md }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  phone: { color: colors.textMuted, marginBottom: spacing.md, fontSize: 16 },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subBody: { color: colors.textMuted, lineHeight: 20, marginBottom: spacing.md },
  price: { color: colors.gold, fontSize: 22, fontWeight: '800' },
  renew: { color: colors.textMuted, marginTop: spacing.sm },
  devNote: { color: colors.textMuted, fontSize: 12, marginTop: spacing.md, fontStyle: 'italic' },
});
