import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, Card, ErrorText, Input, Muted, Screen, Title } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function NewGameScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [stakes, setStakes] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const { game } = await api.createGame(token, {
        name: name.trim(),
        stakes: stakes.trim() || undefined,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
      });
      router.replace(`/games/${game.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'subscription_required') {
        router.replace('/subscription');
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not create game.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <Title>New game</Title>
        <Muted>You&apos;ll be the host. We&apos;ll generate a 6-digit join code you can share.</Muted>
        <Card>
          <Input label="Name" placeholder="Friday Night Poker" value={name} onChangeText={setName} />
          <Input label="Stakes" placeholder="1/2 NL, $50 buy-in" value={stakes} onChangeText={setStakes} />
          <Input label="Location" placeholder="Alice's house" value={location} onChangeText={setLocation} />
          <Input
            label="Notes"
            placeholder="BYOB, dealer's choice, no rebuys after midnight."
            value={description}
            onChangeText={setDescription}
            multiline
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />
          <ErrorText>{error}</ErrorText>
          <Button
            label="Create game"
            loading={loading}
            disabled={name.trim().length < 2}
            onPress={submit}
          />
        </Card>
      </Screen>
    </ScrollView>
  );
}
