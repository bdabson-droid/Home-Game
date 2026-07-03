import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Card, Muted, Screen, Subtitle, Title } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function AccountScreen() {
  const { user, token, canHost, signOut, refresh } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<string>('');
  const [expires, setExpires] = useState<number | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const s = await api.subscriptionStatus(token);
      setStatus(s.status);
      setExpires(s.expires_at);
      setStripeConfigured(s.stripe_configured);
    } catch {
      // Non-fatal; leave defaults.
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'You will need to verify your phone number again to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <Screen>
      <Title>Account</Title>
      <Card>
        <Subtitle>{user?.name ?? 'Unnamed player'}</Subtitle>
        <Muted>{user?.phone}</Muted>
      </Card>
      <Card>
        <Subtitle>Host subscription</Subtitle>
        {loading ? (
          <Muted>Checking…</Muted>
        ) : (
          <>
            <Muted>
              Status: <Muted>{status || 'inactive'}</Muted>
            </Muted>
            {expires ? (
              <Muted>Renews / expires: {new Date(expires).toLocaleDateString()}</Muted>
            ) : null}
            {!stripeConfigured ? (
              <Muted>
                Stripe is not configured on this server, so any signed-in user can host games
                for testing purposes.
              </Muted>
            ) : canHost ? (
              <Muted>You can create and host home games.</Muted>
            ) : (
              <Muted>Subscribe to start hosting your own home games.</Muted>
            )}
            <View style={{ height: 8 }} />
            <Button
              label={canHost ? 'Manage subscription' : 'Start host subscription'}
              onPress={() => router.push('/subscription')}
            />
            <Button label="Refresh" variant="ghost" onPress={() => { refresh(); load(); }} />
          </>
        )}
      </Card>
      <Card>
        <Subtitle>Sign out</Subtitle>
        <Muted>Signs this device out. Your games are safe.</Muted>
        <Button variant="danger" label="Sign out" onPress={confirmSignOut} />
      </Card>
    </Screen>
  );
}
