import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, Card, ErrorText, Input, Muted, Screen, Subtitle, Title } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function JoinScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const { game } = await api.joinByCode(token, code.trim());
      setCode('');
      router.push(`/games/${game.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join that game.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Join a game</Title>
      <Muted>Enter the 6-digit code your host shared with you.</Muted>
      <Card>
        <Input
          label="Join code"
          keyboardType="number-pad"
          placeholder="123456"
          value={code}
          onChangeText={setCode}
          maxLength={10}
        />
        <ErrorText>{error}</ErrorText>
        <Button
          label="Join game"
          loading={loading}
          disabled={!/^\d{4,10}$/.test(code.trim())}
          onPress={join}
        />
      </Card>
      <Card>
        <Subtitle>Got a text invite?</Subtitle>
        <Muted>
          If your host invited you by phone number, just sign in with that same number and the
          game will appear automatically in the My Games tab.
        </Muted>
      </Card>
    </Screen>
  );
}
