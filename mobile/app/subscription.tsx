import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, ErrorText, Muted, Screen, Subtitle, Title } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { spacing } from '../lib/theme';

export default function SubscriptionScreen() {
  const { token, refresh } = useAuth();
  const [status, setStatus] = useState<string>('');
  const [expires, setExpires] = useState<number | null>(null);
  const [active, setActive] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const s = await api.subscriptionStatus(token);
      setStatus(s.status);
      setExpires(s.expires_at);
      setActive(s.active);
      setStripeConfigured(s.stripe_configured);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load subscription.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const startCheckout = async () => {
    if (!token) return;
    setError(null);
    setStarting(true);
    try {
      const { url } = await api.createCheckout(token);
      await WebBrowser.openBrowserAsync(url);
      // When the user returns we refresh both /me and the subscription status.
      await refresh();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen>
      <Title>Host subscription</Title>
      <Muted>
        Hosting a home game requires an active subscription. Players who join a game by invite or
        code are always free.
      </Muted>

      <Card style={{ gap: spacing.sm }}>
        <Subtitle>What you get</Subtitle>
        <Muted>• Create unlimited home games</Muted>
        <Muted>• Invite players by phone number</Muted>
        <Muted>• A unique 6-digit join code per game</Muted>
        <Muted>• Manage roster: add or remove players</Muted>
      </Card>

      <Card>
        <Subtitle>Current status</Subtitle>
        {loading ? (
          <Muted>Loading…</Muted>
        ) : (
          <>
            <Muted>Status: {status || 'inactive'}</Muted>
            {expires ? <Muted>Renews / expires: {new Date(expires).toLocaleDateString()}</Muted> : null}
            {!stripeConfigured ? (
              <Muted>
                Stripe is not configured on this server. In this build every signed-in user can
                host games for testing.
              </Muted>
            ) : active ? (
              <Muted>You&apos;re subscribed — thanks for hosting.</Muted>
            ) : (
              <Muted>Start a subscription to unlock hosting.</Muted>
            )}
          </>
        )}
        <ErrorText>{error}</ErrorText>
        {stripeConfigured ? (
          <Button
            label={active ? 'Manage in Stripe' : 'Start subscription'}
            loading={starting}
            onPress={startCheckout}
          />
        ) : (
          <Button label="Refresh" variant="ghost" onPress={load} />
        )}
      </Card>
    </Screen>
  );
}
